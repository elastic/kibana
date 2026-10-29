/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep, groupStep } from '../../helpers.ts';
import { retry, spotAgent, spotZones } from '../../presets.ts';
import type { Step } from '../../types.ts';

export const securitySolutionGenAiEvalsSteps = (): readonly Step[] => [
  groupStep({
    group: 'Security Solution Gen AI',
    key: 'security-solution-gen-ai',
    depends_on: ['build'],
    steps: [
      commandStep({
        command: '.buildkite/scripts/steps/test/ftr_configs.sh',
        env: {
          FTR_CONFIG:
            'x-pack/solutions/security/test/security_solution_api_integration/test_suites/genai/evaluations/trial_license_complete_tier/configs/ess.config.ts',
          FTR_CONFIG_GROUP_KEY: 'ftr-security-solution-gen-ai-evaluations',
          FTR_SECURITY_GEN_AI: '1',
        },
        label: 'Security Solution Gen AI Evaluations',
        key: 'security-solution-gen-ai-evaluations',
        timeout_in_minutes: 50,
        parallelism: 1,
        agents: spotAgent('n2-standard-4', spotZones.centralFCA),
        retry: retry.agentLossOrAnyOnce,
      }),
    ],
  }),
];
