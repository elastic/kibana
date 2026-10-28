/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep, groupStep } from '../helpers.ts';
import { retry, spotAgent, spotZones } from '../presets.ts';
import type { Step } from '../types.ts';

export const agentBuilderSmokeTestsSteps = (): readonly Step[] => [
  groupStep({
    group: 'Agent Builder Smoke Tests',
    key: 'agent-builder-smoke-tests',
    depends_on: ['build'],
    steps: [
      commandStep({
        label: '🔍 Discover EIS Models',
        command: '.buildkite/scripts/steps/test/discover_eis_models.sh',
        key: 'discover-eis-models',
        timeout_in_minutes: 10,
        env: { FTR_EIS_CCM: '1' },
        agents: spotAgent('n2-standard-2', spotZones.centralFCBA),
        artifact_paths: ['target/eis_models.json'],
        retry: retry.agentLossOrAnyOnce,
      }),
      commandStep({
        command:
          [
            'mkdir -p target',
            "buildkite-agent artifact download 'target/eis_models.json' . --step discover-eis-models || echo '{\"models\":[]}' > target/eis_models.json",
            '.buildkite/scripts/steps/test/scout/configs.sh',
            '.buildkite/scripts/steps/test/annotate_llm_smoke_judgements.sh',
          ].join('\n') + '\n',
        env: {
          FTR_GEN_AI: '1',
          FTR_EIS_CCM: '1',
          SCOUT_CONFIG:
            'x-pack/platform/plugins/shared/agent_builder/test/scout_agent_builder_smoke/api/playwright.config.ts',
          SCOUT_CONFIG_GROUP_TYPE: 'scout-agent-builder-smoke-tests',
          SCOUT_SERVER_RUN_FLAGS: '--arch stateful --domain classic',
        },
        label: 'Agent Builder Scout Smoke Tests',
        key: 'scout-agent-builder-smoke-tests',
        depends_on: 'discover-eis-models',
        timeout_in_minutes: 50,
        parallelism: 1,
        agents: spotAgent('n2-standard-4', spotZones.centralFCA),
        artifact_paths: ['target/llm_smoke_judgements.jsonl'],
        retry: retry.agentLossOrAnyOnce,
      }),
    ],
  }),
];
