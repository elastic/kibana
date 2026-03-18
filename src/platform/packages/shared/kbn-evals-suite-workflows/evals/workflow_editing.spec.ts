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
import type { WorkflowEditExample, WorkflowTaskOutput } from '../src/types';
import {
  createToolUsageEvaluator,
  createEditSuccessEvaluator,
  createValidationPassEvaluator,
  createNoErrorsEvaluator,
  createCriteriaEvaluator,
} from '../src/evaluators';

const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml';

const baseWorkflowYaml = `version: '1'
name: Test Workflow
description: A workflow for testing edits
enabled: true
tags:
  - test

triggers:
  - type: manual

steps:
  - name: log_start
    type: console
    with:
      message: "Workflow started"
  - name: fetch_data
    type: http
    with:
      method: GET
      url: "https://api.example.com/data"
  - name: log_end
    type: console
    with:
      message: "Workflow completed"
`;

const evaluate = base.extend<
  {
    evaluateEditDataset: (opts: {
      dataset: EvaluationDataset<WorkflowEditExample>;
    }) => Promise<void>;
  },
  {}
>({
  evaluateEditDataset: [
    ({ chatClient, evaluators, executorClient }, use) => {
      use(async ({ dataset }) => {
        await executorClient.runExperiment(
          {
            dataset,
            task: async ({ input }) => {
              const response = await chatClient.converse({
                messages: [{ message: input.instruction }],
                attachments: [
                  {
                    type: WORKFLOW_YAML_ATTACHMENT_TYPE,
                    data: { yaml: input.initialYaml },
                  },
                ],
              });

              return {
                messages: response.messages,
                steps: response.steps,
                errors: response.errors,
              };
            },
          },
          selectEvaluators<WorkflowEditExample, WorkflowTaskOutput>([
            createNoErrorsEvaluator(),
            createEditSuccessEvaluator(),
            createValidationPassEvaluator(),
            createToolUsageEvaluator(),
            createCriteriaEvaluator({ evaluators }),
          ])
        );
      });
    },
    { scope: 'test' },
  ],
});

evaluate.describe(
  'Workflow editing via natural language',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('inserts a new step', async ({ evaluateEditDataset }) => {
      await evaluateEditDataset({
        dataset: {
          name: 'workflow-editing: insert-step',
          description: 'Evaluate the ability to insert new steps into an existing workflow',
          examples: [
            {
              input: {
                instruction:
                  'Add a step at the end that sends a Slack notification with the message "Data fetch complete".',
                initialYaml: baseWorkflowYaml,
              },
              output: {
                criteria: [
                  'A new step was added to the workflow.',
                  'The new step sends a message containing "Data fetch complete".',
                ],
                expectedToolIds: ['platform.workflows.workflow_insert_step'],
              },
              metadata: { category: 'insert-step' },
            },
            {
              input: {
                instruction:
                  'Add an Elasticsearch search step between the fetch_data and log_end steps that queries the "logs-*" index.',
                initialYaml: baseWorkflowYaml,
              },
              output: {
                criteria: [
                  'A new Elasticsearch search step was added to the workflow.',
                  'The new step queries the "logs-*" index.',
                ],
              },
              metadata: { category: 'insert-step' },
            },
          ],
        },
      });
    });

    evaluate('modifies an existing step', async ({ evaluateEditDataset }) => {
      await evaluateEditDataset({
        dataset: {
          name: 'workflow-editing: modify-step',
          description: 'Evaluate the ability to modify existing workflow steps',
          examples: [
            {
              input: {
                instruction:
                  'Change the fetch_data step to use POST instead of GET and add a JSON body with {"query": "test"}.',
                initialYaml: baseWorkflowYaml,
              },
              output: {
                criteria: [
                  'The fetch_data step was modified.',
                  'The method is now POST.',
                  'The request body contains {"query": "test"} or equivalent.',
                ],
              },
              metadata: { category: 'modify-step' },
            },
            {
              input: {
                instruction:
                  'Update the log_start step message to say "Processing initiated at {{ now }}".',
                initialYaml: baseWorkflowYaml,
              },
              output: {
                criteria: [
                  'The log_start step message was updated.',
                  'The new message contains "Processing initiated".',
                ],
              },
              metadata: { category: 'modify-step' },
            },
          ],
        },
      });
    });

    evaluate('deletes a step', async ({ evaluateEditDataset }) => {
      await evaluateEditDataset({
        dataset: {
          name: 'workflow-editing: delete-step',
          description: 'Evaluate the ability to delete steps from a workflow',
          examples: [
            {
              input: {
                instruction: 'Remove the log_end step from the workflow.',
                initialYaml: baseWorkflowYaml,
              },
              output: {
                criteria: [
                  'The log_end step was removed from the workflow.',
                  'The remaining steps (log_start, fetch_data) are intact.',
                ],
                expectedToolIds: ['platform.workflows.workflow_delete_step'],
              },
              metadata: { category: 'delete-step' },
            },
          ],
        },
      });
    });

    evaluate('modifies a top-level property', async ({ evaluateEditDataset }) => {
      await evaluateEditDataset({
        dataset: {
          name: 'workflow-editing: modify-property',
          description: 'Evaluate the ability to modify top-level workflow properties',
          examples: [
            {
              input: {
                instruction:
                  'Rename the workflow to "Data Processing Pipeline" and update the description to "Fetches and processes external data on demand".',
                initialYaml: baseWorkflowYaml,
              },
              output: {
                criteria: [
                  'The workflow name was changed to "Data Processing Pipeline".',
                  'The workflow description was updated accordingly.',
                ],
              },
              metadata: { category: 'modify-property' },
            },
            {
              input: {
                instruction:
                  'Change the trigger from manual to a scheduled trigger that runs every 15 minutes.',
                initialYaml: baseWorkflowYaml,
              },
              output: {
                criteria: [
                  'The trigger type was changed from manual to scheduled.',
                  'The schedule interval is set to 15 minutes.',
                ],
              },
              metadata: { category: 'modify-property' },
            },
          ],
        },
      });
    });

    evaluate('performs multi-step edits', async ({ evaluateEditDataset }) => {
      await evaluateEditDataset({
        dataset: {
          name: 'workflow-editing: multi-step-edits',
          description:
            'Evaluate the ability to perform multiple edits in a single conversation turn',
          examples: [
            {
              input: {
                instruction:
                  'Rename the workflow to "Enhanced Pipeline", remove the log_end step, and add error handling to the fetch_data step with a retry of 3 attempts.',
                initialYaml: baseWorkflowYaml,
              },
              output: {
                criteria: [
                  'The workflow was renamed to "Enhanced Pipeline".',
                  'The log_end step was removed.',
                  'The fetch_data step has error handling with retry configured to 3 attempts.',
                ],
              },
              metadata: { category: 'multi-step' },
            },
          ],
        },
      });
    });
  }
);
