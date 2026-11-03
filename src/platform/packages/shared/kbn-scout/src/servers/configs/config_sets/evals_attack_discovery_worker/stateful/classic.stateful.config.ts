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

/**
 * Config set for the attack-discovery-worker eval suite. The suite runs the managed Attack
 * Discovery runner, which in turn runs batched generation and per-attack review workflows. The
 * review's `ai.agent` step runs the `alertzero-thin-agent`, and both stages resolve their
 * connector from the `alertzero_frontier` inference feature; those exist only when alertzero is
 * enabled. The workflows additionally require the Workflows UI and agent settings, and the
 * `ai.conversation.*` steps require Agent Builder experimental features.
 *
 * `agenticInvestigations` and `proposals` are both **required** plugins of alertzero and both
 * default to `enabled: false`. Without either flag Kibana cascade-disables alertzero entirely,
 * so the feature is never registered and the suite's inference routing is ignored.
 *
 * Since #295215 alertzero installs no managed workflows unless service accounts are enabled.
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_attack_discovery_worker
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
      '--uiSettings.overrides.workflows:ui:enabled=true',
      '--uiSettings.overrides.workflows:aiAgent:enabled=true',
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
    ],
  },
};
