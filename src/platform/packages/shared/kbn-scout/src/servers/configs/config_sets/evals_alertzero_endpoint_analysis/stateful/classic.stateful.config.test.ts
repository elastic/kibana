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
    '--uiSettings.overrides.workflows:aiAgent:enabled=true',
  ])('enables %s', (arg) => {
    expect(args).toContain(arg);
  });
});
