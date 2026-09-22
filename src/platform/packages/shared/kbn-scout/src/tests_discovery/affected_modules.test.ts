/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import path from 'path';
import type { ModuleDiscoveryInfo } from './types';

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo/root',
}));

const mockFindPackageForPath = jest.fn();
jest.mock('@kbn/repo-packages', () => ({
  findPackageForPath: (...args: unknown[]) => mockFindPackageForPath(...args),
}));

import {
  filterModulesByAffectedConfigs,
  markModulesAffectedStatusFromSet,
} from './affected_modules';

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
  configPath: string,
  extraConfigs: string[] = []
): ModuleDiscoveryInfo => ({
  name,
  group: 'test-group',
  type,
  configs: [configPath, ...extraConfigs].map((p) => ({
    path: p,
    hasTests: true,
    tags: ['@local-stateful-classic'],
    serverRunFlags: ['--arch stateful --domain classic'],
    usesParallelWorkers: false,
  })),
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

  describe('markModulesAffectedStatusFromSet', () => {
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

    it('marks affected modules with isAffected: true', () => {
      const result = markModulesAffectedStatusFromSet(
        modules,
        new Set(['@kbn/security-solution-plugin', '@kbn/scout']),
        mockLog
      );

      expect(result).toHaveLength(3);
      expect(result.find((m) => m.name === 'security_solution')?.isAffected).toBe(true);
      expect(result.find((m) => m.name === 'discover')?.isAffected).toBe(false);
      expect(result.find((m) => m.name === 'kbn-scout')?.isAffected).toBe(true);
    });

    it('marks unmapped modules with isAffected: false and warns', () => {
      const modulesWithUnmapped: ModuleDiscoveryInfo[] = [
        ...modules,
        createModule(
          'unknown_module',
          'plugin',
          'some/unknown/path/test/scout/ui/playwright.config.ts'
        ),
      ];

      const result = markModulesAffectedStatusFromSet(
        modulesWithUnmapped,
        new Set(['@kbn/scout']),
        mockLog
      );

      expect(result).toHaveLength(4);
      expect(result.find((m) => m.name === 'unknown_module')?.isAffected).toBe(false);
      expect(mockLog.warning).toHaveBeenCalledWith(
        expect.stringContaining("module 'unknown_module'")
      );
      expect(mockLog.warning).toHaveBeenCalledWith(
        expect.stringContaining('could not resolve @kbn/ ID')
      );
    });

    it('marks all as isAffected: false when affected set is empty', () => {
      const result = markModulesAffectedStatusFromSet(modules, new Set(), mockLog);

      expect(result).toHaveLength(3);
      expect(result.every((m) => m.isAffected === false)).toBe(true);
    });

    it('logs affected and unaffected counts', () => {
      markModulesAffectedStatusFromSet(
        modules,
        new Set(['@kbn/security-solution-plugin']),
        mockLog
      );

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('1 affected, 2 unaffected')
      );
    });
  });

  describe('filterModulesByAffectedConfigs', () => {
    const modules: ModuleDiscoveryInfo[] = [
      createModule('a', 'plugin', 'a/test/scout/ui/playwright.config.ts', [
        'a/test/scout/ui/parallel.playwright.config.ts',
      ]),
      createModule('b', 'plugin', 'b/test/scout/api/playwright.config.ts'),
    ];

    it('keeps only configs in the affected set and forces isAffected: true on survivors', () => {
      const result = filterModulesByAffectedConfigs(
        modules,
        new Set(['a/test/scout/ui/playwright.config.ts', 'b/test/scout/api/playwright.config.ts'])
      );

      expect(result).toHaveLength(2);
      const a = result.find((m) => m.name === 'a')!;
      expect(a.configs).toHaveLength(1);
      expect(a.configs[0].path).toBe('a/test/scout/ui/playwright.config.ts');
      expect(a.isAffected).toBe(true);

      const b = result.find((m) => m.name === 'b')!;
      expect(b.configs).toHaveLength(1);
      expect(b.isAffected).toBe(true);
    });

    it('drops modules whose configs are entirely filtered out', () => {
      const result = filterModulesByAffectedConfigs(
        modules,
        new Set(['a/test/scout/ui/parallel.playwright.config.ts'])
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('a');
      expect(result[0].configs[0].path).toBe('a/test/scout/ui/parallel.playwright.config.ts');
    });

    it('returns an empty array when no config is affected', () => {
      const result = filterModulesByAffectedConfigs(modules, new Set(['unrelated/config.ts']));
      expect(result).toEqual([]);
    });
  });
});
