/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Long-workflow creation evals (10–20+ steps).
 *
 * The current suite caps at 4 steps — far short of production workflows
 * (automated_triaging.yaml is ~15 steps; infosec_demo.yaml is 1,556 lines).
 * These examples exercise from-scratch generation at realistic scale.
 *
 * Prompts are written in production-realistic phrasing (how a SOC analyst or
 * platform engineer would actually ask), not pre-decomposed step lists.
 * This makes them genuinely stretching, not just longer versions of easy cases.
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
  createLatencyEvaluator,
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
    evaluateLongCreateDataset: (opts: {
      dataset: EvaluationDataset<WorkflowCreateExample>;
    }) => Promise<void>;
  },
  {}
>({
  evaluateLongCreateDataset: [
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
            liquid,
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
  'Long workflow creation — alert-triggered SOC workflows',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate(
      'creates a full attack-discovery triage workflow',
      async ({ evaluateLongCreateDataset }) => {
        await evaluateLongCreateDataset({
          dataset: {
            name: 'workflow-creation-long: attack-discovery-triage',
            description:
              'Evaluate creation of a 12–18-step SOC triage workflow modeled on automated_triaging.yaml. ' +
              'Alert trigger, nested foreach, ES search per alert, case creation with full context, AI analysis, host isolation.',
            examples: [
              {
                input: {
                  instruction:
                    'Build me a workflow our SOC team can run on every attack discovery alert. ' +
                    'For each discovery that fires, it should: ' +
                    '(1) open a high-severity case in Security with the attack title and a markdown summary of the discovery, affected entities, and a link to the full discovery; ' +
                    '(2) loop over each alert ID in the discovery, fetch the full alert details from the security alerts index, and attach each alert as a comment on the case; ' +
                    '(3) call the AI assistant to generate a 1–2 sentence Slack-ready summary of the attack; ' +
                    '(4) isolate the endpoint that triggered the discovery. ' +
                    'Use the alert trigger and thread everything through Liquid so the case gets the right data.',
                },
                output: {
                  criteria: [
                    'The workflow uses an alert trigger.',
                    'There is a foreach step iterating over event.alerts or a similar alert collection.',
                    'A case creation step (kibana.createCase, cases.createCase, or kibana.request to /api/cases) is present with severity high.',
                    'The case title or description references Liquid expressions from the alert/discovery data.',
                    'There is a nested foreach or loop over individual alert IDs within each discovery.',
                    'An Elasticsearch search step fetches alert details by ID from the security alerts index.',
                    'A step posts the alert details as a comment on the created case.',
                    'There is a step that calls an AI assistant API or similar to generate an attack summary.',
                    'There is a step that calls the endpoint isolation API (kibana.request to /api/endpoint/action/isolate or equivalent).',
                    'Liquid references like {{ steps.create_case.output.id }} or {{ foreach.item }} are used correctly to thread data between steps.',
                  ],
                  expectedStepCount: { min: 12, max: 20 },
                  expectedStepTypes: [
                    'foreach',
                    'kibana.createCase|cases.createCase|kibana.request',
                    'elasticsearch.search',
                    'kibana.request',
                  ],
                  expectedMaxToolCalls: 15,
                  expectedToolSequence: [
                    'platform.workflows.get_step_definitions',
                    'platform.workflows.workflow_set_yaml',
                  ],
                  expectedLiquidChains: [
                    { ref: 'event.alerts', resolvesTo: 'event-field' },
                    { ref: 'foreach.item', resolvesTo: 'foreach-item' },
                  ],
                },
                metadata: { category: 'long-creation' },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'creates a multi-source alert enrichment and escalation workflow',
      async ({ evaluateLongCreateDataset }) => {
        await evaluateLongCreateDataset({
          dataset: {
            name: 'workflow-creation-long: alert-enrichment-escalation',
            description:
              'Evaluate creation of a 10–16-step enrichment workflow: alert trigger, severity gate, ' +
              'parallel ES|QL enrichment from multiple data sources, conditional PagerDuty escalation, ' +
              'case creation with enriched context.',
            examples: [
              {
                input: {
                  instruction:
                    'I need a workflow that fires whenever a detection alert comes in. ' +
                    'First, skip it if the severity is low — not worth the noise. For anything medium or above, run three enrichment queries in parallel: check Okta login activity for the source IP in the last 24 hours, check AWS CloudTrail for the same IP, and check for any related alerts from the same host in the last hour. ' +
                    'Then create a case with the enrichment results in the description. ' +
                    'If the alert is critical, also page PagerDuty with a brief summary. ' +
                    'Make sure to reference the enrichment data in both the case and the PagerDuty alert using Liquid.',
                },
                output: {
                  criteria: [
                    'The workflow uses an alert trigger.',
                    'There is a conditional (if) step that skips processing for low-severity alerts.',
                    'There are at least two ES|QL or Elasticsearch search steps that enrich based on the source IP or host.',
                    'The enrichment queries reference event.alerts[0].source.ip or similar alert field via Liquid.',
                    'A case is created containing enrichment results in the description.',
                    'There is a conditional step that only triggers PagerDuty for critical alerts.',
                    'A PagerDuty step is present with a message referencing alert data.',
                    'Connector steps include a connector-id field.',
                  ],
                  expectedStepCount: { min: 10, max: 18 },
                  expectedStepTypes: [
                    'if',
                    'elasticsearch.esql.query|elasticsearch.search',
                    'cases.createCase|kibana.createCase|kibana.request',
                    'pagerduty',
                  ],
                  expectedMaxToolCalls: 15,
                  expectedToolSequence: [
                    'platform.workflows.get_step_definitions',
                    'platform.workflows.get_connectors',
                    'platform.workflows.workflow_set_yaml',
                  ],
                  expectedLiquidChains: [{ ref: 'event.alerts', resolvesTo: 'event-field' }],
                },
                metadata: { category: 'long-creation' },
              },
            ],
          },
        });
      }
    );
  }
);

evaluate.describe(
  'Long workflow creation — scheduled data pipelines',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate(
      'creates a multi-source security metrics pipeline',
      async ({ evaluateLongCreateDataset }) => {
        await evaluateLongCreateDataset({
          dataset: {
            name: 'workflow-creation-long: multi-source-pipeline',
            description:
              'Evaluate creation of a 10–15-step scheduled pipeline: fetch from multiple HTTP sources, ' +
              'ES|QL aggregation, foreach transform, bulk index results, Slack summary.',
            examples: [
              {
                input: {
                  instruction:
                    'Set up a workflow that runs every hour and builds a security posture snapshot. ' +
                    'It should fetch the current open alert counts from three different API endpoints: ' +
                    'https://api.example.com/alerts/critical, /alerts/high, and /alerts/medium. ' +
                    'Then run an ES|QL query on metrics-security.* to get average response times grouped by rule category. ' +
                    'After that, loop over each alert severity bucket, build a summary document for each, and bulk-index them into a security-posture-snapshots index. ' +
                    'Finally, post a Slack message with the total open counts and top 3 slow rule categories.',
                },
                output: {
                  criteria: [
                    'The workflow has a scheduled trigger set to every 1 hour.',
                    'There are at least three HTTP steps fetching from the three alert count endpoints.',
                    'There is an ES|QL step querying the metrics-security.* index.',
                    'The ES|QL step groups results by rule category.',
                    'There is a foreach step iterating over severity buckets or API results.',
                    'A bulk indexing step writes documents to the security-posture-snapshots index.',
                    'The indexed documents reference data from previous steps via Liquid.',
                    'A Slack step sends a summary message with alert counts.',
                    'The Slack message references data from the HTTP and/or ES|QL steps.',
                    'Connector steps include a connector-id field.',
                  ],
                  expectedStepCount: { min: 10, max: 16 },
                  expectedStepTypes: [
                    'http',
                    'elasticsearch.esql.query',
                    'foreach',
                    'elasticsearch.bulk',
                    'slack',
                  ],
                  expectedMaxToolCalls: 15,
                  expectedToolSequence: [
                    'platform.workflows.get_step_definitions',
                    'platform.workflows.get_connectors',
                    'platform.workflows.workflow_set_yaml',
                  ],
                },
                metadata: { category: 'long-creation' },
              },
            ],
          },
        });
      }
    );

    evaluate('creates a full incident response pipeline', async ({ evaluateLongCreateDataset }) => {
      await evaluateLongCreateDataset({
        dataset: {
          name: 'workflow-creation-long: full-incident-response',
          description:
            'Evaluate creation of a 14–20-step full incident response workflow: ' +
            'alert trigger, case creation, per-alert enrichment loop, conditional escalation, ' +
            'remediation action, cross-team notification, evidence preservation.',
          examples: [
            {
              input: {
                instruction:
                  'Our security team needs a full incident response workflow triggered by alerts. ' +
                  "Here's what it needs to do: " +
                  '1. Create a high-severity case immediately with the alert rule name and severity in the title. ' +
                  '2. For each alert in the batch, search the security alerts index for full details, then attach the alert to the case as a comment including the rule name and host. ' +
                  '3. Check if any alert is critical — if so, page the on-call team via PagerDuty with an incident summary. ' +
                  '4. Run an ES|QL query to find other recent alerts from the same hosts in the last 6 hours. ' +
                  '5. If related alerts are found, add them as a case comment. ' +
                  '6. Send a Slack message to #security-incidents with the case link, severity, and a brief summary. ' +
                  '7. Isolate the endpoint for any critical alert using the endpoint isolation API. ' +
                  '8. Log completion with the case ID. ' +
                  'Thread case IDs and alert IDs through Liquid between steps.',
              },
              output: {
                criteria: [
                  'The workflow uses an alert trigger.',
                  'A case is created immediately with alert data in the title (rule name, severity).',
                  'There is a foreach loop over the alerts in the batch.',
                  'Inside the loop, an Elasticsearch search fetches full alert details.',
                  'Each alert is attached to the case as a comment referencing the case ID from the case creation step.',
                  'There is a conditional step that checks for critical severity and triggers PagerDuty.',
                  'An ES|QL step queries for related alerts from the same hosts.',
                  'A conditional step adds related alerts as a case comment.',
                  'A Slack step sends a notification to a channel with the case summary.',
                  'An endpoint isolation step (kibana.request to the isolate API or equivalent) is present.',
                  'A console or logging step records completion.',
                  'Liquid expressions thread case IDs and alert IDs between steps (e.g. {{ steps.create_case.output.id }}).',
                ],
                expectedStepCount: { min: 14, max: 22 },
                expectedStepTypes: [
                  'kibana.createCase|cases.createCase|kibana.request',
                  'foreach',
                  'elasticsearch.search',
                  'if',
                  'pagerduty',
                  'elasticsearch.esql.query',
                  'slack',
                  'kibana.request',
                  'console',
                ],
                expectedMaxToolCalls: 18,
                expectedToolSequence: [
                  'platform.workflows.get_step_definitions',
                  'platform.workflows.get_connectors',
                  'platform.workflows.workflow_set_yaml',
                ],
                expectedLiquidChains: [
                  { ref: 'event.alerts', resolvesTo: 'event-field' },
                  { ref: 'foreach.item', resolvesTo: 'foreach-item' },
                ],
              },
              metadata: { category: 'long-creation' },
            },
          ],
        },
      });
    });
  }
);
