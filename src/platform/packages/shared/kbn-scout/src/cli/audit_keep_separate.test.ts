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
import { auditConfigSets, KEEP_SEPARATE } from './audit_config_sets';

jest.mock('@kbn/repo-packages', () => ({ getPackages: () => [] }));
jest.mock('../servers/configs/loader/read_config_file', () => ({
  loadRawServerConfig: jest.fn(async () => ({})),
}));

const SETS_DIR = 'src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets';

const writeSet = (repoRoot: string, name: string) => {
  const dir = Path.join(repoRoot, SETS_DIR, name, 'stateful');
  Fs.mkdirSync(dir, { recursive: true });
  Fs.writeFileSync(Path.join(dir, 'classic.stateful.config.ts'), '');
};

describe('sets kept separate on purpose', () => {
  it('are not reported as identical to the default', async () => {
    const repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'scout-audit-'));
    const [kept] = Object.keys(KEEP_SEPARATE);
    ['default', kept, 'plain'].forEach((name) => writeSet(repoRoot, name));

    const { sameAsDefault } = await auditConfigSets(repoRoot);

    expect(loadRawServerConfig).not.toHaveBeenCalledWith(expect.stringContaining(`/${kept}/`));
    expect(sameAsDefault).toEqual(['`plain` (stateful)']);
    Fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  it('only lists config sets that exist', () => {
    const setsDir = Path.resolve(__dirname, '../servers/configs/config_sets');
    Object.keys(KEEP_SEPARATE).forEach((name) => {
      expect(Fs.existsSync(Path.join(setsDir, name))).toBe(true);
    });
  });
});
