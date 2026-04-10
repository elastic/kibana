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
  createRejectionEvaluator,
  createCriteriaEvaluator,
  createStructuralCorrectnessEvaluator,
  createEfficiencyEvaluator,
  createToolTrajectoryEvaluator,
  createLatencyEvaluator,
  skipInfraErrors,
  skipNegativeCases,
  extractResultYaml,
  extractYamlFromAttachments,
} from '../src/evaluators';

const skip = <E extends WorkflowCreateExample>(e: Parameters<typeof skipInfraErrors<E>>[0]) =>
  skipInfraErrors(skipNegativeCases(e));

const evaluate = base.extend<
  {
    evaluateCreateDataset: (opts: {
      dataset: EvaluationDataset<WorkflowCreateExample>;
    }) => Promise<void>;
  },
  {}
>({
  evaluateCreateDataset: [
    async ({ chatClient, evaluators, executorClient }, use) => {
      await use(async ({ dataset }) => {
        await executorClient.runExperiment(
          {
            dataset,
            task: async ({ input }) => {
              const startMs = Date.now();
              const response = await chatClient.converse({
                messages: [{ message: input.instruction }],
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
          selectEvaluators<WorkflowCreateExample, WorkflowTaskOutput>([
            skip(createNoErrorsEvaluator()),
            skip(createEditSuccessEvaluator()),
            skip(createValidationPassEvaluator()),
            skip(createStructuralCorrectnessEvaluator()),
            skip(createEfficiencyEvaluator()),
            skip(createToolTrajectoryEvaluator()),
            skip(createLatencyEvaluator()),
            skipInfraErrors(createCriteriaEvaluator({ evaluators })),
            skipInfraErrors(createRejectionEvaluator()),
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
                  'Create a "Health Check" workflow that pings https://api.example.com/health every 5 minutes',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Health Check".',
                  'The workflow has a scheduled trigger set to every 5 minutes.',
                  'The workflow contains a step that makes an HTTP GET request to https://api.example.com/health.',
                ],
                expectedStepCount: { min: 1, max: 2 },
                expectedStepTypes: ['http'],
                expectedMaxToolCalls: 4,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.workflow_set_yaml',
                ],
              },
              metadata: { category: 'simple-creation' },
            },
            {
              input: {
                instruction:
                  'Make a simple "Alert Logger" workflow, manual trigger, just logs "Alert received" to console',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Alert Logger".',
                  'The workflow has a manual trigger.',
                  'The workflow contains a console step that logs "Alert received".',
                ],
                expectedStepCount: 1,
                expectedStepTypes: ['console'],
                expectedMaxToolCalls: 4,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.workflow_set_yaml',
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
                  'I need a "Conditional Router" workflow that checks https://api.example.com/status and logs whether the system is OK or degraded based on the response',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Conditional Router".',
                  'The workflow has a manual trigger.',
                  'There is an HTTP step that fetches a status endpoint.',
                  'There is a conditional (if) step that branches based on a health/status check.',
                  'One branch logs a success message and the other logs a degraded/failure message.',
                ],
                expectedStepTypes: ['http', 'console'],
                expectedStepCount: { min: 4, max: 5 },
                expectedMaxToolCalls: 6,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.workflow_set_yaml',
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
                  'Create a "Batch Processor" workflow that loops over a list of items and logs each one to console, manual trigger',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Batch Processor".',
                  'The workflow has a manual trigger.',
                  'There is a step that defines or stores a list of items.',
                  'There is a loop that iterates over the items.',
                  'Inside the loop, each item is logged to the console.',
                ],
                expectedStepTypes: ['data.set|foreach', 'console'],
                expectedStepCount: { min: 2, max: 5 },
                expectedMaxToolCalls: 6,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.workflow_set_yaml',
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
                  'Create a "Resilient Fetcher" workflow that fetches https://api.example.com/data every 10 minutes with retries, and logs a failure message if it still can\'t reach the endpoint',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Resilient Fetcher".',
                  'The workflow has a scheduled trigger set to every 10 minutes.',
                  'The HTTP step has on-failure retry configuration with 3 attempts.',
                  'The retry delay is set to 5 seconds.',
                  'There is a fallback step that logs a failure message.',
                ],
                expectedStepTypes: ['http'],
                expectedStepCount: { min: 1, max: 3 },
                expectedMaxToolCalls: 6,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.workflow_set_yaml',
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
                  'Create a "Data Pipeline" workflow that fetches users from https://api.example.com/users, counts them, and logs the result. Should log start/end messages too. Manual trigger.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Data Pipeline".',
                  'The workflow has a manual trigger.',
                  'There is a console step that logs a start message.',
                  'There is an HTTP step that fetches user data.',
                  'There is a step that stores or captures the user count.',
                  'There is a final console step that logs the count of processed users.',
                  'The steps are in a logical order.',
                ],
                expectedStepTypes: ['console', 'http', 'data.set'],
                expectedStepCount: 4,
                expectedMaxToolCalls: 6,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.workflow_set_yaml',
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

evaluate.describe(
  'Elasticsearch workflow creation via natural language',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('creates a workflow with Elasticsearch search', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation-es: search',
          description: 'Evaluate the ability to create workflows with Elasticsearch search steps',
          examples: [
            {
              input: {
                instruction:
                  'Create an "Error Log Monitor" workflow that searches logs-* for errors and prints how many were found. Manual trigger.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Error Log Monitor".',
                  'The workflow has a manual trigger.',
                  'There is a step that searches the "logs-*" Elasticsearch index.',
                  'The search uses a term query filtering on level "error".',
                  'There is a console step that logs the number of hits.',
                ],
                expectedStepTypes: ['elasticsearch.search', 'console'],
                expectedStepCount: 2,
                expectedMaxToolCalls: 6,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.workflow_set_yaml',
                ],
              },
              metadata: { category: 'es-search-creation' },
            },
          ],
        },
      });
    });

    evaluate('creates a workflow with ES index management', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation-es: index-management',
          description:
            'Evaluate the ability to create workflows with Elasticsearch index management steps',
          examples: [
            {
              input: {
                instruction:
                  'Create an "Index Setup" workflow that creates an "app-data" index with fields for name, timestamp, and status if it doesn\'t already exist, then indexes a few sample documents. Manual trigger.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Index Setup".',
                  'The workflow has a manual trigger.',
                  'There is a step that checks whether the "app-data" index exists.',
                  'There is conditional logic that creates the index only when it does not exist.',
                  'The index creation step defines mappings for name, timestamp, and status.',
                  'There is a bulk indexing step that indexes multiple documents.',
                ],
                expectedStepTypes: [
                  'elasticsearch.indices.exists',
                  'elasticsearch.indices.create',
                  'elasticsearch.bulk',
                ],
                expectedStepCount: { min: 4, max: 6 },
                expectedMaxToolCalls: 8,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.workflow_set_yaml',
                ],
              },
              metadata: { category: 'es-index-management-creation' },
            },
          ],
        },
      });
    });

    evaluate('creates a workflow with ES|QL', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation-es: esql',
          description: 'Evaluate the ability to create workflows with ES|QL query steps',
          examples: [
            {
              input: {
                instruction:
                  'Create a "Host CPU Report" workflow that runs every 10 minutes, gets average CPU usage from metrics-* grouped by host name using ES|QL, and prints the top results to console',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Host CPU Report".',
                  'The workflow has a scheduled trigger set to every 10 minutes.',
                  'There is a step that runs an ES|QL query.',
                  'The ES|QL query references the metrics-* index.',
                  'The query aggregates CPU usage by host and sorts/limits the results.',
                  'There is a console step that logs the results.',
                ],
                expectedStepTypes: ['elasticsearch.esql.query', 'console'],
                expectedStepCount: 2,
                expectedMaxToolCalls: 6,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.workflow_set_yaml',
                ],
              },
              metadata: { category: 'esql-creation' },
            },
          ],
        },
      });
    });
  }
);

