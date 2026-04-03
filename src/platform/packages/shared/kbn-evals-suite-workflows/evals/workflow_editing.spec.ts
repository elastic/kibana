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
  createStructuralCorrectnessEvaluator,
  createEditPreservationEvaluator,
  createEfficiencyEvaluator,
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
          selectEvaluators<WorkflowEditExample, WorkflowTaskOutput>([
            createNoErrorsEvaluator(),
            createEditSuccessEvaluator(),
            createValidationPassEvaluator(),
            createToolUsageEvaluator(),
            createStructuralCorrectnessEvaluator(),
            createEditPreservationEvaluator(),
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
                expectedStepCount: { min: 4, max: 4 },
                preservedStepNames: ['log_start', 'fetch_data', 'log_end'],
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
                expectedStepCount: { min: 4, max: 4 },
                expectedStepTypes: ['elasticsearch.search'],
                preservedStepNames: ['log_start', 'fetch_data', 'log_end'],
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
                expectedStepCount: 3,
                preservedStepNames: ['log_start', 'log_end'],
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
                expectedStepCount: 2,
                expectedStepNames: ['log_start', 'fetch_data'],
                preservedStepNames: ['log_start', 'fetch_data'],
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
                expectedStepCount: 3,
                preservedStepNames: ['log_start', 'fetch_data', 'log_end'],
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
                expectedStepCount: 2,
                expectedStepNames: ['log_start', 'fetch_data'],
                preservedStepNames: ['log_start'],
              },
              metadata: { category: 'multi-step' },
            },
          ],
        },
      });
    });
  }
);

const esBaseWorkflowYaml = `name: Data Indexing Pipeline
description: Indexes and searches data in Elasticsearch
enabled: true
triggers:
  - type: manual
steps:
  - name: create_index
    type: elasticsearch.indices.create
    with:
      index: "my-data-index"
      mappings:
        properties:
          name: { type: text }
          status: { type: keyword }
  - name: index_document
    type: elasticsearch.index
    with:
      index: "my-data-index"
      document:
        name: "Test Document"
        status: "active"
  - name: search_data
    type: elasticsearch.search
    with:
      index: "my-data-index"
      query:
        match_all: {}
  - name: log_results
    type: console
    with:
      message: "Found {{ steps.search_data.output.hits.total.value }} documents"
`;

evaluate.describe(
  'Elasticsearch workflow editing via natural language',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('modifies an Elasticsearch step', async ({ evaluateEditDataset }) => {
      await evaluateEditDataset({
        dataset: {
          name: 'workflow-editing-es: modify-step',
          description: 'Evaluate the ability to modify Elasticsearch-specific workflow steps',
          examples: [
            {
              input: {
                instruction:
                  'Change the search_data step to use a term query filtering on status: "active" instead of match_all.',
                initialYaml: esBaseWorkflowYaml,
              },
              output: {
                criteria: [
                  'The search_data step query was changed from match_all to a term query.',
                  'The term query filters on the status field with value "active".',
                ],
                expectedStepCount: 4,
                preservedStepNames: ['create_index', 'index_document', 'log_results'],
              },
              metadata: { category: 'modify-es-step' },
            },
          ],
        },
      });
    });

    evaluate('inserts an Elasticsearch step', async ({ evaluateEditDataset }) => {
      await evaluateEditDataset({
        dataset: {
          name: 'workflow-editing-es: insert-step',
          description: 'Evaluate the ability to insert Elasticsearch-specific steps',
          examples: [
            {
              input: {
                instruction:
                  'Add an ES|QL query step after the search_data step that runs "FROM my-data-index | WHERE status == \\"active\\" | STATS count = COUNT(*)" and logs the count.',
                initialYaml: esBaseWorkflowYaml,
              },
              output: {
                criteria: [
                  'A new ES|QL query step was added after search_data.',
                  'The ES|QL query references the my-data-index index.',
                  'The query filters or aggregates data.',
                ],
                expectedToolIds: ['platform.workflows.workflow_insert_step'],
                expectedStepCount: { min: 5, max: 6 },
                expectedStepTypes: ['elasticsearch.esql.query'],
                preservedStepNames: [
                  'create_index',
                  'index_document',
                  'search_data',
                  'log_results',
                ],
              },
              metadata: { category: 'insert-es-step' },
            },
          ],
        },
      });
    });

    evaluate('performs multi-step ES edits', async ({ evaluateEditDataset }) => {
      await evaluateEditDataset({
        dataset: {
          name: 'workflow-editing-es: multi-step-edits',
          description:
            'Evaluate the ability to perform multiple Elasticsearch-related edits at once',
          examples: [
            {
              input: {
                instruction:
                  'Change the index name from "my-data-index" to "production-data" in all steps, add an index existence check before create_index, and wrap the create_index step in a condition that only runs when the index does not exist.',
                initialYaml: esBaseWorkflowYaml,
              },
              output: {
                criteria: [
                  'All references to "my-data-index" were changed to "production-data".',
                  'A step that checks index existence was added before create_index.',
                  'Conditional logic ensures the index is created only when it does not already exist.',
                ],
                expectedStepTypes: ['elasticsearch.indices.exists'],
                expectedStepCount: { min: 5, max: 7 },
              },
              metadata: { category: 'multi-step-es' },
            },
          ],
        },
      });
    });
  }
);

