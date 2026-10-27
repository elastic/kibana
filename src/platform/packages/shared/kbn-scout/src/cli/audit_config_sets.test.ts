/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { testConfigs } from '@kbn/scout-reporting';
import { loadRawServerConfig } from '../servers/configs/loader/read_config_file';
import { getScoutCiExcludedConfigs } from '../tests_discovery/search_configs';
import { auditConfigSets, findSetsRunInCi, MUST_STAY_SEPARATE } from './audit_config_sets';

jest.mock('@kbn/repo-packages', () => ({ getPackages: () => [] }));
jest.mock('@kbn/scout-reporting', () => ({ testConfigs: { all: [] as unknown[] } }));
jest.mock('../tests_discovery/search_configs', () => ({ getScoutCiExcludedConfigs: jest.fn() }));
jest.mock('../servers/configs/loader/read_config_file', () => ({
  loadRawServerConfig: jest.fn(),
}));

const SETS_DIR = 'src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets';

const writeSet = (repoRoot: string, name: string) => {
  const dir = Path.join(repoRoot, SETS_DIR, name, 'stateful');
  Fs.mkdirSync(dir, { recursive: true });
  Fs.writeFileSync(Path.join(dir, 'classic.stateful.config.ts'), '');
};

describe('config sets audit', () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'scout-audit-'));
    (getScoutCiExcludedConfigs as jest.Mock).mockReturnValue([
      'plugins/b/test/scout_local_only/api/playwright.config.ts',
    ]);
  });

  afterEach(() => {
    Fs.rmSync(repoRoot, { recursive: true, force: true });
    jest.resetAllMocks();
  });

  const setConfigs = (...configs: Array<{ path: string; configSet: string }>) => {
    (testConfigs as { all: unknown[] }).all = configs.map(({ path, configSet }) => ({
      path,
      server: { configSet },
    }));
  };

  describe('findSetsRunInCi', () => {
    it('keeps sets with a test config CI runs and drops the excluded ones', () => {
      setConfigs(
        { path: 'plugins/a/test/scout_runs/api/playwright.config.ts', configSet: 'runs' },
        {
          path: 'plugins/b/test/scout_local_only/api/playwright.config.ts',
          configSet: 'local_only',
        },
        { path: 'plugins/b/test/scout_mixed/api/playwright.config.ts', configSet: 'mixed' },
        { path: 'plugins/c/test/scout_mixed/ui/playwright.config.ts', configSet: 'mixed' }
      );

      expect([...findSetsRunInCi()].sort()).toEqual(['mixed', 'runs']);
    });
  });

  describe('auditConfigSets', () => {
    beforeEach(() => {
      ['default', 'runs', 'local_only', 'no_tests'].forEach((name) => writeSet(repoRoot, name));
      Fs.mkdirSync(Path.join(repoRoot, 'plugins/a/test/scout_runs/api'), { recursive: true });
      (loadRawServerConfig as jest.Mock).mockResolvedValue({});
    });

    it('only compares sets that CI runs', async () => {
      setConfigs(
        { path: 'plugins/a/test/scout_runs/api/playwright.config.ts', configSet: 'runs' },
        {
          path: 'plugins/b/test/scout_local_only/api/playwright.config.ts',
          configSet: 'local_only',
        }
      );

      const { sameAsDefault } = await auditConfigSets(repoRoot);

      expect(sameAsDefault).toEqual(['`runs` (stateful)']);
    });

    it('skips sets that are kept separate on purpose', async () => {
      const [kept] = Object.keys(MUST_STAY_SEPARATE);
      writeSet(repoRoot, kept);

      setConfigs(
        { path: 'plugins/a/test/scout_runs/api/playwright.config.ts', configSet: 'runs' },
        { path: `plugins/a/test/scout_${kept}/api/playwright.config.ts`, configSet: kept }
      );

      const { sameAsDefault } = await auditConfigSets(repoRoot);

      expect(loadRawServerConfig).not.toHaveBeenCalledWith(expect.stringContaining(`/${kept}/`));
      expect(sameAsDefault).toEqual(['`runs` (stateful)']);
    });

    it('only keeps separate the config sets that exist', () => {
      const setsDir = Path.resolve(__dirname, '../servers/configs/config_sets');
      Object.keys(MUST_STAY_SEPARATE).forEach((name) => {
        expect(Fs.existsSync(Path.join(setsDir, name))).toBe(true);
      });
    });
  });
});
