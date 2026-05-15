/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Multi-turn workflow editing evals.
 *
 * The existing suite is single-turn: each example sends one instruction and
 * scores the final YAML. Production users iterate ("add retries", "swap the
 * condition", "actually rename that step") — these examples capture that
 * conversational behavior.
 *
 * Each example sends a sequence of user turns inside one conversation, threading
 * the server-side conversationId between turns via chatClient.converseMultiTurn.
 * Evaluators run on the *final* YAML.
 *
 * Per security-team#17191.
 */

import { tags } from '@kbn/scout';
import type { EvaluationDataset } from '@kbn/evals';
import { selectEvaluators } from '@kbn/evals';
import { evaluate as base } from '../src/evaluate';
import type { MultiTurnWorkflowEditExample, WorkflowTaskOutput } from '../src/types';
import {
  createEditSuccessEvaluator,
  createValidationPassEvaluator,
  createNoErrorsEvaluator,
  createCriteriaEvaluator,
  createStructuralCorrectnessEvaluator,
  createEditPreservationEvaluator,
  createEfficiencyEvaluator,
  createLatencyEvaluator,
  skipInfraErrors,
  skipNegativeCases,
  extractResultYaml,
  extractYamlFromAttachments,
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

const alertWorkflowYaml = `version: '1'
name: Alert Processor
description: Processes incoming security alerts
enabled: true
triggers:
  - type: alert
steps:
  - name: log_alert
    type: console
    with:
      message: "Alert received"
  - name: notify_slack
    type: slack
    connector-id: my-slack-connector
    with:
      message: "New alert"
`;

const skip = <E extends MultiTurnWorkflowEditExample>(
  e: Parameters<typeof skipInfraErrors<E>>[0]
) => skipInfraErrors(skipNegativeCases(e));

const evaluate = base.extend<
  {
    evaluateMultiTurnEditDataset: (opts: {
      dataset: EvaluationDataset<MultiTurnWorkflowEditExample>;
    }) => Promise<void>;
  },
  {}
>({
  evaluateMultiTurnEditDataset: [
    async ({ chatClient, evaluators, executorClient }, use) => {
      await use(async ({ dataset }) => {
        await executorClient.runExperiment(
          {
            dataset,
            task: async ({ input }) => {
              const startMs = Date.now();
              const response = await chatClient.converseMultiTurn({
                turns: input.turns.map((turn, idx) => ({
                  message: turn.instruction,
                  // Only attach the initial YAML on the first turn; subsequent
                  // turns rely on server-side conversation history.
                  ...(idx === 0
                    ? {
                        attachments: [
                          {
                            type: WORKFLOW_YAML_ATTACHMENT_TYPE,
                            data: { yaml: input.initialYaml },
                          },
                        ],
                      }
                    : {}),
                })),
              });
              const latencyMs = Date.now() - startMs;

              const taskOutput = {
                messages: response.messages,
                steps: response.steps,
                errors: response.errors,
              };

              let resultYaml = extractResultYaml(taskOutput);
              if (!resultYaml && response.conversationId) {
                const attachments = await chatClient.getConversationAttachments(
                  response.conversationId
                );
                resultYaml = extractYamlFromAttachments(attachments);
              }

              return {
                ...taskOutput,
                resultYaml,
                latencyMs,
              };
            },
          },
          selectEvaluators<MultiTurnWorkflowEditExample, WorkflowTaskOutput>([
            skip(createNoErrorsEvaluator()),
            skip(createEditSuccessEvaluator()),
            skip(createValidationPassEvaluator()),
            skip(createStructuralCorrectnessEvaluator()),
            skip(createEditPreservationEvaluator()),
            skip(createEfficiencyEvaluator()),
            skip(createLatencyEvaluator()),
            skipInfraErrors(createCriteriaEvaluator({ evaluators })),
          ])
        );
      });
    },
    { scope: 'test' },
  ],
});

evaluate.describe(
  'Multi-turn workflow editing',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('iterative refinement of a single step', async ({ evaluateMultiTurnEditDataset }) => {
      await evaluateMultiTurnEditDataset({
        dataset: {
          name: 'workflow-editing-multiturn: iterative-refinement',
          description:
            'User adds a behavior in turn 1, then refines its parameters in turn 2. ' +
            'Final YAML must reflect the refined parameters.',
          examples: [
            {
              input: {
                initialYaml: baseWorkflowYaml,
                turns: [
                  { instruction: 'Add retries to fetch_data so it tries again on failure.' },
                  {
                    instruction:
                      'Actually, make it 5 retries instead of the default, and bump the delay to 10 seconds.',
                  },
                ],
              },
              output: {
                criteria: [
                  'The fetch_data step has retry configuration.',
                  'The retry count is 5 (the refined value), not the default that turn 1 produced.',
                  'The retry delay is 10 seconds.',
                  'The log_start and log_end steps were not removed or reordered.',
                ],
                expectedStepCount: 3,
                preservedStepNames: ['log_start', 'log_end'],
                expectedMaxToolCalls: 6,
              },
              metadata: { category: 'multi-turn-refinement' },
            },
          ],
        },
      });
    });

    evaluate('compositional build-up across turns', async ({ evaluateMultiTurnEditDataset }) => {
      await evaluateMultiTurnEditDataset({
        dataset: {
          name: 'workflow-editing-multiturn: compositional',
          description:
            'User builds up a feature across multiple turns — first adds a scaffold, ' +
            'then adds nested behavior inside it.',
          examples: [
            {
              input: {
                initialYaml: alertWorkflowYaml,
                turns: [
                  {
                    instruction:
                      'Wrap the existing steps in a foreach that iterates over event.alerts so the workflow processes each alert.',
                  },
                  {
                    instruction:
                      "Inside that loop, before the Slack notification, add an if step that only sends to Slack when the alert's severity is critical or high.",
                  },
                ],
              },
              output: {
                criteria: [
                  'There is a foreach step iterating over event.alerts.',
                  'The log_alert and notify_slack steps are nested inside the foreach.',
                  'There is an if step inside the foreach that guards the notify_slack call.',
                  'The if condition references the alert severity from foreach.item via Liquid.',
                  'The Slack step still references a connector via connector-id.',
                ],
                expectedStepTypes: ['foreach', 'if', 'slack', 'console'],
                expectedMaxToolCalls: 8,
              },
              metadata: { category: 'multi-turn-compositional' },
            },
          ],
        },
      });
    });

    evaluate(
      'corrective turn overrides earlier change',
      async ({ evaluateMultiTurnEditDataset }) => {
        await evaluateMultiTurnEditDataset({
          dataset: {
            name: 'workflow-editing-multiturn: corrective',
            description:
              'User makes a change in turn 1, then changes their mind in turn 2. ' +
              'Final YAML must reflect the corrected decision, not the earlier one.',
            examples: [
              {
                input: {
                  initialYaml: baseWorkflowYaml,
                  turns: [
                    { instruction: 'Rename fetch_data to fetch_users.' },
                    {
                      instruction: 'Actually call it get_users instead — fetch was the wrong verb.',
                    },
                  ],
                },
                output: {
                  criteria: [
                    'There is a step named "get_users".',
                    'There is no step named "fetch_users" or "fetch_data".',
                    'The renamed step still has type http and the same URL as the original fetch_data.',
                    'The log_start and log_end steps are unchanged.',
                  ],
                  expectedStepCount: 3,
                  expectedStepNames: ['log_start', 'get_users', 'log_end'],
                  preservedStepNames: ['log_start', 'log_end'],
                  expectedMaxToolCalls: 6,
                },
                metadata: { category: 'multi-turn-corrective' },
              },
            ],
          },
        });
      }
    );

    evaluate('three-turn scaffold → add → modify', async ({ evaluateMultiTurnEditDataset }) => {
      await evaluateMultiTurnEditDataset({
        dataset: {
          name: 'workflow-editing-multiturn: three-turn',
          description:
            'Longer conversation: scaffold a new step, add behavior to it, ' +
            'then modify a parameter of that behavior. Tests that the agent maintains ' +
            'state across more than two turns.',
          examples: [
            {
              input: {
                initialYaml: baseWorkflowYaml,
                turns: [
                  {
                    instruction:
                      'Add a new Elasticsearch search step between fetch_data and log_end that queries the logs-* index.',
                  },
                  {
                    instruction:
                      'Make that search only return documents from the last 24 hours where level is error.',
                  },
                  {
                    instruction: 'Bump the size to 100 — we want more context for debugging.',
                  },
                ],
              },
              output: {
                criteria: [
                  'A new elasticsearch.search step exists between fetch_data and log_end.',
                  'The search queries the logs-* index.',
                  'The query filters for level: error.',
                  'The query has a time-range constraint on the last 24 hours.',
                  'The search size parameter is 100.',
                ],
                expectedStepCount: 4,
                expectedStepTypes: ['elasticsearch.search'],
                preservedStepNames: ['log_start', 'fetch_data', 'log_end'],
                expectedMaxToolCalls: 10,
              },
              metadata: { category: 'multi-turn-three-turn' },
            },
          ],
        },
      });
    });

    evaluate(
      'mixed insert / delete / modify across turns',
      async ({ evaluateMultiTurnEditDataset }) => {
        await evaluateMultiTurnEditDataset({
          dataset: {
            name: 'workflow-editing-multiturn: mixed-operations',
            description:
              'Each turn performs a different kind of edit (insert, delete, modify). ' +
              'Tests that the agent correctly accumulates a sequence of distinct operations.',
            examples: [
              {
                input: {
                  initialYaml: baseWorkflowYaml,
                  turns: [
                    {
                      instruction:
                        'Add a console step at the very beginning that logs "Starting pipeline".',
                    },
                    { instruction: 'Drop the log_end step — we no longer need it.' },
                    {
                      instruction:
                        'Change fetch_data to use POST with an empty JSON body instead of GET.',
                    },
                  ],
                },
                output: {
                  criteria: [
                    'A new console step is the first step and logs "Starting pipeline" or similar.',
                    'The log_end step has been removed.',
                    'The fetch_data step uses POST.',
                    'The fetch_data step has a request body (JSON, can be empty).',
                  ],
                  expectedStepCount: { min: 3, max: 3 },
                  preservedStepNames: ['log_start'],
                  expectedMaxToolCalls: 9,
                },
                metadata: { category: 'multi-turn-mixed' },
              },
            ],
          },
        });
      }
    );
  }
);
