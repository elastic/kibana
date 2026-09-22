/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

jest.mock('../../evals_tracing/stateful/classic.stateful.config', () => ({
  servers: {
    kbnTestServer: {
      serverArgs: ['--xpack.actions.preconfigured={"existing":{"name":"Existing connector"}}'],
    },
  },
}));

describe('Nightshift remote telemetry configuration', () => {
  const originalEnv = process.env;
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
  const originalExitListeners = process.listeners('exit');
  const originalListeners = signals.map((signal) => process.listeners(signal));
  let fixtureDirectory: string;
  const configDirectories: string[] = [];

  const readServers = () => {
    const servers = jest.requireActual<typeof import('./classic.stateful.config')>(
      './classic.stateful.config'
    ).servers;
    const configPath = servers.kbnTestServer.serverArgs
      .find((arg) => arg.startsWith('--config='))
      ?.slice(9);
    if (configPath) configDirectories.push(dirname(configPath));
    return servers;
  };

  beforeEach(() => {
    jest.resetModules();
    fixtureDirectory = mkdtempSync(join(tmpdir(), 'nightshift-config-test-'));
    writeFileSync(join(fixtureDirectory, 'client.crt'), 'test certificate');
    writeFileSync(join(fixtureDirectory, 'client.key'), 'test private key');
    process.env = {
      ...originalEnv,
      NIGHTSHIFT_DATASETS: 'trace-only',
      SANDBOX_API_KEY: 'sandbox-test-key',
      SANDBOX_CLIENT_CERT_PATH: join(fixtureDirectory, 'client.crt'),
      SANDBOX_CLIENT_KEY_PATH: join(fixtureDirectory, 'client.key'),
    };
    delete process.env.SANDBOX_CA_CERT_PATH;
    delete process.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL;
    delete process.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY;
    delete process.env.NIGHTSHIFT_SANDBOX_READABLE_INDICES;
    delete process.env.NIGHTSHIFT_CONCURRENCY;
  });

  afterEach(() => {
    process.env = originalEnv;
    for (const directory of [...configDirectories.splice(0), fixtureDirectory]) {
      rmSync(directory, { recursive: true, force: true });
    }
    for (const listener of process.listeners('exit')) {
      if (!originalExitListeners.includes(listener)) process.removeListener('exit', listener);
    }
    for (const [index, signal] of signals.entries()) {
      for (const listener of process.listeners(signal)) {
        if (!originalListeners[index].includes(listener)) process.removeListener(signal, listener);
      }
    }
  });

  it('keeps remote credentials private while preserving existing connectors', () => {
    process.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL = 'https://telemetry.example.com';
    process.env.NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY = 'restricted-test-key';
    process.env.NIGHTSHIFT_SANDBOX_READABLE_INDICES = 'Read remote-a:logs-service-*';

    const { serverArgs } = readServers().kbnTestServer;
    const configPath = serverArgs.find((arg) => arg.startsWith('--config='))?.slice(9);
    expect(configPath).toBeDefined();
    if (!configPath) throw new Error('Missing private runtime configuration');
    const privateConfig = JSON.parse(readFileSync(configPath, 'utf8'));

    expect(statSync(configPath).mode.toString(8).slice(-3)).toBe('600');
    expect(serverArgs.join(' ')).not.toContain('restricted-test-key');
    expect(serverArgs.some((arg) => arg.startsWith('--xpack.actions.preconfigured='))).toBe(false);
    expect(privateConfig['xpack.actions.preconfigured']).toEqual({
      existing: { name: 'Existing connector' },
      'nightshift-evals-telemetry': {
        name: 'Remote Elasticsearch telemetry',
        actionTypeId: '.webhook',
        config: {
          url: 'https://telemetry.example.com',
          method: 'post',
          hasAuth: false,
          authType: null,
        },
        secrets: { secretHeaders: { Authorization: 'ApiKey restricted-test-key' } },
      },
    });
    expect(privateConfig['xpack.nightshift_investigations.sandbox']).toEqual({
      telemetry_connector_id: 'nightshift-evals-telemetry',
      telemetry_readable_indices: 'Read remote-a:logs-service-*',
    });
  });

  it('reserves capacity for sixteen normal workflow tasks plus background tasks', () => {
    process.env.NIGHTSHIFT_CONCURRENCY = '16';
    expect(readServers().kbnTestServer.serverArgs).toContain('--xpack.task_manager.capacity=42');
  });

  it.each(['0', '21', '1.5', 'invalid'])('rejects unsupported concurrency %s', (value) => {
    process.env.NIGHTSHIFT_CONCURRENCY = value;
    expect(readServers).toThrow('NIGHTSHIFT_CONCURRENCY must be an integer between 1 and 20');
  });

  it.each([
    ['NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL', 'https://telemetry.example.com'],
    ['NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY', 'restricted-test-key'],
    ['NIGHTSHIFT_SANDBOX_READABLE_INDICES', 'remote-a:logs-*'],
  ])('rejects an incomplete remote configuration containing only %s', (name, value) => {
    process.env[name] = value;

    expect(readServers).toThrow(
      'Remote telemetry requires both NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL and NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY'
    );
  });
});
