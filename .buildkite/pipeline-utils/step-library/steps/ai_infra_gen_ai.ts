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

export const aiInfraGenAiSteps = (): readonly Step[] => [
  groupStep({
    group: 'AppEx AI-Infra genAI tests',
    key: 'ai-infra-gen-ai',
    depends_on: ['build'],
    steps: [
      commandStep({
        command:
          [
            '.buildkite/scripts/steps/test/ftr_configs.sh',
            '.buildkite/scripts/steps/test/annotate_llm_smoke_judgements.sh',
          ].join('\n') + '\n',
        env: {
          FTR_CONFIG: 'x-pack/platform/test/functional_gen_ai/inference/config.ts',
          FTR_CONFIG_GROUP_KEY: 'ftr-ai-infra-gen-ai-inference-api',
          FTR_GEN_AI: '1',
          // Keep ES/Kibana server logs on disk so mocha log capture does not OOM on ML-heavy suites
          FTR_EXTRA_ARGS: '--writeLogsToPath=data/ftr_servers_logs',
          FTR_EIS_CCM: '1',
        },
        label: 'AppEx AI-Infra Inference APIs FTR tests',
        key: 'ai-infra-gen-ai-inference-api',
        timeout_in_minutes: 120,
        parallelism: 1,
        agents: spotAgent('n2-standard-4', spotZones.centralFCA),
        artifact_paths: ['target/llm_smoke_judgements.jsonl'],
        retry: retry.agentLossOrAnyOnce,
      }),
    ],
  }),
];
