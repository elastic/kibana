/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The connector sources `buildEisServerConfig({ required: false })` probes are real files:
 * `config/kibana.dev.yml` and `target/eis_models.json`. On a developer machine that has either,
 * the "without connectors" cases below would silently run the EIS branch and assert nothing
 * about the fallback they exist for. Mock `fs` so both sources read as absent everywhere; every
 * other file access falls through to the real implementation.
 */
jest.mock('fs', () => {
  const actual = jest.requireActual('fs') as typeof import('fs');
  const isConnectorSource = (path: unknown): boolean =>
    typeof path === 'string' &&
    (path.endsWith('kibana.dev.yml') || path.endsWith('eis_models.json'));
  return {
    ...actual,
    existsSync: (path: unknown) =>
      !isConnectorSource(path) &&
      actual.existsSync(path as Parameters<typeof actual.existsSync>[0]),
    readFileSync: (...args: Parameters<typeof actual.readFileSync>) => {
      if (isConnectorSource(args[0])) {
        throw new Error(`unexpected read of connector source ${String(args[0])}`);
      }
      return actual.readFileSync(...args);
    },
  };
});

describe('alertzero stateful classic server config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('loads on CI without preconfigured AI connectors', () => {
    process.env.CI = 'true';
    delete process.env.KIBANA_TESTING_AI_CONNECTORS;

    expect(() => jest.requireActual('./classic.stateful.config')).not.toThrow();
  });

  it('enables AlertZero and its prerequisites', () => {
    delete process.env.KIBANA_TESTING_AI_CONNECTORS;
    const { servers } = jest.requireActual('./classic.stateful.config');
    const args: string[] = servers.kbnTestServer.serverArgs;

    expect(args).toContain('--xpack.alertzero.enabled=true');
    // The per-space gate must stay writable: an `uiSettings.overrides` pin would make
    // `securitySolution:enableAlertZero` read-only, and the hunt suites' baseline writes
    // through `internal/kibana/settings` would then fail even when the value is unchanged.
    expect(args).not.toContain('--uiSettings.overrides.securitySolution:enableAlertZero=true');
  });

  it('keeps runtime-applicable advanced settings out of the server args', () => {
    delete process.env.KIBANA_TESTING_AI_CONNECTORS;
    const { servers } = jest.requireActual('./classic.stateful.config');
    const args: string[] = servers.kbnTestServer.serverArgs;

    // These are written through `internal/kibana/settings` by the suites' global setup and
    // restored by their global teardown, so they must not be pinned (and made read-only) here.
    expect(args.filter((arg) => arg.startsWith('--uiSettings.overrides'))).toEqual([]);
  });

  it('wires EIS and the preconfigured connectors when a connector source is set', () => {
    const connectors = {
      'eis-some-model': {
        name: 'EIS some model',
        actionTypeId: '.inference',
        exposeConfig: true,
        config: { provider: 'elastic', taskType: 'chat_completion', inferenceId: 'some-model' },
        secrets: {},
      },
    };
    process.env.KIBANA_TESTING_AI_CONNECTORS = Buffer.from(JSON.stringify(connectors)).toString(
      'base64'
    );
    const { servers } = jest.requireActual('./classic.stateful.config');
    const kbnArgs: string[] = servers.kbnTestServer.serverArgs;
    const esArgs: string[] = servers.esTestCluster.serverArgs;

    expect(esArgs).toContain(
      'xpack.inference.elastic.url=https://inference.eu-west-1.aws.svc.qa.elastic.cloud'
    );
    const preconfigured = kbnArgs.find((arg) => arg.startsWith('--xpack.actions.preconfigured='));
    expect(preconfigured).toBeDefined();
    expect(
      JSON.parse((preconfigured ?? '').slice('--xpack.actions.preconfigured='.length))
    ).toMatchObject(connectors);
    // The AlertZero args are layered on top of the EIS base, not replaced by it.
    expect(kbnArgs).toContain('--xpack.alertzero.enabled=true');
  });

  it('boots without EIS or preconfigured connectors when no connector source exists', () => {
    process.env.CI = 'true';
    delete process.env.KIBANA_TESTING_AI_CONNECTORS;

    const { servers } = jest.requireActual('./classic.stateful.config');
    const kbnArgs: string[] = servers.kbnTestServer.serverArgs;
    const esArgs: string[] = servers.esTestCluster.serverArgs;

    // The fallback output of `buildEisServerConfig({ required: false })`: no EIS endpoint on
    // Elasticsearch, no preconfigured connectors on Kibana, no EIS URL anywhere.
    expect(esArgs).not.toContain(
      'xpack.inference.elastic.url=https://inference.eu-west-1.aws.svc.qa.elastic.cloud'
    );
    expect(esArgs.filter((arg) => arg.startsWith('xpack.inference.'))).toEqual([]);
    expect(kbnArgs.find((arg) => arg.startsWith('--xpack.actions.preconfigured='))).toBeUndefined();
    // The AlertZero args are layered on the plain base, not lost by the fallback.
    expect(kbnArgs).toContain('--xpack.alertzero.enabled=true');
  });

  it('keeps the server-driver args', () => {
    delete process.env.KIBANA_TESTING_AI_CONNECTORS;
    const { servers } = jest.requireActual('./classic.stateful.config');
    const args: string[] = servers.kbnTestServer.serverArgs;

    expect(args).toEqual(
      expect.arrayContaining([
        '--xpack.alertzero.enabled=true',
        '--xpack.agenticInvestigations.enabled=true',
        '--xpack.proposals.enabled=true',
        '--feature_flags.overrides.securitySolution.attackDiscoveryWorkflowsEnabled=true',
        '--xpack.security.serviceAccounts.enabled=true',
        '--server.restrictInternalApis=true',
      ])
    );
  });
});
