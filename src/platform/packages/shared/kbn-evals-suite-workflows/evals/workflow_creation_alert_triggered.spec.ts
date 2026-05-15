/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Alert / detection-rule trigger coverage.
 *
 * The existing suite has 0% coverage for alert-triggered workflows, yet
 * SOC/alert-driven is the #1 production use case. These examples target
 * the trigger-specific patterns specifically:
 *
 *   - `triggers: [{ type: alert }]` and `triggers: [{ type: detection-rule }]`
 *   - `{{event.alerts}}` / `{{event.alerts[0].*}}` Liquid references
 *   - foreach over alert batches
 *   - conditional routing based on alert severity fields
 *
 * Complexity is kept moderate (3–10 steps) — the high-step-count alert
 * workflows live in workflow_creation_long.spec.ts. These prove the trigger
 * type and event-field access patterns are generated correctly.
 *
 * Per security-team#17191.
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
  createLiquidCorrectnessEvaluator,
  createEfficiencyEvaluator,
  createToolTrajectoryEvaluator,
  createLatencyEvaluator,
  skipCompositeMode,
  skipInfraErrors,
  skipNegativeCases,
  extractResultYaml,
  extractYamlFromAttachments,
} from '../src/evaluators';

const skip = <E extends WorkflowCreateExample>(e: Parameters<typeof skipInfraErrors<E>>[0]) =>
  skipInfraErrors(skipNegativeCases(e));

const liquid = skipInfraErrors(skipNegativeCases(createLiquidCorrectnessEvaluator()));

const evaluate = base.extend<
  {
    evaluateAlertCreateDataset: (opts: {
      dataset: EvaluationDataset<WorkflowCreateExample>;
    }) => Promise<void>;
  },
  {}
>({
  evaluateAlertCreateDataset: [
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
            skip(skipCompositeMode(createEditSuccessEvaluator())),
            skip(createValidationPassEvaluator()),
            skip(createStructuralCorrectnessEvaluator()),
            liquid,
            skip(skipCompositeMode(createEfficiencyEvaluator())),
            skip(skipCompositeMode(createToolTrajectoryEvaluator())),
            skip(createLatencyEvaluator()),
            skipInfraErrors(createCriteriaEvaluator({ evaluators })),
          ])
        );
      });
    },
    { scope: 'test' },
  ],
});

// ---------------------------------------------------------------------------
// alert trigger
// ---------------------------------------------------------------------------

