/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { generateRole } from '../../src/task/generate_role';
import { createRoleSchemaEvaluator } from '../../src/evaluators/role_schema_evaluator';
import {
  roleGenerationExamples,
  ROLE_GENERATION_DATASET_NAME,
  ROLE_GENERATION_DATASET_DESCRIPTION,
} from '../../src/dataset/role_generation_dataset';

evaluate.describe('Mock IdP Role Generation', { tag: tags.stateful.classic }, () => {
  evaluate('role generation accuracy', async ({ executorClient, evaluators, kbnClient, log }) => {
    await executorClient.runExperiment(
      {
        dataset: {
          name: ROLE_GENERATION_DATASET_NAME,
          description: ROLE_GENERATION_DATASET_DESCRIPTION,
          examples: roleGenerationExamples,
        },
        task: async ({ input }: { input: RoleGenerationInput }) =>
          generateRole({ input, kbnClient, log }),
      },
      [
        createRoleSchemaEvaluator(),
        {
          name: 'RoleCriteria',
          kind: 'LLM',
          evaluate: async ({ input, output, metadata }) => {
            if (output?.error || !output?.roleName) {
              return { score: 0, label: 'task_error' };
            }
            if (
              !metadata?.criteria ||
              !Array.isArray(metadata.criteria) ||
              metadata.criteria.length === 0
            ) {
              return { score: null, label: 'no_criteria' };
            }
            return evaluators.criteria(metadata.criteria).evaluate({
              input: { description: input?.description },
              output: { role: output },
              expected: null,
              metadata: {},
            });
          },
        },
      ]
    );
  });
});
