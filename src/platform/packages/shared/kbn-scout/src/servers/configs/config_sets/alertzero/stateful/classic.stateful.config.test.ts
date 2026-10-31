/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

  it('turns on alert analysis so the Alert Triage worker can be enabled', () => {
    delete process.env.KIBANA_TESTING_AI_CONNECTORS;
    const { servers } = jest.requireActual('./classic.stateful.config');

    expect(servers.kbnTestServer.serverArgs).toContain(
      '--uiSettings.overrides.securitySolution:alertAnalysisWorkflowEnabled=true'
    );
  });
});
