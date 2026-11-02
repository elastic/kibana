/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GENERATION_PATH_TIMEOUT_MS, servers } from './classic.stateful.config';

const serverArgs = servers.kbnTestServer.serverArgs;

describe('evals_attack_discovery_generation_path config set', () => {
  it('enables service accounts so alertzero installs its managed workflows (#295215)', () => {
    expect(serverArgs).toContain('--xpack.security.serviceAccounts.enabled=true');
  });

  it('enables alertzero with both of its required plugins', () => {
    expect(serverArgs).toEqual(
      expect.arrayContaining([
        '--xpack.alertzero.enabled=true',
        '--xpack.agenticInvestigations.enabled=true',
        '--xpack.proposals.enabled=true',
      ])
    );
  });

  it('turns on the Attack Discovery workflows flag and its uiSetting', () => {
    expect(serverArgs).toEqual(
      expect.arrayContaining([
        '--feature_flags.overrides.securitySolution.attackDiscoveryWorkflowsEnabled=true',
        '--uiSettings.overrides.securitySolution:enableAttackDiscoveryWorkflows=true',
      ])
    );
  });

  it('turns token usage tracking on, which the routing proof reads', () => {
    expect(serverArgs).toContain('--uiSettings.overrides.genAiSettings:tokenUsageTracking=true');
  });

  it('raises the model-call, actions and socket timeouts above their defaults', () => {
    expect(GENERATION_PATH_TIMEOUT_MS).toBeGreaterThan(10 * 60_000);
    expect(serverArgs).toEqual(
      expect.arrayContaining([
        `--xpack.discoveries.connectorTimeout=${GENERATION_PATH_TIMEOUT_MS}`,
        `--xpack.actions.responseTimeout=${GENERATION_PATH_TIMEOUT_MS / 1000}s`,
        `--server.socketTimeout=${GENERATION_PATH_TIMEOUT_MS}`,
      ])
    );
  });
});
