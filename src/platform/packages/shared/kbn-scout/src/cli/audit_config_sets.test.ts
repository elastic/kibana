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
  loadRawServerConfig: jest.fn(),
}));

const CONNECTORS_ENV = 'KIBANA_TESTING_AI_CONNECTORS';
const SETS_DIR = 'src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets';

const writeSet = (repoRoot: string, name: string) => {
  const dir = Path.join(repoRoot, SETS_DIR, name, 'stateful');
  Fs.mkdirSync(dir, { recursive: true });
  Fs.writeFileSync(Path.join(dir, 'classic.stateful.config.ts'), '');
};

describe('auditConfigSets', () => {
  const originalEnv = process.env[CONNECTORS_ENV];
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'scout-audit-'));
    ['default', 'needs_env'].forEach((name) => writeSet(repoRoot, name));
    delete process.env[CONNECTORS_ENV];
  });

  afterEach(() => {
    Fs.rmSync(repoRoot, { recursive: true, force: true });
    if (originalEnv === undefined) delete process.env[CONNECTORS_ENV];
    else process.env[CONNECTORS_ENV] = originalEnv;
    jest.resetAllMocks();
  });

  it('loads sets that need the connectors env variable and removes the placeholder after', async () => {
    (loadRawServerConfig as jest.Mock).mockImplementation(async () => {
      const value = process.env[CONNECTORS_ENV];
      if (!value) throw new Error('env variable is not set');
      // Same decoding as the agent_builder_smoke config, so an invalid placeholder fails here too.
      JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
      return { kbnTestServer: { serverArgs: [] }, esTestCluster: { serverArgs: [] } };
    });

    const { failed } = await auditConfigSets(repoRoot);

    expect(failed).toEqual([]);
    expect(process.env[CONNECTORS_ENV]).toBeUndefined();
  });

  it('keeps a value that is already set', async () => {
    process.env[CONNECTORS_ENV] = 'real';
    (loadRawServerConfig as jest.Mock).mockResolvedValue({});

    await auditConfigSets(repoRoot);

    expect(process.env[CONNECTORS_ENV]).toBe('real');
  });

  it('skips sets that are kept separate on purpose', async () => {
    const [kept] = Object.keys(KEEP_SEPARATE);
    writeSet(repoRoot, kept);
    (loadRawServerConfig as jest.Mock).mockResolvedValue({});

    const { sameAsDefault } = await auditConfigSets(repoRoot);

    expect(loadRawServerConfig).not.toHaveBeenCalledWith(expect.stringContaining(`/${kept}/`));
    expect(sameAsDefault).toEqual(['`needs_env` (stateful)']);
  });

  it('only keeps separate the config sets that exist', () => {
    const setsDir = Path.resolve(__dirname, '../servers/configs/config_sets');
    Object.keys(KEEP_SEPARATE).forEach((name) => {
      expect(Fs.existsSync(Path.join(setsDir, name))).toBe(true);
    });
  });
});
