/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../types';

const loadConfig = (
  modulePath: string,
  exportName: string,
  env: Record<string, string>
): ScoutServerConfig => {
  let config: ScoutServerConfig | undefined;
  jest.isolateModules(() => {
    Object.assign(process.env, env);
    config = jest.requireActual(modulePath)[exportName];
  });
  if (!config) throw new Error(`${modulePath} did not export ${exportName}`);
  return config;
};

const OVERRIDES = {
  TEST_ES_PORT: '9240',
  TEST_KIBANA_PORT: '5640',
  KIBANA_LOCALHOST_REAL_IP: '10.0.0.5',
};

describe('TEST_ES_PORT / TEST_KIBANA_PORT overrides', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TEST_ES_PORT;
    delete process.env.TEST_KIBANA_PORT;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it.each([
    ['./default/stateful/base.config', 'defaultConfig'],
    ['./default/serverless/security_complete.serverless.config', 'servers'],
  ])('%s keeps 9220 / 5620 when unset', (modulePath, exportName) => {
    const { servers } = loadConfig(modulePath, exportName, {});

    expect(servers.elasticsearch.port).toBe(9220);
    expect(servers.kibana.port).toBe(5620);
  });

  it.each([
    ['./default/stateful/base.config', 'defaultConfig'],
    ['./default/serverless/security_complete.serverless.config', 'servers'],
  ])('%s moves ES and Kibana to the override ports', (modulePath, exportName) => {
    const { servers, kbnTestServer } = loadConfig(modulePath, exportName, OVERRIDES);

    expect(servers.elasticsearch.port).toBe(9240);
    expect(servers.kibana.port).toBe(5640);
    expect(kbnTestServer.serverArgs).toContain('--server.port=5640');
  });

  it.each([
    ['./pki/stateful/base.config', 'pkiConfig', '--elasticsearch.hosts=https://localhost:9240'],
    [
      './agent_builder/serverless/search.serverless.config',
      'servers',
      '--xpack.security.mcp.oauth2.metadata.resource=http://localhost:5640/api/agent_builder/mcp',
    ],
    [
      './uiam_oauth_local/serverless/security_complete.serverless.config',
      'servers',
      '--xpack.security.mcp.oauth2.metadata.resource=http://localhost:5640/api/agent_builder/mcp',
    ],
  ])('%s derives its Kibana args from the override', (modulePath, exportName, expectedArg) => {
    const { kbnTestServer } = loadConfig(modulePath, exportName, OVERRIDES);

    expect(kbnTestServer.serverArgs).toContain(expectedArg);
  });

  it('edr_real_fleet advertises ES on the override port', () => {
    const { kbnTestServer } = loadConfig(
      './edr_real_fleet/stateful/classic.stateful.config',
      'servers',
      OVERRIDES
    );

    const outputsArg = kbnTestServer.serverArgs.find((arg) =>
      arg.startsWith('--xpack.fleet.outputs=')
    );
    expect(outputsArg).toContain('http://10.0.0.5:9240');
  });

  it('cps_local places the linked cluster at the override ES port plus the offset', () => {
    const { servers } = loadConfig(
      './cps_local/serverless/security_essentials.serverless.config',
      'servers',
      OVERRIDES
    );

    expect(servers.linkedElasticsearch?.port).toBe(9250);
  });
});
