/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { parse } from 'yaml';

jest.mock('../../evals_tracing/stateful/classic.stateful.config', () => ({
  servers: {
    servers: {
      elasticsearch: { port: 9220 },
      kibana: { username: 'elastic', password: 'changeme' },
    },
    esTestCluster: { files: [] },
    kbnTestServer: {
      serverArgs: [
        '--telemetry.enabled=true',
        '--telemetry.tracing.exporters=[{"http":{"url":"https://traces.example","headers":{"Authorization":"synthetic-trace-key"}}}]',
      ],
    },
  },
}));

describe('Nightshift sandbox configuration', () => {
  const originalEnv = process.env;
  let fixtureDirectory: string;
  let exitListeners: Array<(code: number) => void>;

  beforeEach(() => {
    jest.resetModules();
    exitListeners = process.listeners('exit');
    fixtureDirectory = mkdtempSync(join(tmpdir(), 'nightshift-config-test-'));
    writeFileSync(join(fixtureDirectory, 'client.crt'), 'synthetic certificate');
    writeFileSync(join(fixtureDirectory, 'client.key'), 'synthetic private key\nsecond line');
    writeFileSync(join(fixtureDirectory, 'ca.crt'), 'synthetic CA');
    process.env = {
      SANDBOX_API_KEY: 'synthetic-api-key',
      SANDBOX_CLIENT_CERT_PATH: join(fixtureDirectory, 'client.crt'),
      SANDBOX_CLIENT_KEY_PATH: join(fixtureDirectory, 'client.key'),
    };
  });

  afterEach(() => {
    for (const listener of process.listeners('exit')) {
      if (!exitListeners.includes(listener)) {
        process.removeListener('exit', listener);
        listener(0);
      }
    }
    rmSync(fixtureDirectory, { recursive: true, force: true });
    process.env = originalEnv;
  });

  it.each([false, true])('loads mTLS secrets privately (custom CA: %s)', async (customCa) => {
    if (customCa) {
      process.env.SANDBOX_CA_CERT_PATH = join(fixtureDirectory, 'ca.crt');
      process.env.SANDBOX_API_HOST = 'sandbox.example';
      process.env.SANDBOX_API_PORT = '9091';
    }
    const { servers } = await import('./classic.stateful.config');
    const { serverArgs } = servers.kbnTestServer;
    const configArgs = serverArgs.filter((arg) => arg.startsWith('--config='));
    expect(configArgs).toHaveLength(1);
    expect(serverArgs).toContain('--telemetry.enabled=true');
    const configPath = configArgs[0].slice('--config='.length);
    expect(statSync(dirname(configPath)).mode.toString(8).slice(-3)).toBe('700');
    expect(statSync(configPath).mode.toString(8).slice(-3)).toBe('600');
    const config = parse(readFileSync(configPath, 'utf8'));
    expect(config).toMatchObject({
      'xpack.sandbox': {
        enabled: true,
        host: customCa ? 'sandbox.example' : 'localhost',
        port: customCa ? 9091 : 9090,
        api_key: 'synthetic-api-key',
        ssl: {
          certificate: 'synthetic certificate',
          key: 'synthetic private key\nsecond line',
          ...(customCa ? { certificate_authorities: 'synthetic CA' } : {}),
        },
      },
    });
    expect(config['xpack.nightshift_investigations.sandbox']).toEqual({
      telemetry_connector_id: 'nightshift-evals-telemetry',
    });
    expect(config['telemetry.tracing.exporters']).toEqual([
      {
        http: { url: 'https://traces.example', headers: { Authorization: 'synthetic-trace-key' } },
      },
    ]);
    expect(config['xpack.agentBuilder.tracing.exporters']).toEqual([
      { url: 'https://traces.example', headers: { Authorization: 'synthetic-trace-key' } },
    ]);
    const connector = config['xpack.actions.preconfigured']['nightshift-evals-telemetry'];
    expect(connector.secrets.user).toBe('nightshift_evals_telemetry');
    expect(connector.secrets.password).toMatch(/^[a-f0-9]{64}$/);
    const args = serverArgs.join(' ');
    expect(args).not.toContain(connector.secrets.password);
    expect(args).not.toContain('synthetic-trace-key');
    expect(args).not.toContain('--xpack.actions.preconfigured=');
    expect(args).not.toContain('synthetic-api-key');
    expect(args).not.toContain('synthetic private key');
    expect(args).not.toContain('--xpack.sandbox');
    expect(args).not.toContain('--xpack.nightshift_investigations.sandbox=');

    for (const listener of process.listeners('exit')) {
      if (!exitListeners.includes(listener)) listener(0);
    }
    expect(existsSync(dirname(configPath))).toBe(false);
  });

  it('requires an API key before creating a config', async () => {
    delete process.env.SANDBOX_API_KEY;
    await expect(import('./classic.stateful.config')).rejects.toThrow(
      'SANDBOX_API_KEY is required'
    );
  });

  it('requires both client PEM paths', async () => {
    delete process.env.SANDBOX_CLIENT_KEY_PATH;
    await expect(import('./classic.stateful.config')).rejects.toThrow(
      'SANDBOX_CLIENT_CERT_PATH and SANDBOX_CLIENT_KEY_PATH are required'
    );
  });
});
