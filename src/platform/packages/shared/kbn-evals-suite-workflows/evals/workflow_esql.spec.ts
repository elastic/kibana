/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL quality in generated workflows.
 *
 * The suite creates fixture indices with real mappings, so `EsqlExecution`
 * can run each `elasticsearch.esql.query` step with `LIMIT 0` and catch
 * unknown indices and columns — the failure customers report. `EsqlValidity`
 * is the parser-only check. Both scores are separate from `ValidationPass`.
 *
 * Every prompt asks for ES|QL by name: the dataset scores ES|QL quality, not
 * the choice between ES|QL and `elasticsearch.search`.
 *
 * Most prompts describe the data, not the field names, so the agent must read
 * the mapping. Unknown columns from guessed field names are the failure
 * customers report.
 *
 * Prompts 1–6 are workflow versions of examples from
 * `kbn-evals-suite-security-esql-generation-regression`. Prompts 7–10 are
 * workflow-specific traps: Liquid inside `WHERE`, a nested field path, GROK
 * quoting inside YAML, and a later step that reads the query output. Prompts
 * 11–12 are mapping traps: the intuitive ECS field (`error.code`,
 * `event.outcome`) is not in the fixture mapping.
 *
 * Per security-team#20636.
 */

import { tags } from '@kbn/scout';
import type { EvaluationDataset } from '@kbn/evals';
import { selectEvaluators } from '@kbn/evals';
import { evaluate as base } from '../src/evaluate';
import type { WorkflowCreateExample, WorkflowTaskOutput } from '../src/types';
import {
  createCriteriaEvaluator,
  createLiquidPresenceEvaluator,
  createNoErrorsEvaluator,
  createStructuralCorrectnessEvaluator,
  createValidationPassEvaluator,
  extractResultYaml,
  extractYamlFromAttachments,
  skipInfraErrors,
} from '../src/evaluators';
import { createEsqlExecutionEvaluator, createEsqlValidityEvaluator } from '../src/esql/evaluators';
import { cleanupEsqlFixtures, setupEsqlFixtures } from '../src/esql/fixtures/setup';

const evaluate = base.extend<
  {
    evaluateEsqlDataset: (opts: {
      dataset: EvaluationDataset<WorkflowCreateExample>;
    }) => Promise<void>;
  },
  {}
>({
  evaluateEsqlDataset: [
    async ({ chatClient, evaluators, executorClient, esClient }, use) => {
      await use(async ({ dataset }) => {
        await executorClient.runExperiment(
          {
            datasets: [dataset],
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

              return { ...taskOutput, resultYaml, traceId: response.traceId };
            },
          },
          selectEvaluators<WorkflowCreateExample, WorkflowTaskOutput>([
            skipInfraErrors(createEsqlValidityEvaluator()),
            skipInfraErrors(createEsqlExecutionEvaluator({ esClient })),
            skipInfraErrors(createNoErrorsEvaluator()),
            skipInfraErrors(createValidationPassEvaluator()),
            skipInfraErrors(createStructuralCorrectnessEvaluator()),
            skipInfraErrors(createLiquidPresenceEvaluator()),
            skipInfraErrors(evaluators.traceBasedEvaluators.latency),
            skipInfraErrors(createCriteriaEvaluator({ evaluators })),
          ])
        );
      });
    },
    { scope: 'test' },
  ],
});

const ESQL = 'elasticsearch.esql.query';