const casesBaseWorkflowYaml = `name: Case Manager
description: Creates and manages cases
enabled: true
triggers:
  - type: manual
steps:
  - name: create_case
    type: cases.createCase
    with:
      title: "New Alert Case"
      description: "Auto-generated case for alert triage"
      severity: low
      owner: securitySolution
      tags:
        - automated
  - name: log_case_id
    type: console
    with:
      message: "Created case: {{ steps.create_case.output.case.id }}"
`;

evaluate.describe(
  'Cases workflow editing via natural language',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('modifies a cases step', async ({ evaluateEditDataset }) => {
      await evaluateEditDataset({
        dataset: {
          name: 'workflow-editing-cases: modify-step',
          description: 'Evaluate the ability to modify cases workflow steps',
          examples: [
            {
              input: {
                instruction: 'Change the severity of the create_case step from "low" to "high".',
                initialYaml: casesBaseWorkflowYaml,
              },
              output: {
                criteria: [
                  'The create_case step severity was changed from "low" to "high".',
                  'All other create_case properties remain unchanged.',
                ],
                expectedStepCount: 2,
                preservedStepNames: ['log_case_id'],
              },
              metadata: { category: 'modify-cases-step' },
            },
          ],
        },
      });
    });

    evaluate('inserts a cases step', async ({ evaluateEditDataset }) => {
      await evaluateEditDataset({
        dataset: {
          name: 'workflow-editing-cases: insert-step',
          description: 'Evaluate the ability to insert cases-specific steps',
          examples: [
            {
              input: {
                instruction:
                  'Add a step after create_case that adds the comment "Initial triage started" to the newly created case.',
                initialYaml: casesBaseWorkflowYaml,
              },
              output: {
                criteria: [
                  'A step that adds a comment was added after create_case.',
                  'The step references the created case ID from the previous step output.',
                  'The comment text is "Initial triage started" or similar.',
                ],
                expectedToolIds: ['platform.workflows.workflow_insert_step'],
                expectedStepCount: 3,
                expectedStepTypes: ['cases.addComment|kibana.addCaseComment|kibana.request'],
                preservedStepNames: ['create_case', 'log_case_id'],
              },
              metadata: { category: 'insert-cases-step' },
            },
          ],
        },
      });
    });

    evaluate('performs multi-step cases edits', async ({ evaluateEditDataset }) => {
      await evaluateEditDataset({
        dataset: {
          name: 'workflow-editing-cases: multi-step-edits',
          description: 'Evaluate the ability to perform multiple cases-related edits at once',
          examples: [
            {
              input: {
                instruction:
                  'Add a loop after create_case that iterates over a list of comments ["Triage started", "Investigating root cause", "Escalated to team lead"] and adds each as a comment to the case. Then add a step at the end that updates the case title to "Triaged: {{ steps.create_case.output.case.title }}".',
                initialYaml: casesBaseWorkflowYaml,
              },
              output: {
                criteria: [
                  'A foreach loop was added that iterates over a list of comments.',
                  'Inside the loop, a step adds each comment to the case.',
                  'A step that updates the case was added at the end.',
                  'The update step changes the case title.',
                ],
                expectedStepTypes: [
                  'cases.addComment|kibana.addCaseComment|kibana.request',
                  'cases.updateCase|kibana.updateCase|kibana.request',
                ],
                expectedStepCount: { min: 5, max: 7 },
                preservedStepNames: ['create_case'],
              },
              metadata: { category: 'multi-step-cases' },
            },
          ],
        },
      });
    });
  }
);