evaluate.describe(
  'Cases workflow creation via natural language',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('creates a workflow with case management', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation-cases: case-management',
          description:
            'Evaluate the ability to create workflows with case creation, comment addition, and case retrieval steps',
          examples: [
            {
              input: {
                instruction:
                  'Create an "Incident Response" workflow with manual trigger that creates a high severity security case, adds an initial comment saying investigation has started, and then fetches the case back with its comments',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Incident Response".',
                  'The workflow has a manual trigger.',
                  'There is a step that creates a case (using cases.createCase, kibana.createCase, kibana.createCaseDefaultSpace, or kibana.request) with title "Security Incident" and severity "high".',
                  'There is a step that adds a comment to the created case.',
                  'The comment step references the case ID from the case creation step output.',
                  'There is a step that retrieves the case with include_comments (for example using cases.getCase or kibana.request).',
                ],
                expectedStepTypes: [
                  'kibana.createCase|cases.createCase|kibana.createCaseDefaultSpace',
                  'cases.addComment',
                  'cases.getCase',
                ],
                expectedStepCount: { min: 2, max: 4 },
                expectedMaxToolCalls: 8,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.workflow_set_yaml',
                ],
              },
              metadata: { category: 'cases-creation' },
            },
          ],
        },
      });
    });

    evaluate(
      'creates a workflow combining ES and cases steps',
      async ({ evaluateCreateDataset }) => {
        await evaluateCreateDataset({
          dataset: {
            name: 'workflow-creation-cases: es-and-cases',
            description:
              'Evaluate the ability to create workflows that combine Elasticsearch search with case creation',
            examples: [
              {
                input: {
                  instruction:
                    'Create a workflow that finds critical security alerts and creates a security case for each one, using the alert\'s rule name as the case title. Call it "Alert Case Creator", manual trigger.',
                },
                output: {
                  criteria: [
                    'A new workflow was created with the name "Alert Case Creator".',
                    'The workflow has a manual trigger.',
                    'There is a step that searches the ".alerts-security.alerts-default" Elasticsearch index.',
                    'The search uses a term query on severity "critical".',
                    'There is a foreach loop iterating over the search hits.',
                    'Inside the loop, a step creates a case for each alert (using cases.createCase, kibana.createCase, kibana.createCaseDefaultSpace, or kibana.request).',
                    'The case title is derived from the alert data.',
                  ],
                  expectedStepTypes: [
                    'elasticsearch.search',
                    'kibana.createCase|cases.createCase|kibana.createCaseDefaultSpace',
                  ],
                  expectedStepCount: { min: 3, max: 5 },
                  expectedMaxToolCalls: 8,
                  expectedToolSequence: [
                    'platform.workflows.get_step_definitions',
                    'platform.workflows.workflow_set_yaml',
                  ],
                },
                metadata: { category: 'es-and-cases-creation' },
              },
            ],
          },
        });
      }
    );
  }
);

