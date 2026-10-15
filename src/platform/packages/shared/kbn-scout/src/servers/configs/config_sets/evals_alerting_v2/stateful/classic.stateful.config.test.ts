/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers } from './classic.stateful.config';

describe('evals_alerting_v2 scout server config', () => {
  const args = servers.kbnTestServer.serverArgs;

  it('keeps Universal Alerting enabled with both experimental feature settings off', () => {
    expect(args).toContain('--uiSettings.overrides.alerting:v2:enabled=true');
    expect(args).toContain('--uiSettings.overrides.alerting:v2:experimentalFeatures=false');
    expect(args).toContain('--uiSettings.overrides.agentBuilder:experimentalFeatures=false');
    expect(args).not.toContain('--uiSettings.overrides.alerting:v2:experimentalFeatures=true');
    expect(args).not.toContain('--uiSettings.overrides.agentBuilder:experimentalFeatures=true');
  });
});