evaluate.describe(
  'Alert-triggered workflow creation',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('creates a simple alert-to-case workflow', async ({ evaluateAlertCreateDataset }) => {
      await evaluateAlertCreateDataset({
        dataset: {
          name: 'workflow-creation-alert: simple-case',
          description:
            'Evaluate creation of a minimal alert-triggered workflow that opens a security case',
          examples: [
            {
              input: {
                instruction:
                  'Create a workflow that fires on every security alert and opens a case in Security with the alert rule name as the title and the alert severity in the description. Name it "Alert Case Creator".',
              },
              output: {
                criteria: [
                  'The workflow is named "Alert Case Creator".',
                  'The trigger type is "alert".',
                  'A case creation step is present (cases.createCase, kibana.createCase, or kibana.request).',
                  'The case title references the alert rule name via a Liquid expression (e.g. event.alerts[0].kibana.alert.rule.name or foreach.item.rule.name).',
                  'The case description or body references the alert severity via a Liquid expression.',
                ],
                expectedStepCount: { min: 1, max: 3 },
                expectedStepTypes: ['kibana.createCase|cases.createCase|kibana.request'],
                expectedMaxToolCalls: 6,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.workflow_set_yaml',
                ],
                expectedLiquidChains: [{ ref: 'event.alerts', resolvesTo: 'event-field' }],
              },
              metadata: { category: 'alert-trigger-creation' },
            },
          ],
        },
      });
    });

    evaluate(
      'creates an alert workflow that loops over the alert batch',
      async ({ evaluateAlertCreateDataset }) => {
        await evaluateAlertCreateDataset({
          dataset: {
            name: 'workflow-creation-alert: foreach-alerts',
            description:
              'Evaluate creation of an alert workflow that iterates over all alerts in the batch',
            examples: [
              {
                input: {
                  instruction:
                    'I need a workflow triggered by alerts that processes each alert individually. For each alert, log its rule name and severity to the console. Name it "Alert Batch Logger".',
                },
                output: {
                  criteria: [
                    'The workflow is named "Alert Batch Logger".',
                    'The trigger type is "alert".',
                    'There is a foreach step that iterates over event.alerts or a Liquid equivalent.',
                    'Inside the foreach, a console step logs the rule name and severity of each alert using Liquid references to foreach.item.',
                  ],
                  expectedStepCount: { min: 2, max: 4 },
                  expectedStepTypes: ['foreach', 'console'],
                  expectedMaxToolCalls: 6,
                  expectedToolSequence: [
                    'platform.workflows.get_step_definitions',
                    'platform.workflows.workflow_set_yaml',
                  ],
                  expectedLiquidChains: [
                    { ref: 'event.alerts', resolvesTo: 'event-field' },
                    { ref: 'foreach.item', resolvesTo: 'foreach-item' },
                  ],
                },
                metadata: { category: 'alert-trigger-creation' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'creates an alert workflow with severity-based conditional routing',
      async ({ evaluateAlertCreateDataset }) => {
        await evaluateAlertCreateDataset({
          dataset: {
            name: 'workflow-creation-alert: severity-routing',
            description:
              'Evaluate creation of an alert workflow that routes to different actions based on severity',
            examples: [
              {
                input: {
                  instruction:
                    'Create a "Severity Router" workflow that triggers on security alerts. For critical or high severity alerts, page the on-call team via PagerDuty. For medium alerts, just send a Slack message. Low severity alerts should be ignored. Use the alert severity from the trigger data.',
                },
                output: {
                  criteria: [
                    'The workflow is named "Severity Router".',
                    'The trigger type is "alert".',
                    'There is at least one conditional (if) step that checks the alert severity.',
                    'A PagerDuty step is present and only reachable for critical or high severity alerts.',
                    'A Slack step is present and only reachable for medium severity alerts.',
                    'The severity condition references a Liquid expression from the event data (e.g. event.alerts[0].kibana.alert.severity).',
                    'Connector steps include a connector-id field.',
                  ],
                  expectedStepCount: { min: 3, max: 7 },
                  expectedStepTypes: ['if', 'pagerduty', 'slack'],
                  expectedMaxToolCalls: 8,
                  expectedToolSequence: [
                    'platform.workflows.get_step_definitions',
                    'platform.workflows.get_connectors',
                    'platform.workflows.workflow_set_yaml',
                  ],
                  expectedLiquidChains: [{ ref: 'event.alerts', resolvesTo: 'event-field' }],
                },
                metadata: { category: 'alert-trigger-creation' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'creates an alert workflow with per-alert ES enrichment',
      async ({ evaluateAlertCreateDataset }) => {
        await evaluateAlertCreateDataset({
          dataset: {
            name: 'workflow-creation-alert: per-alert-enrichment',
            description:
              'Evaluate creation of an alert workflow that enriches each alert with an Elasticsearch lookup',
            examples: [
              {
                input: {
                  instruction:
                    'Build an "Alert Enricher" workflow triggered by alerts. For each alert that comes in, look up the full alert document from the .alerts-security.alerts-default index using the alert ID, then log the rule name and the matched host name from the enrichment result.',
                },
                output: {
                  criteria: [
                    'The workflow is named "Alert Enricher".',
                    'The trigger type is "alert".',
                    'There is a foreach step iterating over the alert batch.',
                    'Inside the foreach, an Elasticsearch search step queries .alerts-security.alerts-default using the alert ID from foreach.item.',
                    'A console step logs the rule name and host name, referencing the Elasticsearch search output via Liquid.',
                  ],
                  expectedStepCount: { min: 3, max: 6 },
                  expectedStepTypes: ['foreach', 'elasticsearch.search', 'console'],
                  expectedMaxToolCalls: 8,
                  expectedToolSequence: [
                    'platform.workflows.get_step_definitions',
                    'platform.workflows.workflow_set_yaml',
                  ],
                  expectedLiquidChains: [
                    { ref: 'event.alerts', resolvesTo: 'event-field' },
                    { ref: 'foreach.item', resolvesTo: 'foreach-item' },
                  ],
                },
                metadata: { category: 'alert-trigger-creation' },
              },
            ],
          },
        });
      }
    );
  }
);

// ---------------------------------------------------------------------------
// detection-rule trigger
// ---------------------------------------------------------------------------

evaluate.describe(
  'Detection-rule-triggered workflow creation',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate(
      'creates a workflow triggered by a detection rule',
      async ({ evaluateAlertCreateDataset }) => {
        await evaluateAlertCreateDataset({
          dataset: {
            name: 'workflow-creation-detection-rule: notify',
            description: 'Evaluate creation of a workflow using the detection-rule trigger type',
            examples: [
              {
                input: {
                  instruction:
                    'Create a "Detection Rule Notifier" workflow that fires when a detection rule triggers. It should post a Slack message with the rule name and the list of affected host names from the alert data.',
                },
                output: {
                  criteria: [
                    'The workflow is named "Detection Rule Notifier".',
                    'The trigger type is "detection-rule" or "alert" (either is acceptable for detection-rule-fired alerts).',
                    'A Slack step is present that sends a notification.',
                    'The Slack message references the rule name from the trigger event via Liquid.',
                    'The Slack message references affected hosts from the alert data via Liquid.',
                    'Connector steps include a connector-id field.',
                  ],
                  expectedStepCount: { min: 1, max: 4 },
                  expectedStepTypes: ['slack'],
                  expectedMaxToolCalls: 6,
                  expectedToolSequence: [
                    'platform.workflows.get_step_definitions',
                    'platform.workflows.get_connectors',
                    'platform.workflows.workflow_set_yaml',
                  ],
                  expectedLiquidChains: [{ ref: 'event.alerts', resolvesTo: 'event-field' }],
                },
                metadata: { category: 'detection-rule-trigger-creation' },
              },
            ],
          },
        });
      }
    );
  }
);