evaluate.describe(
  'Connector workflow creation via natural language',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('creates a Slack notification workflow', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation-connector: slack',
          description: 'Evaluate the ability to create workflows with Slack connector steps',
          examples: [
            {
              input: {
                instruction:
                  'Create an "API Status Notifier" workflow that checks https://api.example.com/status every 5 minutes and posts the result to Slack',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "API Status Notifier".',
                  'The workflow has a scheduled trigger set to every 5 minutes.',
                  'There is an HTTP step that fetches the status endpoint.',
                  'There is a slack step that sends a message.',
                  'The Slack message references data from the HTTP step output.',
                  'Connector steps include a connector-id field (either a real connector ID or a descriptive placeholder).',
                ],
                expectedStepTypes: ['http', 'slack'],
                expectedStepCount: 2,
                expectedMaxToolCalls: 6,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.get_connectors',
                  'platform.workflows.workflow_set_yaml',
                ],
              },
              metadata: { category: 'slack-creation' },
            },
          ],
        },
      });
    });

    evaluate('creates a multi-channel notification workflow', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation-connector: multi-channel',
          description: 'Evaluate the ability to create workflows with multiple connector steps',
          examples: [
            {
              input: {
                instruction:
                  'Create an "Alert Broadcaster" workflow with manual trigger that logs a message, sends a Slack alert, and also emails oncall@example.com about the critical alert',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Alert Broadcaster".',
                  'The workflow has a manual trigger.',
                  'There is a console step that logs a message.',
                  'There is a slack step that sends a notification message.',
                  'There is an email step that sends to "oncall@example.com".',
                  'The email has a subject related to alerts.',
                  'Connector steps include a connector-id field (either a real connector ID or a descriptive placeholder).',
                ],
                expectedStepTypes: ['console', 'slack', 'email'],
                expectedStepCount: 3,
                expectedMaxToolCalls: 8,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.get_connectors',
                  'platform.workflows.workflow_set_yaml',
                ],
              },
              metadata: { category: 'multi-channel-creation' },
            },
          ],
        },
      });
    });

    evaluate('creates a Jira ticket workflow', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation-connector: jira',
          description: 'Evaluate the ability to create workflows with Jira connector steps',
          examples: [
            {
              input: {
                instruction:
                  'Create a "Bug Reporter" workflow that searches for recent error logs in Elasticsearch and files a Jira ticket with the error details. Manual trigger.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Bug Reporter".',
                  'The workflow has a manual trigger.',
                  'There is a step that searches Elasticsearch for error logs.',
                  'There is a step that creates a Jira ticket.',
                  'The Jira ticket title references the error summary from the search results.',
                  'Connector steps include a connector-id field (either a real connector ID or a descriptive placeholder).',
                ],
                expectedStepTypes: [
                  'elasticsearch.search|elasticsearch.esql.query',
                  'jira|jira.pushToService',
                ],
                expectedStepCount: { min: 2, max: 4 },
                expectedMaxToolCalls: 8,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.get_connectors',
                  'platform.workflows.workflow_set_yaml',
                ],
              },
              metadata: { category: 'jira-creation' },
            },
          ],
        },
      });
    });

    evaluate('creates a PagerDuty incident workflow', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation-connector: pagerduty',
          description: 'Evaluate the ability to create workflows with PagerDuty connector steps',
          examples: [
            {
              input: {
                instruction:
                  'Create a "Critical Alert Pager" workflow that checks an API endpoint every minute and pages PagerDuty if the status is critical',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Critical Alert Pager".',
                  'The workflow has a scheduled trigger set to every minute.',
                  'There is a step that checks an API endpoint.',
                  'There is conditional logic that only triggers PagerDuty when the status is critical.',
                  'There is a PagerDuty step with severity "critical".',
                  'Connector steps include a connector-id field (either a real connector ID or a descriptive placeholder).',
                ],
                expectedStepTypes: ['http', 'pagerduty'],
                expectedStepCount: { min: 2, max: 4 },
                expectedMaxToolCalls: 8,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.get_connectors',
                  'platform.workflows.workflow_set_yaml',
                ],
              },
              metadata: { category: 'pagerduty-creation' },
            },
          ],
        },
      });
    });

    evaluate('creates a Teams notification workflow', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation-connector: teams',
          description:
            'Evaluate the ability to create workflows with Microsoft Teams connector steps',
          examples: [
            {
              input: {
                instruction:
                  'Create a "Deploy Notifier" workflow that sends a Teams message announcing a deployment with the timestamp. Manual trigger.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Deploy Notifier".',
                  'The workflow has a manual trigger.',
                  'There is a Teams step that sends a deployment announcement message.',
                  'The message includes the current timestamp or a time reference.',
                  'Connector steps include a connector-id field (either a real connector ID or a descriptive placeholder).',
                ],
                expectedStepTypes: ['teams'],
                expectedStepCount: { min: 1, max: 2 },
                expectedMaxToolCalls: 6,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.get_connectors',
                  'platform.workflows.workflow_set_yaml',
                ],
              },
              metadata: { category: 'teams-creation' },
            },
          ],
        },
      });
    });
  }
);

