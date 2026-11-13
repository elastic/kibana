/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers } from './classic.stateful.config';

describe('evals_siem_readiness config set', () => {
  it('does not override agentBuilder:experimentalFeatures because the suite sets it via the API (#298605)', () => {
    // The suite's beforeAll calls `uiSettings.set('agentBuilder:experimentalFeatures', true)`.
    // A value covered by `--uiSettings.overrides.*` is read-only: the PUT
    // returns HTTP 400 "Unable to update ... because it is overridden"
    // (see src/core/server/integration_tests/ui_settings/doc_exists.ts), so
    // the override must not appear in serverArgs.
    expect(
      servers.kbnTestServer.serverArgs.filter((arg) =>
        arg.startsWith('--uiSettings.overrides.agentBuilder:experimentalFeatures')
      )
    ).toHaveLength(0);
  });

  it('enables the siemReadinessAgentBuilder experimental flag', () => {
    expect(
      servers.kbnTestServer.serverArgs.find((arg) =>
        arg.startsWith('--xpack.securitySolution.enableExperimental=')
      )
    ).toContain('siemReadinessAgentBuilder');
  });
});
