/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { buildEisServerConfig } from '../../agent_builder_smoke/shared';
import { serviceAccountsServerArgs } from '../../service_accounts/shared';

/**
 * Scout server config for everything under `test/scout_alertzero`: the AlertZero API suites
 * and the AlertZero end-to-end flows (`test/scout_alertzero/api_e2e`).
 *
 * Base flags — `alertzero` plus `agenticInvestigations` and `proposals`, which alertzero
 * requires and which default off; without them Kibana cascade-disables alertzero. On top of
 * that, what the managed workflows and the e2e flows need:
 *
 * - service accounts: alertzero installs no managed workflows without them, and a Worker
 *   cannot be enabled without a service account to run as.
 * - the `securitySolution:enableAlertZero` advanced setting. Every AlertZero route sits behind it
 *   and answers 404 while it is off, which is the default. The setting is `scope: 'namespace'`;
 *   `uiSettings.overrides` is applied by the UI settings client of every space, so the override
 *   turns it on for the test space.
 * - the `endpointForensicAnalysisSkill` securitySolution experimental feature. The managed
 *   `system-security-forensics-endpoint-analysis` Worker is hidden until the
 *   `endpoint-forensic-analysis` Agent Builder skill is registered, and the forensics workflow
 *   that proposes Isolate runs that skill. The Defend endpoint package is not preinstalled: the
 *   isolation spec installs it while seeding hosts (`indexHostsAndAlerts`).
 * - the Workflows UI, `ai.agent` workflow steps and Agent Builder experimental features the
 *   Attack Discovery review and forensics workflows rely on.
 *
 * EIS inference is opportunistic (`buildEisServerConfig({ required: false })`): when a connector
 * source exists (`KIBANA_TESTING_AI_CONNECTORS`, `config/kibana.dev.yml` or
 * `target/eis_models.json`) the stack boots with preconfigured inference connectors and the e2e
 * flows run against real models. When none exists (plain CI) the stack boots without connectors
 * and the LLM-dependent e2e specs skip themselves with an explicit reason — they never fail and
 * never silently pass. The simple API suites are model-free and run either way.
 *
 * Model selection: the e2e specs use the stack's default AI connector. Set
 * `ALERTZERO_E2E_AI_CONNECTOR` to the id of a preconfigured connector (for EIS models,
 * `eis-<modelId>`, e.g. `eis-gpt-5-6-sol`) to pin `genAiSettings:defaultAIConnector` to it.
 *
 * Usage:
 *   ALERTZERO_E2E_AI_CONNECTOR=eis-gpt-5-6-sol \
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet alertzero
 */
const pinnedConnectorId = process.env.ALERTZERO_E2E_AI_CONNECTOR?.trim();

const ENABLE_EXPERIMENTAL_ARG = '--xpack.securitySolution.enableExperimental=';
const REQUIRED_EXPERIMENTAL_FEATURES = ['endpointForensicAnalysisSkill'];

/**
 * Kibana reads a single `enableExperimental` value, so a value already set by a base config set
 * is merged into, not repeated.
 */
const withExperimentalFeatures = (baseArgs: string[]): string[] => {
  const features = new Set<string>(REQUIRED_EXPERIMENTAL_FEATURES);
  baseArgs
    .filter((arg) => arg.startsWith(ENABLE_EXPERIMENTAL_ARG))
    .forEach((arg) => {
      (JSON.parse(arg.slice(ENABLE_EXPERIMENTAL_ARG.length)) as string[]).forEach((feature) =>
        features.add(feature)
      );
    });
  return [
    ...baseArgs.filter((arg) => !arg.startsWith(ENABLE_EXPERIMENTAL_ARG)),
    `${ENABLE_EXPERIMENTAL_ARG}${JSON.stringify([...features])}`,
  ];
};

// Opportunistic EIS base: plain `defaultConfig` when no connector source exists (see above).
const eisConfig = buildEisServerConfig({ required: false });

export const servers: ScoutServerConfig = {
  ...eisConfig,
  kbnTestServer: {
    ...eisConfig.kbnTestServer,
    serverArgs: [
      ...withExperimentalFeatures([
        ...eisConfig.kbnTestServer.serverArgs,
        ...serviceAccountsServerArgs,
      ]),
      '--xpack.alertzero.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
      '--xpack.proposals.enabled=true',
      '--uiSettings.overrides.securitySolution:enableAlertZero=true',
      // Attack Discovery workflows + Context Engine (the review and forensics workflows are
      // workflow runs; context engine is what the forensics skill reads), mirroring the
      // evals_attack_discovery_agent_builder set.
      '--feature_flags.overrides.securitySolution.attackDiscoveryWorkflowsEnabled=true',
      '--uiSettings.overrides.securitySolution:enableAttackDiscoveryWorkflows=true',
      '--uiSettings.overrides.contextEngine:enabled=true',
      '--uiSettings.overrides.workflows:ui:enabled=true',
      '--uiSettings.overrides.workflows:aiAgent:enabled=true',
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      ...(pinnedConnectorId
        ? [`--uiSettings.overrides.genAiSettings:defaultAIConnector=${pinnedConnectorId}`]
        : []),
    ],
  },
};
