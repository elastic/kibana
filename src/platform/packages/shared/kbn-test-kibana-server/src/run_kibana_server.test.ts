/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProcRunner } from '@kbn/dev-proc-runner';
import { runKibanaServer } from './run_kibana_server';
import type { KibanaTestServerLaunchConfig } from './kibana_test_server_launch_config';

const CODE_GEN_FLAG = '--disallow-code-generation-from-strings';

const createConfig = (
  env: Record<string, string | undefined> = {}
): KibanaTestServerLaunchConfig => ({
  get: (path: string) => {
    switch (path) {
      case 'kbnTestServer.runOptions':
        return {};
      case 'kbnTestServer.env':
        return env;
      case 'kbnTestServer.useDedicatedTaskRunner':
        return false;
      case 'kbnTestServer.buildArgs':
      case 'kbnTestServer.sourceArgs':
        return [];
      case 'kbnTestServer.serverArgs':
        return ['--server.port=5620'];
      default:
        return undefined;
    }
  },
});

const createProcs = () => ({ run: jest.fn() } as unknown as ProcRunner);

const getArgs = (procs: ProcRunner) => (procs.run as jest.Mock).mock.calls[0][1].args as string[];

const getEnv = (procs: ProcRunner) =>
  (procs.run as jest.Mock).mock.calls[0][1].env as Record<string, string | undefined>;

describe('runKibanaServer()', () => {
  const originalEnvValue = process.env.KBN_DISALLOW_CODE_GEN_FROM_STRINGS;
  const originalKbnHmr = process.env.KBN_HMR;

  afterEach(() => {
    if (originalEnvValue === undefined) {
      delete process.env.KBN_DISALLOW_CODE_GEN_FROM_STRINGS;
    } else {
      process.env.KBN_DISALLOW_CODE_GEN_FROM_STRINGS = originalEnvValue;
    }
    if (originalKbnHmr === undefined) {
      delete process.env.KBN_HMR;
    } else {
      process.env.KBN_HMR = originalKbnHmr;
    }
  });

  it('passes --disallow-code-generation-from-strings by default when running from source', async () => {
    const procs = createProcs();
    delete process.env.KBN_DISALLOW_CODE_GEN_FROM_STRINGS;

    await runKibanaServer({ procs, config: createConfig() });

    const args = getArgs(procs);
    expect(args[0]).toBe(CODE_GEN_FLAG);
    expect(args[1]).toMatch(/scripts[\\/]kibana$/);
  });

  it('omits the flag when opted out via the environment', async () => {
    const procs = createProcs();
    process.env.KBN_DISALLOW_CODE_GEN_FROM_STRINGS = 'false';

    await runKibanaServer({ procs, config: createConfig() });

    expect(getArgs(procs)).not.toContain(CODE_GEN_FLAG);
  });

  it('reads the opt-out from the config so a test config can disable it', async () => {
    const procs = createProcs();
    delete process.env.KBN_DISALLOW_CODE_GEN_FROM_STRINGS;

    await runKibanaServer({
      procs,
      config: createConfig({ KBN_DISALLOW_CODE_GEN_FROM_STRINGS: 'false' }),
    });

    expect(getArgs(procs)).not.toContain(CODE_GEN_FLAG);
  });

  it('does not pass the flag when running from a build, where bin/kibana handles it', async () => {
    const procs = createProcs();
    delete process.env.KBN_DISALLOW_CODE_GEN_FROM_STRINGS;

    await runKibanaServer({ procs, config: createConfig(), installDir: '/tmp/kibana-build' });

    expect(getArgs(procs)).not.toContain(CODE_GEN_FLAG);
  });

  it('disables Rspack HMR by default', async () => {
    const procs = createProcs();
    delete process.env.KBN_HMR;

    await runKibanaServer({ procs, config: createConfig() });

    expect(getEnv(procs).KBN_HMR).toBe('false');
  });

  it('preserves an explicit Rspack HMR opt-in', async () => {
    const procs = createProcs();
    process.env.KBN_HMR = 'true';

    await runKibanaServer({ procs, config: createConfig() });

    expect(getEnv(procs).KBN_HMR).toBe('true');
  });

  it('allows test configuration to opt into Rspack HMR', async () => {
    const procs = createProcs();
    delete process.env.KBN_HMR;

    await runKibanaServer({ procs, config: createConfig({ KBN_HMR: 'true' }) });

    expect(getEnv(procs).KBN_HMR).toBe('true');
  });
});
