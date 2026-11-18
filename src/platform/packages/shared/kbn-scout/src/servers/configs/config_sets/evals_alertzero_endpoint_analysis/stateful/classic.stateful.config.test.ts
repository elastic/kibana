/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers } from './classic.stateful.config';

describe('evals_alertzero_endpoint_analysis config set', () => {
  const args = servers.kbnTestServer.serverArgs;

  it.each([
    '--xpack.alertzero.enabled=true',
    '--xpack.agenticInvestigations.enabled=true',
    '--xpack.proposals.enabled=true',
    '--xpack.security.serviceAccounts.enabled=true',
    '--uiSettings.overrides.contextEngine:enabled=true',
    '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
    '--xpack.spaces.defaultSolution=security',
    `--xpack.securitySolution.enableExperimental=${JSON.stringify([
      'endpointForensicAnalysisSkill',
    ])}`,
  ])('enables %s', (arg) => {
    expect(args).toContain(arg);
  });

  // The per-space AlertZero gate is set by the suite, so an override must not pin it in every space.
  it('does not override the per-space AlertZero setting', () => {
    expect(args.some((arg) => arg.includes('securitySolution:enableAlertZero'))).toBe(false);
  });
});