evaluate.describe(
  'Built-in step workflow creation via natural language',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('creates a workflow with a wait step', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation-builtin: wait',
          description: 'Evaluate the ability to create workflows with wait/delay steps',
          examples: [
            {
              input: {
                instruction:
                  'Create a "Delayed Cleanup" workflow that logs a start message, waits 30 seconds, then deletes the "temp-data" index. Manual trigger.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Delayed Cleanup".',
                  'The workflow has a manual trigger.',
                  'There is a console step that logs "Starting cleanup".',
                  'There is a wait step with a 30-second duration.',
                  'There is a step that deletes the "temp-data" Elasticsearch index.',
                  'The steps are in the correct order: log, wait, delete.',
                ],
                expectedStepTypes: ['console', 'wait'],
                expectedStepCount: { min: 3, max: 4 },
                expectedMaxToolCalls: 6,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.workflow_set_yaml',
                ],
              },
              metadata: { category: 'wait-creation' },
            },
          ],
        },
      });
    });

    evaluate(
      'creates a workflow with switch/branching logic',
      async ({ evaluateCreateDataset }) => {
        await evaluateCreateDataset({
          dataset: {
            name: 'workflow-creation-builtin: switch',
            description:
              'Evaluate the ability to create workflows with switch/branching based on input',
            examples: [
              {
                input: {
                  instruction:
                    'Create a "Priority Router" workflow that routes alerts by priority -- PagerDuty for critical, Slack for high, console log for low. Manual trigger.',
                },
                output: {
                  criteria: [
                    'A new workflow was created with the name "Priority Router".',
                    'The workflow has a manual trigger.',
                    'There is branching or routing logic based on a priority value.',
                    'The "critical" branch triggers a PagerDuty alert or notification.',
                    'The "high" branch sends a Slack message.',
                    'The "low" branch logs to console.',
                  ],
                  expectedStepTypes: ['console'],
                  expectedStepCount: { min: 4, max: 8 },
                  expectedMaxToolCalls: 8,
                  expectedToolSequence: [
                    'platform.workflows.get_step_definitions',
                    'platform.workflows.get_connectors',
                    'platform.workflows.workflow_set_yaml',
                  ],
                },
                metadata: { category: 'switch-creation' },
              },
            ],
          },
        });
      }
    );
  }
);

