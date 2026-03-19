/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import path from 'path';
import type { ModuleDiscoveryInfo } from './types';

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo/root',
}));

jest.mock('fs');

const mockFindPackageForPath = jest.fn();
jest.mock('@kbn/repo-packages', () => ({
  findPackageForPath: (...args: unknown[]) => mockFindPackageForPath(...args),
}));

import { filterModulesByAffectedModules, readAffectedModules } from './affected_modules';

/** Path -> @kbn/ module ID mapping used by the findPackageForPath mock */
const CONFIG_PATH_TO_MODULE_ID: Record<string, string> = {
  'x-pack/solutions/security/plugins/security_solution/test/scout/ui/playwright.config.ts':
    '@kbn/security-solution-plugin',
  'src/platform/plugins/shared/discover/test/scout/ui/playwright.config.ts': '@kbn/discover-plugin',
  'src/platform/packages/shared/kbn-scout/test/scout/api/playwright.config.ts': '@kbn/scout',
};

const createModule = (
  name: string,
  type: 'plugin' | 'package',
  configPath: string
): ModuleDiscoveryInfo => ({
  name,
  group: 'test-group',
  type,
  configs: [
    {
      path: configPath,
      hasTests: true,
      tags: ['@local-stateful-classic'],
      serverRunFlags: ['--arch stateful --domain classic'],
      usesParallelWorkers: false,
    },
  ],
});

const setupFindPackageMock = () => {
  mockFindPackageForPath.mockImplementation((repoRoot: string, filePath: string) => {
    const rel = path.relative(repoRoot, filePath).replace(/\\/g, '/');
    const id = CONFIG_PATH_TO_MODULE_ID[rel];
    return id ? { id } : undefined;
  });
};

describe('affected_modules', () => {
  let mockLog: ToolingLog;

  beforeEach(() => {
    mockLog = new ToolingLog({ level: 'verbose', writeTo: process.stdout });
    jest.spyOn(mockLog, 'info').mockImplementation(jest.fn());
    jest.spyOn(mockLog, 'warning').mockImplementation(jest.fn());
    setupFindPackageMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('readAffectedModules', () => {
    it('should read and parse a valid JSON array file', () => {
      const modules = ['@kbn/scout', '@kbn/discover-plugin'];
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(modules));

      const result = readAffectedModules('/some/path.json', mockLog);

      expect(result).toEqual(new Set(modules));
    });

    it('should return null for non-array JSON', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ not: 'an array' }));

      const result = readAffectedModules('/some/path.json', mockLog);

      expect(result).toBeNull();
      expect(mockLog.warning).toHaveBeenCalledWith(
        expect.stringContaining('does not contain a JSON array')
      );
    });

    it('should return null when file does not exist', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const result = readAffectedModules('/missing/file.json', mockLog);

      expect(result).toBeNull();
      expect(mockLog.warning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read affected modules file')
      );
    });

    it('should return null for invalid JSON', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('not valid json');

      const result = readAffectedModules('/some/path.json', mockLog);

      expect(result).toBeNull();
    });
  });

  describe('filterModulesByAffectedModules', () => {
    const modules: ModuleDiscoveryInfo[] = [
      createModule(
        'security_solution',
        'plugin',
        'x-pack/solutions/security/plugins/security_solution/test/scout/ui/playwright.config.ts'
      ),
      createModule(
        'discover',
        'plugin',
        'src/platform/plugins/shared/discover/test/scout/ui/playwright.config.ts'
      ),
      createModule(
        'kbn-scout',
        'package',
        'src/platform/packages/shared/kbn-scout/test/scout/api/playwright.config.ts'
      ),
    ];

    it('should keep modules whose ID is in the affected set', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(['@kbn/security-solution-plugin', '@kbn/scout'])
      );

      const result = filterModulesByAffectedModules(modules, '/affected.json', mockLog);

      expect(result).toHaveLength(2);
      expect(result.map((m) => m.name)).toEqual(['security_solution', 'kbn-scout']);
    });

    it('should drop modules whose ID is NOT in the affected set', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(['@kbn/scout']));

      const result = filterModulesByAffectedModules(modules, '/affected.json', mockLog);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('kbn-scout');
    });

    it('should drop modules that do not map to any @kbn/ ID and warn', () => {
      const modulesWithUnmapped: ModuleDiscoveryInfo[] = [
        ...modules,
        createModule(
          'unknown_module',
          'plugin',
          'some/unknown/path/test/scout/ui/playwright.config.ts'
        ),
      ];

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(['@kbn/scout']));

      const result = filterModulesByAffectedModules(modulesWithUnmapped, '/affected.json', mockLog);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('kbn-scout');
      expect(mockLog.warning).toHaveBeenCalledWith(
        expect.stringContaining("dropping module 'unknown_module'")
      );
      expect(mockLog.warning).toHaveBeenCalledWith(
        expect.stringContaining('could not resolve @kbn/ ID')
      );
    });

    it('should throw when the affected modules file cannot be read', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT');
      });

      expect(() => filterModulesByAffectedModules(modules, '/missing.json', mockLog)).toThrow(
        'Selective testing: could not load affected modules file'
      );
    });

    it('should return empty array when affected modules set is empty', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([]));

      const result = filterModulesByAffectedModules(modules, '/affected.json', mockLog);

      expect(result).toHaveLength(0);
      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('no affected modules found')
      );
    });

    it('should log the number of kept and dropped modules', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(['@kbn/security-solution-plugin'])
      );

      filterModulesByAffectedModules(modules, '/affected.json', mockLog);

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('keeping 1 module(s), dropping 2 unaffected module(s)')
      );
    });
  });
});