const connectorBaseWorkflowYaml = `name: Alert Notifier
description: Sends notifications when alerts are detected
enabled: true
triggers:
  - type: manual
steps:
  - name: fetch_alerts
    type: http
    with:
      method: GET
      url: "https://api.example.com/alerts"
  - name: notify_slack
    type: slack
    connector-id: my-slack-connector
    with:
      message: "New alert detected"
  - name: log_done
    type: console
    with:
      message: "Notification sent"
`;

evaluate.describe(
  'Connector workflow editing via natural language',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('modifies a connector step', async ({ evaluateEditDataset }) => {
      await evaluateEditDataset({
        dataset: {
          name: 'workflow-editing-connector: modify-step',
          description: 'Evaluate the ability to modify connector workflow steps',
          examples: [
            {
              input: {
                instruction:
                  'Update the notify_slack step message to include the alert count from the previous step: "Detected {{ steps.fetch_alerts.output.total }} new alerts".',
                initialYaml: connectorBaseWorkflowYaml,
              },
              output: {
                criteria: [
                  'The notify_slack step message was updated.',
                  'The new message references data from the fetch_alerts step output.',
                ],
                expectedStepCount: 3,
                preservedStepNames: ['fetch_alerts', 'log_done'],
              },
              metadata: { category: 'modify-connector-step' },
            },
          ],
        },
      });
    });

    evaluate('inserts a connector step', async ({ evaluateEditDataset }) => {
      await evaluateEditDataset({
        dataset: {
          name: 'workflow-editing-connector: insert-step',
          description: 'Evaluate the ability to insert connector steps',
          examples: [
            {
              input: {
                instruction:
                  'Add an email step after the notify_slack step that sends an email to "oncall@example.com" with subject "Alert Summary" and the message body "{{ steps.fetch_alerts.output.total }} alerts detected".',
                initialYaml: connectorBaseWorkflowYaml,
              },
              output: {
                criteria: [
                  'An email step was added after the notify_slack step.',
                  'The email is sent to "oncall@example.com".',
                  'The email has a subject of "Alert Summary" or similar.',
                  'The message body references the alert data from a previous step.',
                  'Connector steps include a connector-id field (either a real connector ID or a descriptive placeholder).',
                ],
                expectedToolIds: ['platform.workflows.workflow_insert_step'],
                expectedStepCount: 4,
                preservedStepNames: ['fetch_alerts', 'notify_slack', 'log_done'],
              },
              metadata: { category: 'insert-connector-step' },
            },
          ],
        },
      });
    });

    evaluate('replaces a connector step', async ({ evaluateEditDataset }) => {
      await evaluateEditDataset({
        dataset: {
          name: 'workflow-editing-connector: replace-step',
          description: 'Evaluate the ability to replace one connector step with another',
          examples: [
            {
              input: {
                instruction:
                  'Replace the notify_slack step with an email step that sends an email to "alerts@example.com" with subject "New Alerts" and the same message content.',
                initialYaml: connectorBaseWorkflowYaml,
              },
              output: {
                criteria: [
                  'The notify_slack (slack) step was replaced with an email step.',
                  'The email is sent to "alerts@example.com".',
                  'The email subject is "New Alerts" or similar.',
                  'The notification message content is preserved.',
                  'Connector steps include a connector-id field (either a real connector ID or a descriptive placeholder).',
                ],
                expectedStepCount: 3,
                preservedStepNames: ['fetch_alerts', 'log_done'],
              },
              metadata: { category: 'replace-connector-step' },
            },
          ],
        },
      });
    });
  }
);