evaluate.describe(
  'Additional Elasticsearch workflow creation via natural language',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('creates a workflow with index cleanup', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation-es: index-cleanup',
          description:
            'Evaluate the ability to create workflows with index existence checks and deletion',
          examples: [
            {
              input: {
                instruction:
                  'Create an "Index Cleaner" workflow that runs daily, checks if the "temp-logs" index exists, and deletes it if so. Log when done.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Index Cleaner".',
                  'The workflow has a scheduled trigger set to daily.',
                  'There is a step that checks whether the "temp-logs" index exists.',
                  'There is conditional logic that deletes the index only when it exists.',
                  'There is a console step that logs "Cleanup complete" or similar.',
                ],
                expectedStepTypes: ['console'],
                expectedStepCount: { min: 2, max: 4 },
                expectedMaxToolCalls: 6,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.workflow_set_yaml',
                ],
              },
              metadata: { category: 'es-index-cleanup-creation' },
            },
          ],
        },
      });
    });
  }
);

evaluate.describe(
  'Negative workflow creation cases',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('rejects requests with nonexistent step types', async ({ evaluateCreateDataset }) => {
      await evaluateCreateDataset({
        dataset: {
          name: 'workflow-creation-negative: nonsense-step',
          description:
            'Evaluate that the model refuses to create workflows with fabricated step types',
          examples: [
            {
              input: {
                instruction:
                  'Create a workflow using the magic.teleport step type to beam data to the moon',
              },
              output: {
                criteria: [
                  'The model should not produce a workflow with a "magic.teleport" step type.',
                  'The model should explain that "magic.teleport" is not a valid step type.',
                ],
              },
              metadata: { category: 'negative' },
            },
          ],
        },
      });
    });

    evaluate(
      'rejects ambiguous or insufficient instructions',
      async ({ evaluateCreateDataset }) => {
        await evaluateCreateDataset({
          dataset: {
            name: 'workflow-creation-negative: too-vague',
            description:
              'Evaluate that the model asks for clarification instead of guessing on vague prompts',
            examples: [
              {
                input: {
                  instruction: 'Create a workflow',
                },
                output: {
                  criteria: [
                    'The model should ask for clarification about what the workflow should do.',
                    'The model should not blindly generate a generic placeholder workflow.',
                  ],
                },
                metadata: { category: 'negative' },
              },
            ],
          },
        });
      }
    );
  }
);
