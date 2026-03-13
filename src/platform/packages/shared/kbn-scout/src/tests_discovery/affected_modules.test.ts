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
import type { ModuleDiscoveryInfo } from './types';

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo/root',
}));

jest.mock('fs');

import {
  buildModuleIdLookup,
  filterModulesByAffectedModules,
  readAffectedModules,
} from './affected_modules';

const MOCK_PACKAGE_JSON = {
  dependencies: {
    '@kbn/scout': 'link:src/platform/packages/shared/kbn-scout',
    '@kbn/security-solution-plugin': 'link:x-pack/solutions/security/plugins/security_solution',
    '@kbn/discover-plugin': 'link:src/platform/plugins/shared/discover',
    'some-external-dep': '^1.0.0',
  },
  devDependencies: {
    '@kbn/utility-types': 'link:src/platform/packages/shared/kbn-utility-types',
    jest: '^29.0.0',
  },
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

describe('affected_modules', () => {
  let mockLog: ToolingLog;

  beforeEach(() => {
    mockLog = new ToolingLog({ level: 'verbose', writeTo: process.stdout });
    jest.spyOn(mockLog, 'info').mockImplementation(jest.fn());
    jest.spyOn(mockLog, 'warning').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildModuleIdLookup', () => {
    it('should build a map of directory -> @kbn/ module ID', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(MOCK_PACKAGE_JSON));

      const map = buildModuleIdLookup();

      expect(map.get('src/platform/packages/shared/kbn-scout')).toBe('@kbn/scout');
      expect(map.get('x-pack/solutions/security/plugins/security_solution')).toBe(
        '@kbn/security-solution-plugin'
      );
      expect(map.get('src/platform/plugins/shared/discover')).toBe('@kbn/discover-plugin');
      expect(map.get('src/platform/packages/shared/kbn-utility-types')).toBe('@kbn/utility-types');
    });

    it('should exclude non-@kbn/ dependencies', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(MOCK_PACKAGE_JSON));

      const map = buildModuleIdLookup();

      expect(map.size).toBe(4);
      for (const [, name] of map) {
        expect(name).toMatch(/^@kbn\//);
      }
    });
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

    beforeEach(() => {
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(MOCK_PACKAGE_JSON);
        }
        return '[]';
      });
    });

    it('should keep modules whose ID is in the affected set', () => {
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(MOCK_PACKAGE_JSON);
        }
        return JSON.stringify(['@kbn/security-solution-plugin', '@kbn/scout']);
      });

      const result = filterModulesByAffectedModules(modules, '/affected.json', mockLog);

      expect(result).toHaveLength(2);
      expect(result.map((m) => m.name)).toEqual(['security_solution', 'kbn-scout']);
    });

    it('should drop modules whose ID is NOT in the affected set', () => {
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(MOCK_PACKAGE_JSON);
        }
        return JSON.stringify(['@kbn/scout']);
      });

      const result = filterModulesByAffectedModules(modules, '/affected.json', mockLog);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('kbn-scout');
    });

    it('should keep modules that do not map to any @kbn/ ID', () => {
      const modulesWithUnmapped: ModuleDiscoveryInfo[] = [
        ...modules,
        createModule(
          'unknown_module',
          'plugin',
          'some/unknown/path/test/scout/ui/playwright.config.ts'
        ),
      ];

      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(MOCK_PACKAGE_JSON);
        }
        return JSON.stringify(['@kbn/scout']);
      });

      const result = filterModulesByAffectedModules(modulesWithUnmapped, '/affected.json', mockLog);

      expect(result).toHaveLength(2);
      expect(result.map((m) => m.name)).toEqual(['kbn-scout', 'unknown_module']);
    });

    it('should return all modules when the file cannot be read', () => {
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(MOCK_PACKAGE_JSON);
        }
        throw new Error('ENOENT');
      });

      const result = filterModulesByAffectedModules(modules, '/missing.json', mockLog);

      expect(result).toHaveLength(3);
      expect(mockLog.warning).toHaveBeenCalledWith(expect.stringContaining('skipping filtering'));
    });

    it('should return empty array when affected modules set is empty', () => {
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(MOCK_PACKAGE_JSON);
        }
        return JSON.stringify([]);
      });

      const result = filterModulesByAffectedModules(modules, '/affected.json', mockLog);

      expect(result).toHaveLength(0);
      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('no affected modules found')
      );
    });

    it('should log the number of kept and dropped modules', () => {
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(MOCK_PACKAGE_JSON);
        }
        return JSON.stringify(['@kbn/security-solution-plugin']);
      });

      filterModulesByAffectedModules(modules, '/affected.json', mockLog);

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('keeping 1 module(s), dropping 2 unaffected module(s)')
      );
    });
  });
});