const dataset: EvaluationDataset<WorkflowCreateExample> = {
  name: 'workflow-esql',
  description:
    'Workflow creation where the core of the workflow is an ES|QL query against fixture indices with real mappings. Scored by EsqlValidity and EsqlExecution.',
  examples: [
    // --- From the security ES|QL regression dataset -------------------------
    {
      input: {
        instruction:
          'Create a workflow that runs every hour. It uses an ES|QL query on logs-* to find process events where the process name is "curl.exe", ' +
          'sums the bytes they sent per destination address, converts the sum to KB, and keeps the top 10 by KB. ' +
          'Post the result to the #soc-network Slack channel.',
      },
      output: {
        criteria: [
          'The workflow has a scheduled trigger that runs every hour.',
          'An ES|QL step reads from logs-* and filters on process.name == "curl.exe".',
          'The ES|QL query sums source.bytes grouped by destination.address, converts to KB, sorts descending and limits to 10.',
          'A Slack step posts to #soc-network and references the ES|QL step output with Liquid.',
        ],
        expectedStepTypes: [ESQL],
        expectsEsql: true,
      },
      metadata: { category: 'esql-aggregation' },
    },
    {
      input: {
        instruction:
          'Every 15 minutes, use an ES|QL query on metricbeat-* to compute the CPU usage per host: ' +
          'user CPU plus system CPU, divided by the number of cores, averaged per host. ' +
          'If any host is above 0.9, send a Slack message to #infra-alerts listing those hosts.',
      },
      output: {
        criteria: [
          'The workflow has a scheduled trigger every 15 minutes.',
          'An ES|QL step reads from metricbeat-* and computes (system.cpu.user.pct + system.cpu.system.pct) / system.cpu.cores averaged by host.name.',
          'The threshold 0.9 is applied either inside the ES|QL query (WHERE after STATS) or in an if step that reads the ES|QL output.',
          'A Slack step sends the hosts above the threshold to #infra-alerts.',
        ],
        expectedStepTypes: [ESQL],
        expectsEsql: true,
      },
      metadata: { category: 'esql-eval-math' },
    },
    {
      input: {
        instruction:
          'Build a daily APM health report. Use an ES|QL query on traces-apm-* to compute, for the last 24 hours and per service.name: ' +
          'the average transaction duration in microseconds, the success rate (successful / (successful + failed) transactions), ' +
          'and the total number of requests. Index one summary document per service into the apm-daily-health index.',
      },
      output: {
        criteria: [
          'The workflow has a scheduled trigger that runs once a day.',
          'An ES|QL step reads from traces-apm-*, filters @timestamp to the last 24 hours, and groups by service.name.',
          'The success rate is computed from event.outcome with CASE or an equivalent expression.',
          'Results are written to apm-daily-health, one document per service (foreach + elasticsearch.index, or a bulk step).',
        ],
        expectedStepTypes: [ESQL],
        expectsEsql: true,
      },
      metadata: { category: 'esql-case-expression' },
    },
    {
      input: {
        instruction:
          'Create a manual workflow that uses an ES|QL query to extract the query duration from the message field in postgres-logs-* ' +
          '(messages look like "... duration: 123.4 ms ...") and calculates the average duration. Log the average with a console step.',
      },
      output: {
        criteria: [
          'The workflow has a manual trigger.',
          'An ES|QL step reads from postgres-logs-* and uses DISSECT or GROK on message to extract the duration.',
          'The extracted value is converted to a number before AVG.',
          'A console step logs the average from the ES|QL output using Liquid.',
        ],
        expectedStepTypes: [ESQL, 'console'],
        expectsEsql: true,
      },
      metadata: { category: 'esql-dissect' },
    },
    {
      input: {
        instruction:
          'Every morning at 8:00, use an ES|QL query to list the 5 earliest hires from employees-*. Show only the employee number and the hire month ' +
          'formatted like "September 2019". Email the list to hr-team@example.com.',
      },
      output: {
        criteria: [
          'The workflow has a scheduled trigger at 08:00 daily (cron or rrule).',
          'An ES|QL step reads from employees-*, sorts by hire_date ascending, and limits to 5.',
          'The query formats hire_date with DATE_FORMAT("MMMM yyyy", hire_date) and keeps only emp_no and the formatted date.',
          'An email step sends the result to hr-team@example.com.',
        ],
        expectedStepTypes: [ESQL],
        expectsEsql: true,
      },
      metadata: { category: 'esql-date-format' },
    },
    {
      input: {
        instruction:
          'My ECS logs are in logs-*. Every 5 minutes, use an ES|QL query to find hosts whose average normalized CPU over the last 15 minutes, ' +
          'in 1-minute buckets, is above 80%. Create a case for each host with the host name in the title.',
      },
      output: {
        criteria: [
          'The workflow has a scheduled trigger every 5 minutes.',
          'An ES|QL step reads from logs-*, filters to the last 15 minutes, buckets @timestamp by 1 minute, and averages system.cpu.total.norm.pct by host.name.',
          'The 80% threshold is expressed as 0.8 on the normalized pct field.',
          'A foreach loop creates one case per host, and each case title contains the host name via Liquid.',
        ],
        expectedStepTypes: [ESQL, 'foreach'],
        expectsEsql: true,
      },
      metadata: { category: 'esql-time-buckets' },
    },

    // --- Workflow-specific traps --------------------------------------------
    {
      input: {
        instruction:
          'Create a manual workflow with a string input "host". It runs an ES|QL query on logs-* that returns the top 10 process names ' +
          'by event count for that host in the last 24 hours, then logs the result with a console step.',
      },
      output: {
        criteria: [
          'The workflow declares a string input named host.',
          'The ES|QL WHERE clause compares host.name to the input with Liquid inside a quoted string literal, e.g. host.name == "{{ inputs.host }}".',
          'The query groups by process.name, sorts by count descending, and limits to 10.',
          'A console step logs the ES|QL output.',
        ],
        expectedStepTypes: [ESQL, 'console'],
        expectedLiquidChains: [{ ref: 'inputs.host' }],
        expectsEsql: true,
      },
      metadata: { category: 'esql-trap-liquid-in-where' },
    },
    {
      input: {
        instruction:
          'Every hour, run an ES|QL query on logs-* for the top 20 DNS registered domains in the last hour and the number of distinct hosts that queried each. ' +
          'Use the real ECS field names from the index. Post the list to the #dns-watch Slack channel.',
      },
      output: {
        criteria: [
          'The workflow has a scheduled trigger every hour.',
          'The ES|QL query uses the nested ECS path dns.question.registered_domain (not a flat or invented field name).',
          'The query counts distinct host.name per domain with COUNT_DISTINCT, sorts descending and limits to 20.',
          'A Slack step posts the list to #dns-watch.',
        ],
        expectedStepTypes: [ESQL],
        expectsEsql: true,
      },
      metadata: { category: 'esql-trap-nested-field' },
    },
    {
      input: {
        instruction:
          'Create a manual workflow that parses postgres-logs-* messages with the ES|QL GROK command. Messages look like ' +
          '`LOG:  duration: 12.5 ms  statement: SELECT ...`. Extract the duration as a float and the statement text, ' +
          'then return the 10 slowest statements. Log them with a console step.',
      },
      output: {
        criteria: [
          'The ES|QL step uses GROK on message with a pattern that extracts a float duration and the statement.',
          'The GROK pattern is quoted correctly for both ES|QL and YAML (no broken quotes, escapes kept).',
          'The query sorts by duration descending and limits to 10.',
          'A console step logs the result.',
        ],
        expectedStepTypes: [ESQL, 'console'],
        expectsEsql: true,
      },
      metadata: { category: 'esql-trap-grok-quoting' },
    },
    {
      input: {
        instruction:
          'Every day, use an ES|QL query to find the 5 users in logs-* who sent the most bytes in the last 24 hours. ' +
          'Then, for each of those users, send a separate Slack message to #data-exfil with the user name and the byte total.',
      },
      output: {
        criteria: [
          'An ES|QL step sums source.bytes by user.name over the last 24 hours, sorts descending and limits to 5.',
          'A foreach step iterates over the ES|QL rows via {{ steps.<esql_step>.output.values }}.',
          'Inside the loop, the Slack message reads the user name and byte total from foreach.item by column position that matches the STATS ... BY column order.',
          'Slack messages go to #data-exfil.',
        ],
        expectedStepTypes: [ESQL, 'foreach'],
        expectedLiquidChains: [{ ref: 'foreach.item', resolvesTo: 'foreach-item' }],
        expectsEsql: true,
      },
      metadata: { category: 'esql-trap-output-values' },
    },
    // --- Mapping traps: the intuitive ECS name does not exist in the fixture --
    {
      input: {
        instruction:
          'Every hour, use an ES|QL query on logs-* to count the events per error code in the last hour, ' +
          'keep the 10 most frequent codes, and post them to the #app-errors Slack channel.',
      },
      output: {
        criteria: [
          {
            text: 'The ES|QL query groups by the error_code field that exists in the logs-* mapping, not by an invented ECS field such as error.code.',
            score: 2,
          },
          'The query filters to the last hour, sorts by count descending, and limits to 10.',
          'A Slack step posts the result to #app-errors.',
        ],
        expectedStepTypes: [ESQL],
        expectsEsql: true,
      },
      metadata: { category: 'esql-trap-non-ecs-field' },
    },
    {
      input: {
        instruction:
          'Every 5 minutes, use an ES|QL query on logs-* to find users with more than 10 failed logins in the last 5 minutes. ' +
          'Create a case for each of those users with the user name and the failure count in the title.',
      },
      output: {
        criteria: [
          {
            text: 'The ES|QL query identifies failed logins with fields that exist in the logs-* mapping (event.action or event.code), not event.outcome, which the index does not have.',
            score: 2,
          },
          'The query counts failures per user.name over the last 5 minutes and keeps users with more than 10.',
          'A foreach loop creates one case per user, with the user name and count in the title via Liquid.',
        ],
        expectedStepTypes: [ESQL, 'foreach'],
        expectsEsql: true,
      },
      metadata: { category: 'esql-trap-missing-ecs-field' },
    },
  ],
};

evaluate.describe('Workflow ES|QL quality', { tag: tags.serverless.observability.complete }, () => {
  evaluate.beforeAll(async ({ esClient, log }) => {
    await setupEsqlFixtures({ esClient, log });
  });

  evaluate.afterAll(async ({ esClient, log }) => {
    await cleanupEsqlFixtures({ esClient, log });
  });

  evaluate('workflow-esql', async ({ evaluateEsqlDataset }) => {
    await evaluateEsqlDataset({ dataset });
  });
});
