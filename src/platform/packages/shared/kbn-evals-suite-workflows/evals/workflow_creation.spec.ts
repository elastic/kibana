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
  createStructuralCorrectnessEvaluator,
  createEfficiencyEvaluator,
  extractResultYaml,
  extractYamlFromAttachments,
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
              };
            },
          },
          selectEvaluators<WorkflowCreateExample, WorkflowTaskOutput>([
            createNoErrorsEvaluator(),
            createEditSuccessEvaluator(),
            createValidationPassEvaluator(),
            createStructuralCorrectnessEvaluator(),
            createEfficiencyEvaluator(),
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
                expectedStepCount: { min: 1, max: 2 },
                expectedStepTypes: ['http'],
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
                expectedStepCount: 1,
                expectedStepTypes: ['console'],
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
                  'Create a workflow called "Conditional Router" with a manual trigger. It should call https://api.example.com/status, then check if the response status is "healthy" -- if so, log "System OK", otherwise log "System degraded".',
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
                  'Create a workflow called "Batch Processor" that triggers manually. It should define a list of items ["item1", "item2", "item3"] and then loop over them, logging each one to the console.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Batch Processor".',
                  'The workflow has a manual trigger.',
                  'There is a step that defines or stores a list of items.',
                  'There is a loop that iterates over the items.',
                  'Inside the loop, each item is logged to the console.',
                ],
                expectedStepTypes: ['data.set', 'console'],
                expectedStepCount: { min: 3, max: 4 },
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
                expectedStepTypes: ['http'],
                expectedStepCount: { min: 1, max: 3 },
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
                  'Create a workflow called "Data Pipeline" with a manual trigger. Steps: 1) Log "Starting pipeline", 2) HTTP GET to https://api.example.com/users to fetch user data, 3) Store the number of users returned, 4) Log "Processed {user_count} users" at the end.',
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
                  'Create a workflow called "Error Log Monitor" with a manual trigger. It should search the "logs-*" Elasticsearch index for entries where level is "error", then log the number of hits to the console.',
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
                  'Create a workflow called "Index Setup" with a manual trigger. Steps: 1) Check if an Elasticsearch index called "app-data" exists, 2) If it does not exist, create it with mappings for "name" (text), "timestamp" (date), and "status" (keyword), 3) Bulk-index three sample documents with different statuses.',
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
                  'Create a workflow called "Host CPU Report" with a scheduled trigger every 10 minutes. It should run the ES|QL query "FROM metrics-* | STATS avg_cpu = AVG(system.cpu.total.pct) BY host.name | SORT avg_cpu DESC | LIMIT 10", then log the results to the console.',
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
                  'Create a workflow called "Incident Response" with a manual trigger. Steps: 1) Create a security case with title "Security Incident", description "Automated incident case", severity "high", and owner "securitySolution", 2) Add a comment "Investigation initiated" to the case, 3) Retrieve the case with comments using include_comments set to true.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Incident Response".',
                  'The workflow has a manual trigger.',
                  'There is a step that creates a case (using kibana.createCase, kibana.createCaseDefaultSpace, or kibana.request) with title "Security Incident" and severity "high".',
                  'There is a step that adds a comment to the created case.',
                  'The comment step references the case ID from the case creation step output.',
                  'There is a step that retrieves the case with include_comments.',
                ],
                expectedStepTypes: [
                  'kibana.createCase|cases.createCase|kibana.createCaseDefaultSpace',
                ],
                expectedStepCount: { min: 2, max: 4 },
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
                    'Create a workflow called "Alert Case Creator" with a manual trigger. Steps: 1) Search for critical alerts in the ".alerts-security.alerts-default" Elasticsearch index where kibana.alert.severity is "critical", 2) Loop over the search hits and create a case for each alert using the alert\'s rule name as the case title, owner "securitySolution", and severity "critical".',
                },
                output: {
                  criteria: [
                    'A new workflow was created with the name "Alert Case Creator".',
                    'The workflow has a manual trigger.',
                    'There is a step that searches the ".alerts-security.alerts-default" Elasticsearch index.',
                    'The search uses a term query on severity "critical".',
                    'There is a foreach loop iterating over the search hits.',
                    'Inside the loop, a step creates a case for each alert (using kibana.createCase, kibana.createCaseDefaultSpace, or kibana.request).',
                    'The case title is derived from the alert data.',
                  ],
                  expectedStepTypes: [
                    'elasticsearch.search',
                    'kibana.createCase|cases.createCase|kibana.createCaseDefaultSpace',
                  ],
                  expectedStepCount: { min: 3, max: 5 },
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
                  'Create a workflow called "API Status Notifier" with a scheduled trigger every 5 minutes. It should make an HTTP GET request to https://api.example.com/status, then send a Slack message with the response status.',
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
                  'Create a workflow called "Alert Broadcaster" with a manual trigger. Steps: 1) Log "Broadcasting alert", 2) Send a Slack message "Critical alert detected", 3) Send an email to "oncall@example.com" with subject "Critical Alert" and message "A critical alert was detected, please investigate".',
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
                  'Create a workflow called "Bug Reporter" with a manual trigger. It should search Elasticsearch for error logs in the last hour, then create a Jira ticket with the error summary as the title and the log details in the description.',
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
                expectedStepTypes: ['elasticsearch.search|elasticsearch.esql.query', 'jira'],
                expectedStepCount: { min: 2, max: 4 },
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
                  'Create a workflow called "Critical Alert Pager" that runs every minute. It should check an API endpoint for critical status, and if the status is critical, trigger a PagerDuty alert with severity "critical" and a summary of the issue.',
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
                  'Create a workflow called "Deploy Notifier" with a manual trigger. It should send a Microsoft Teams message announcing a deployment with the current timestamp.',
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
                  'Create a workflow called "Delayed Cleanup" with a manual trigger. It should log "Starting cleanup", wait 30 seconds, then delete an Elasticsearch index called "temp-data".',
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
                    'Create a workflow called "Priority Router" with a manual trigger. It should route to different actions based on a priority level: for "critical" send a PagerDuty alert, for "high" send a Slack message, for "low" just log to console.',
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
                  'Create a workflow called "Index Cleaner" that runs once a day. It should check if an Elasticsearch index called "temp-logs" exists, and if so, delete it and log "Cleanup complete".',
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
              },
              metadata: { category: 'es-index-cleanup-creation' },
            },
          ],
        },
      });
    });
  }
);
