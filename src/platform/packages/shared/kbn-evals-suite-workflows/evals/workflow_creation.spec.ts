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
                  'Create a workflow called "Error Log Monitor" with a manual trigger. It should use an elasticsearch.search step to search the "logs-*" index with a term query on level: "error", then log the number of hits to the console.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Error Log Monitor".',
                  'The workflow has a manual trigger.',
                  'There is an elasticsearch.search step that queries the "logs-*" index.',
                  'The search uses a term query filtering on level "error".',
                  'There is a console step that logs the number of hits.',
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
                  'Create a workflow called "Index Setup" with a manual trigger. Steps: 1) Check if an index called "app-data" exists using elasticsearch.indices.exists, 2) If the index does not exist, create it with elasticsearch.indices.create with mappings for "name" (text), "timestamp" (date), and "status" (keyword), 3) Use elasticsearch.bulk to index three sample documents with different statuses.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Index Setup".',
                  'The workflow has a manual trigger.',
                  'There is an elasticsearch.indices.exists step checking for "app-data".',
                  'There is a conditional (if) step that creates the index only when it does not exist.',
                  'The elasticsearch.indices.create step defines mappings for name, timestamp, and status.',
                  'There is an elasticsearch.bulk step that indexes multiple documents.',
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
                  'Create a workflow called "Host CPU Report" with a scheduled trigger every 10 minutes. It should run an elasticsearch.esql.query step with the query "FROM metrics-* | STATS avg_cpu = AVG(system.cpu.total.pct) BY host.name | SORT avg_cpu DESC | LIMIT 10", then log the results to the console.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Host CPU Report".',
                  'The workflow has a scheduled trigger set to every 10 minutes.',
                  'There is an elasticsearch.esql.query step.',
                  'The ES|QL query references the metrics-* index.',
                  'The query aggregates CPU usage by host and sorts/limits the results.',
                  'There is a console step that logs the results.',
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
            'Evaluate the ability to create workflows with cases.createCase, cases.addComment, and cases.getCase steps',
          examples: [
            {
              input: {
                instruction:
                  'Create a workflow called "Incident Response" with a manual trigger. Steps: 1) Create a security case using cases.createCase with title "Security Incident", description "Automated incident case", severity "high", and owner "securitySolution", 2) Add a comment "Investigation initiated" to the case using cases.addComment, 3) Retrieve the case with comments using cases.getCase with include_comments set to true.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Incident Response".',
                  'The workflow has a manual trigger.',
                  'There is a cases.createCase step with title "Security Incident" and severity "high".',
                  'There is a cases.addComment step that adds a comment to the created case.',
                  'The addComment step references the case ID from the createCase step output.',
                  'There is a cases.getCase step with include_comments set to true.',
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
                    'Create a workflow called "Alert Case Creator" with a manual trigger. Steps: 1) Use elasticsearch.search to find critical alerts in the ".alerts-security.alerts-default" index with a term query on kibana.alert.severity: "critical", 2) Use a foreach loop over the search hits, and inside the loop create a case for each alert using cases.createCase with the alert\'s rule name as the case title, owner "securitySolution", and severity "critical".',
                },
                output: {
                  criteria: [
                    'A new workflow was created with the name "Alert Case Creator".',
                    'The workflow has a manual trigger.',
                    'There is an elasticsearch.search step querying ".alerts-security.alerts-default".',
                    'The search uses a term query on severity "critical".',
                    'There is a foreach loop iterating over the search hits.',
                    'Inside the loop, a cases.createCase step creates a case for each alert.',
                    'The case title is derived from the alert data.',
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
                  'Create a workflow called "API Status Notifier" with a scheduled trigger every 5 minutes. It should make an HTTP GET request to https://api.example.com/status, then send a Slack message with the response status using a slack step.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "API Status Notifier".',
                  'The workflow has a scheduled trigger set to every 5 minutes.',
                  'There is an HTTP step that fetches the status endpoint.',
                  'There is a slack step that sends a message.',
                  'The Slack message references data from the HTTP step output.',
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
                  'Create a workflow called "Alert Broadcaster" with a manual trigger. Steps: 1) Log "Broadcasting alert", 2) Send a Slack message "Critical alert detected" using a slack step, 3) Send an email to "oncall@example.com" with subject "Critical Alert" and message "A critical alert was detected, please investigate" using an email step.',
              },
              output: {
                criteria: [
                  'A new workflow was created with the name "Alert Broadcaster".',
                  'The workflow has a manual trigger.',
                  'There is a console step that logs a message.',
                  'There is a slack step that sends a notification message.',
                  'There is an email step that sends to "oncall@example.com".',
                  'The email has a subject related to alerts.',
                ],
              },
              metadata: { category: 'multi-channel-creation' },
            },
          ],
        },
      });
    });
  }
);
