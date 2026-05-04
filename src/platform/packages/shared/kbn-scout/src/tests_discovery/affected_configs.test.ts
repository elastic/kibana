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

import { filterModulesByAffectedConfigs, readAffectedConfigs } from './affected_configs';

const createConfig = (configPath: string) => ({
  path: configPath,
  hasTests: true,
  tags: ['@local-stateful-classic'],
  serverRunFlags: ['--arch stateful --domain classic'],
  usesParallelWorkers: false,
});

const createModule = (
  name: string,
  type: 'plugin' | 'package',
  configPaths: string[]
): ModuleDiscoveryInfo => ({
  name,
  group: 'test-group',
  type,
  configs: configPaths.map(createConfig),
});

describe('affected_configs', () => {
  let mockLog: ToolingLog;

  beforeEach(() => {
    mockLog = new ToolingLog({ level: 'verbose', writeTo: process.stdout });
    jest.spyOn(mockLog, 'info').mockImplementation(jest.fn());
    jest.spyOn(mockLog, 'warning').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('readAffectedConfigs', () => {
    it('reads and parses a valid JSON array file', () => {
      const configs = [
        'a/test/scout/ui/playwright.config.ts',
        'b/test/scout/api/playwright.config.ts',
      ];
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(configs));

      const result = readAffectedConfigs('/some/path.json', mockLog);

      expect(result).toEqual(new Set(configs));
    });

    it('returns null for non-array JSON', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ not: 'an array' }));

      const result = readAffectedConfigs('/some/path.json', mockLog);

      expect(result).toBeNull();
      expect(mockLog.warning).toHaveBeenCalledWith(
        expect.stringContaining('does not contain a JSON array')
      );
    });

    it('returns null when array contains non-string entries', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(['ok.ts', 42, null]));

      const result = readAffectedConfigs('/some/path.json', mockLog);

      expect(result).toBeNull();
      expect(mockLog.warning).toHaveBeenCalledWith(
        expect.stringContaining('contains non-string entries')
      );
    });

    it('returns null when the file cannot be read', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const result = readAffectedConfigs('/missing/file.json', mockLog);

      expect(result).toBeNull();
      expect(mockLog.warning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read affected configs file')
      );
    });

    it('returns null for invalid JSON', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('not valid json');

      const result = readAffectedConfigs('/some/path.json', mockLog);

      expect(result).toBeNull();
    });
  });

  describe('filterModulesByAffectedConfigs', () => {
    const moduleA = createModule('a', 'plugin', [
      'a/test/scout/ui/playwright.config.ts',
      'a/test/scout/ui/parallel.playwright.config.ts',
      'a/test/scout/api/playwright.config.ts',
    ]);
    const moduleB = createModule('b', 'plugin', ['b/test/scout/ui/playwright.config.ts']);
    const moduleC = createModule('c', 'package', ['c/test/scout/api/playwright.config.ts']);
    const modules = [moduleA, moduleB, moduleC];

    it('keeps only allow-listed configs and marks survivors as affected', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify([
          'a/test/scout/ui/parallel.playwright.config.ts',
          'b/test/scout/ui/playwright.config.ts',
        ])
      );

      const result = filterModulesByAffectedConfigs(modules, '/affected.json', mockLog);

      expect(result.map((m) => m.name).sort()).toEqual(['a', 'b']);
      const a = result.find((m) => m.name === 'a')!;
      expect(a.isAffected).toBe(true);
      expect(a.configs.map((c) => c.path)).toEqual([
        'a/test/scout/ui/parallel.playwright.config.ts',
      ]);
      const b = result.find((m) => m.name === 'b')!;
      expect(b.isAffected).toBe(true);
      expect(b.configs.map((c) => c.path)).toEqual(['b/test/scout/ui/playwright.config.ts']);
    });

    it('drops modules with zero remaining configs', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(['a/test/scout/ui/playwright.config.ts'])
      );

      const result = filterModulesByAffectedConfigs(modules, '/affected.json', mockLog);

      expect(result.map((m) => m.name)).toEqual(['a']);
    });

    it('returns [] and warns when allowlist is empty', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([]));

      const result = filterModulesByAffectedConfigs(modules, '/affected.json', mockLog);

      expect(result).toEqual([]);
      expect(mockLog.warning).toHaveBeenCalledWith(
        expect.stringContaining('Affected configs file is empty')
      );
    });

    it('does not bleed across modules: matching path in one module never affects siblings', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(['c/test/scout/api/playwright.config.ts'])
      );

      const result = filterModulesByAffectedConfigs(modules, '/affected.json', mockLog);

      expect(result.map((m) => m.name)).toEqual(['c']);
      expect(result[0].configs.map((c) => c.path)).toEqual([
        'c/test/scout/api/playwright.config.ts',
      ]);
    });

    it('throws when the affected configs file cannot be read', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT');
      });

      expect(() => filterModulesByAffectedConfigs(modules, '/missing.json', mockLog)).toThrow(
        'Selective testing: could not load affected configs file'
      );
    });

    it('logs kept/dropped/survivor counts', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify([
          'a/test/scout/ui/playwright.config.ts',
          'a/test/scout/ui/parallel.playwright.config.ts',
        ])
      );

      filterModulesByAffectedConfigs(modules, '/affected.json', mockLog);

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringMatching(/Affected configs: 2 kept, \d+ dropped, 1 module\(s\) survived/)
      );
    });
  });
});
