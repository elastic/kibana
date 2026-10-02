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
import { loadRawServerConfig } from '../servers/configs/loader/read_config_file';
import { auditConfigSets, findSetsRunInCi, KEEP_SEPARATE } from './audit_config_sets';

jest.mock('@kbn/repo-packages', () => ({ getPackages: () => [] }));
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
    Fs.mkdirSync(Path.join(repoRoot, '.buildkite'), { recursive: true });
    Fs.writeFileSync(
      Path.join(repoRoot, '.buildkite', 'scout_ci_config.yml'),
      'excluded_configs:\n  - plugins/b/test/scout_local_only/api/playwright.config.ts\n'
    );
  });

  afterEach(() => {
    Fs.rmSync(repoRoot, { recursive: true, force: true });
    jest.resetAllMocks();
  });

  describe('findSetsRunInCi', () => {
    it('keeps sets with a test config CI runs and drops the excluded ones', () => {
      const sets = findSetsRunInCi(repoRoot, () => [
        'plugins/a/test/scout_runs/api/playwright.config.ts',
        'plugins/b/test/scout_local_only/api/playwright.config.ts',
        'plugins/b/test/scout_mixed/api/playwright.config.ts',
        'plugins/c/test/scout_mixed/ui/playwright.config.ts',
        'plugins/d/test/scout/api/playwright.config.ts',
      ]);

      expect([...sets].sort()).toEqual(['mixed', 'runs']);
    });
  });

  describe('auditConfigSets', () => {
    beforeEach(() => {
      ['default', 'runs', 'local_only', 'no_tests'].forEach((name) => writeSet(repoRoot, name));
      Fs.mkdirSync(Path.join(repoRoot, 'plugins/a/test/scout_runs/api'), { recursive: true });
      (loadRawServerConfig as jest.Mock).mockResolvedValue({});
    });

    it('only compares sets that CI runs', async () => {
      const { sameAsDefault } = await auditConfigSets(repoRoot, () => [
        'plugins/a/test/scout_runs/api/playwright.config.ts',
        'plugins/b/test/scout_local_only/api/playwright.config.ts',
      ]);

      expect(sameAsDefault).toEqual(['`runs` (stateful)']);
    });

    it('skips sets that are kept separate on purpose', async () => {
      const [kept] = Object.keys(KEEP_SEPARATE);
      writeSet(repoRoot, kept);

      const { sameAsDefault } = await auditConfigSets(repoRoot, () => [
        'plugins/a/test/scout_runs/api/playwright.config.ts',
        `plugins/a/test/scout_${kept}/api/playwright.config.ts`,
      ]);

      expect(loadRawServerConfig).not.toHaveBeenCalledWith(expect.stringContaining(`/${kept}/`));
      expect(sameAsDefault).toEqual(['`runs` (stateful)']);
    });

    it('only keeps separate the config sets that exist', () => {
      const setsDir = Path.resolve(__dirname, '../servers/configs/config_sets');
      Object.keys(KEEP_SEPARATE).forEach((name) => {
        expect(Fs.existsSync(Path.join(setsDir, name))).toBe(true);
      });
    });
  });
});
