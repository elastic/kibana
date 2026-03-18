/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import type { EvaluationDataset } from '@kbn/evals';
import { selectEvaluators } from '@kbn/evals';
import { evaluate as base } from '../src/evaluate';
import type { WorkflowCreateExample, WorkflowTaskOutput } from '../src/types';
import {
  createEditSuccessEvaluator,
  createValidationPassEvaluator,
  createNoErrorsEvaluator,
  createCriteriaEvaluator,
} from '../src/evaluators';

const evaluate = base.extend<
  {
    evaluateCreateDataset: (opts: {
      dataset: EvaluationDataset<WorkflowCreateExample>;
    }) => Promise<void>;
  },
  {}
>({
  evaluateCreateDataset: [
    ({ chatClient, evaluators, executorClient }, use) => {
      use(async ({ dataset }) => {
        await executorClient.runExperiment(
          {
            dataset,
            task: async ({ input }) => {
              const response = await chatClient.converse({
                messages: [{ message: input.instruction }],
              });

              return {
                messages: response.messages,
                steps: response.steps,
                errors: response.errors,
              };
            },
          },
          selectEvaluators<WorkflowCreateExample, WorkflowTaskOutput>([
            createNoErrorsEvaluator(),
            createEditSuccessEvaluator(),
            createValidationPassEvaluator(),
            createCriteriaEvaluator({ evaluators }),
          ])
        );
      });
    },
    { scope: 'test' },
  ],
});

evaluate.describe(
  'Workflow creation via natural language',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('creates a simple workflow from scratch', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation: simple',
          description: 'Evaluate the ability to create simple workflows from natural language',
          examples: [
            {
              input: {
                instruction:
                  'Create a new workflow called "Health Check" that runs every 5 minutes and pings https://api.example.com/health using an HTTP GET request.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Health Check".',
                  'The workflow has a scheduled trigger set to every 5 minutes.',
                  'The workflow contains a step that makes an HTTP GET request to https://api.example.com/health.',
                ],
              },
              metadata: { category: 'simple-creation' },
            },
            {
              input: {
                instruction:
                  'Create a workflow named "Alert Logger" that triggers manually and logs the message "Alert received" to the console.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Alert Logger".',
                  'The workflow has a manual trigger.',
                  'The workflow contains a console step that logs "Alert received".',
                ],
              },
              metadata: { category: 'simple-creation' },
            },
          ],
        },
      });
    });

    evaluate('creates a workflow with conditional logic', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation: conditional',
          description: 'Evaluate the ability to create workflows with conditional branching',
          examples: [
            {
              input: {
                instruction:
                  'Create a workflow called "Conditional Router" with a manual trigger. It should have an HTTP step that calls https://api.example.com/status, then an if-step that checks if the response status is "healthy". If healthy, log "System OK". Otherwise, log "System degraded".',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Conditional Router".',
                  'The workflow has a manual trigger.',
                  'There is an HTTP step that fetches a status endpoint.',
                  'There is a conditional (if) step that branches based on a health/status check.',
                  'One branch logs a success message and the other logs a degraded/failure message.',
                ],
              },
              metadata: { category: 'conditional-creation' },
            },
          ],
        },
      });
    });

    evaluate('creates a workflow with a loop', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation: loop',
          description: 'Evaluate the ability to create workflows with foreach loops',
          examples: [
            {
              input: {
                instruction:
                  'Create a workflow called "Batch Processor" that triggers manually. It should have a data.set step that defines a list of items ["item1", "item2", "item3"], then a foreach loop that iterates over the items and logs each one to the console.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Batch Processor".',
                  'The workflow has a manual trigger.',
                  'There is a data.set step that defines a list of items.',
                  'There is a foreach step that iterates over the items.',
                  'Inside the loop, each item is logged to the console.',
                ],
              },
              metadata: { category: 'loop-creation' },
            },
          ],
        },
      });
    });

    evaluate('creates a workflow with error handling', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation: error-handling',
          description: 'Evaluate the ability to create workflows with error handling and retries',
          examples: [
            {
              input: {
                instruction:
                  'Create a workflow called "Resilient Fetcher" that triggers on a schedule every 10 minutes. It should fetch data from https://api.example.com/data with retry on failure (3 attempts, 5 second delay). If all retries fail, log "Fetch failed after retries" as a fallback.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Resilient Fetcher".',
                  'The workflow has a scheduled trigger set to every 10 minutes.',
                  'The HTTP step has on-failure retry configuration with 3 attempts.',
                  'The retry delay is set to 5 seconds.',
                  'There is a fallback step that logs a failure message.',
                ],
              },
              metadata: { category: 'error-handling-creation' },
            },
          ],
        },
      });
    });

    evaluate('creates a multi-step workflow', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation: multi-step',
          description: 'Evaluate the ability to create complex multi-step workflows',
          examples: [
            {
              input: {
                instruction:
                  'Create a workflow called "Data Pipeline" with a manual trigger. Steps: 1) Log "Starting pipeline", 2) HTTP GET to https://api.example.com/users to fetch user data, 3) Set a variable called "user_count" to the number of users returned, 4) Log "Processed {user_count} users" at the end.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Data Pipeline".',
                  'The workflow has a manual trigger.',
                  'There is a console step that logs a start message.',
                  'There is an HTTP step that fetches user data.',
                  'There is a data.set step that captures the user count.',
                  'There is a final console step that logs the count of processed users.',
                  'The steps are in a logical order.',
                ],
              },
              metadata: { category: 'multi-step-creation' },
            },
          ],
        },
      });
    });
  }
);
