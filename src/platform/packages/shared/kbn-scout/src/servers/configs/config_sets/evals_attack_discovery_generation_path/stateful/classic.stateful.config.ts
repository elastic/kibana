/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as evalsTracingConfig } from '../../evals_tracing/stateful/classic.stateful.config';
import { serviceAccountsServerArgs } from '../../service_accounts/shared';

/** Frontier models take minutes per batch; this is well above the defaults below. */
export const GENERATION_PATH_TIMEOUT_MS = 15 * 60_000;

/**
 * Config set for the Attack Discovery generation-path eval. It runs the alertzero batched-generation
 * managed workflow, so it needs everything the fp-tp set needs (alertzero and its two required
 * plugins, service accounts so the managed workflows install) plus the Attack Discovery workflows
 * flag and uiSetting the `security.attack-discovery.run` step is gated on.
 *
 * Timeouts. The run step executes in the Kibana process, so the cap on a model call is
 * `xpack.discoveries.connectorTimeout` (default 10 min), which is passed to the inference client as
 * the request timeout. `xpack.actions.responseTimeout` (default 60s) is the floor the actions axios
 * layer applies for connector-backed calls. `server.socketTimeout` (default 120s) only governs
 * inbound HTTP, so it is not on the in-process workflow path; it is raised so a response that is
 * served over HTTP is not cut at 120s either.
 *
 * `genAiSettings:tokenUsageTracking` makes the inference plugin write one document per model call to
 * `.kibana-inference-token-usage`, which the spec reads to prove which model served the run.
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_attack_discovery_generation_path
 */
export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs,
      ...serviceAccountsServerArgs,
      '--xpack.alertzero.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
      '--xpack.proposals.enabled=true',
      '--feature_flags.overrides.securitySolution.attackDiscoveryWorkflowsEnabled=true',
      '--uiSettings.overrides.securitySolution:enableAttackDiscoveryWorkflows=true',
      '--uiSettings.overrides.workflows:ui:enabled=true',
      '--uiSettings.overrides.workflows:aiAgent:enabled=true',
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      '--uiSettings.overrides.genAiSettings:tokenUsageTracking=true',
      `--xpack.discoveries.connectorTimeout=${GENERATION_PATH_TIMEOUT_MS}`,
      `--xpack.actions.responseTimeout=${GENERATION_PATH_TIMEOUT_MS / 1000}s`,
      `--server.socketTimeout=${GENERATION_PATH_TIMEOUT_MS}`,
    ],
  },
};
