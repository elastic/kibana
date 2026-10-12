/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as eisConfig } from '../../agent_builder_smoke/stateful/classic.stateful.config';
import { serviceAccountsServerArgs } from '../../service_accounts/shared';

/**
 * Scout server config for the AlertZero end-to-end flows (`test/scout_alertzero_e2e`).
 *
 * These flows run the managed AlertZero workflows against real Elastic Inference Service
 * models, so the config builds on `agent_builder_smoke` (EIS inference endpoint on
 * Elasticsearch, preconfigured connectors from `KIBANA_TESTING_AI_CONNECTORS`,
 * `config/kibana.dev.yml` or `target/eis_models.json`). On top of that it turns on:
 *
 * - `alertzero`, plus `agenticInvestigations` and `proposals`, which alertzero requires and
 *   which default off; without them Kibana cascade-disables alertzero.
 * - service accounts: alertzero installs no managed workflows without them, and a Worker
 *   cannot be enabled without a service account to run as.
 * - the `securitySolution:enableAlertZero` advanced setting. Every AlertZero route sits behind it
 *   and answers 404 while it is off, which is the default. The setting is `scope: 'namespace'`;
 *   `uiSettings.overrides` is applied by the UI settings client of every space, so the override
 *   turns it on for the test space.
 * - the Workflows UI, `ai.agent` workflow steps and Agent Builder experimental features the
 *   Attack Discovery review and forensics workflows rely on.
 *
 * Model selection: the specs use the stack's default AI connector. Set
 * `ALERTZERO_E2E_AI_CONNECTOR` to the id of a preconfigured connector (for EIS models,
 * `eis-<modelId>`, e.g. `eis-gpt-5-6-sol`) to pin `genAiSettings:defaultAIConnector` to it.
 *
 * Usage:
 *   ALERTZERO_E2E_AI_CONNECTOR=eis-gpt-5-6-sol \
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet alertzero_e2e
 */
const pinnedConnectorId = process.env.ALERTZERO_E2E_AI_CONNECTOR?.trim();

export const servers: ScoutServerConfig = {
  ...eisConfig,
  kbnTestServer: {
    ...eisConfig.kbnTestServer,
    serverArgs: [
      ...eisConfig.kbnTestServer.serverArgs,
      ...serviceAccountsServerArgs,
      '--xpack.alertzero.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
      '--xpack.proposals.enabled=true',
      '--uiSettings.overrides.securitySolution:enableAlertZero=true',
      '--uiSettings.overrides.workflows:ui:enabled=true',
      '--uiSettings.overrides.workflows:aiAgent:enabled=true',
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      ...(pinnedConnectorId
        ? [`--uiSettings.overrides.genAiSettings:defaultAIConnector=${pinnedConnectorId}`]
        : []),
    ],
  },
};
