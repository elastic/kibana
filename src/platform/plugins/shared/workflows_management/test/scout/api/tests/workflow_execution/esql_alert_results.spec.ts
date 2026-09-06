/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'node:crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import { waitForConditionOrThrow } from '../../../common/utils/wait_for_condition';
import { spaceTest } from '../../fixtures';

const getResultWorkflowYaml = (name: string) => `
name: ${name}
enabled: true
description: Processes every row returned by an ES|QL alert rule
triggers:
  - type: alert
steps:
  - name: process_result
    type: console
    foreach: "{{ event.alerts[0].kibana.alert.esql.results }}"
    with:
      message: "host={{ foreach.item.host_name }},cpu_pct={{ foreach.item.cpu_pct }},threshold={{ foreach.item.threshold }}"
`;

interface EsqlAlertEvent {
  alerts: Array<{
    kibana: {
      alert: {
        esql: {
          results: Array<Record<string, string | null>>;
          results_total_count: number;
          results_stored_count: number;
          results_truncated: boolean;
        };
      };
    };
  }>;
}

spaceTest.describe('ES|QL alert results in workflows', { tag: tags.stateful.classic }, () => {
  spaceTest.setTimeout(120_000);

  const testId = randomUUID();
  const sourceIndex = `test-esql-workflow-results-${testId}`;
  const workflowName = `ESQL results workflow ${testId}`;
  let ruleId: string | undefined;
  let workflowId: string | undefined;

  spaceTest.afterAll(async ({ apiServices, esClient, scoutSpace }) => {
    if (ruleId) {
      await apiServices.alerting.rules.delete(ruleId, scoutSpace.id);
    }
    if (workflowId) {
      await apiServices.workflowsApi.bulkDelete([workflowId]);
    }
    await esClient.indices.delete({ index: sourceIndex, ignore_unavailable: true });
  });

  spaceTest(
    'runs a foreach step over all rows returned by the rule query',
    async ({ apiServices, esClient, scoutSpace }) => {
      await esClient.indices.create({ index: sourceIndex });
      await esClient.bulk({
        refresh: 'wait_for',
        operations: [
          { index: { _index: sourceIndex } },
          { '@timestamp': new Date().toISOString(), host_name: 'host-a', host_cpu_usage: 0.4 },
          { index: { _index: sourceIndex } },
          { '@timestamp': new Date().toISOString(), host_name: 'host-a', host_cpu_usage: 0.6 },
          { index: { _index: sourceIndex } },
          { '@timestamp': new Date().toISOString(), host_name: 'host-b', host_cpu_usage: 0.8 },
        ],
      });

      const workflow = await apiServices.workflowsApi.create(getResultWorkflowYaml(workflowName));
      const createdWorkflowId = workflow.id;
      workflowId = createdWorkflowId;

      const { data: rule } = await apiServices.alerting.rules.create(
        {
          name: `ESQL workflow results rule ${testId}`,
          ruleTypeId: '.es-query',
          consumer: 'alerts',
          params: {
            searchType: 'esqlQuery',
            includeEsqlResults: true,
            esqlQuery: {
              esql: `FROM ${sourceIndex}
                  | STATS cpu_pct = AVG(host_cpu_usage) BY host_name
                  | WHERE cpu_pct > 0.2
                  | EVAL threshold = 20
                  | SORT host_name
                  | KEEP host_name, cpu_pct, threshold`,
            },
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            threshold: [0],
            thresholdComparator: '>',
            size: 100,
            aggType: 'count',
            groupBy: 'all',
            excludeHitsFromPreviousRun: true,
            timeField: '@timestamp',
          },
          schedule: { interval: '1m' },
          actions: [
            {
              id: 'system-connector-.workflows',
              group: 'query matched',
              params: {
                subAction: 'run',
                subActionParams: {
                  workflowId,
                  summaryMode: true,
                },
              },
            },
          ],
        },
        scoutSpace.id
      );
      const createdRuleId = rule.id;
      ruleId = createdRuleId;

      await apiServices.alerting.rules.runSoon(createdRuleId, scoutSpace.id);
      const executions = await waitForConditionOrThrow({
        action: () => apiServices.workflowsApi.getExecutions(createdWorkflowId),
        condition: ({ total }) => total > 0,
        interval: 2_000,
        timeout: 60_000,
        errorMessage: 'The ES|QL rule did not trigger the workflow',
      });

      await apiServices.alerting.rules.disable(createdRuleId, scoutSpace.id);

      const execution = await apiServices.workflowsApi.waitForTermination({
        workflowExecutionId: executions.results[0].id,
        timeout: 30_000,
      });
      const executionWithDetails = await apiServices.workflowsApi.getExecution(
        executions.results[0].id,
        { includeInput: true, includeOutput: true }
      );

      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);

      const event = executionWithDetails?.context?.event as EsqlAlertEvent | undefined;
      expect(event?.alerts[0].kibana.alert.esql.results).toStrictEqual([
        { host_name: 'host-a', cpu_pct: '0.5', threshold: '20' },
        { host_name: 'host-b', cpu_pct: '0.8', threshold: '20' },
      ]);
      expect(event?.alerts[0].kibana.alert.esql.results_total_count).toBe(2);
      expect(event?.alerts[0].kibana.alert.esql.results_stored_count).toBe(2);
      expect(event?.alerts[0].kibana.alert.esql.results_truncated).toBe(false);

      const processedRows = executionWithDetails?.stepExecutions.filter(
        ({ stepId }) => stepId === 'process_result'
      );
      expect(processedRows).toHaveLength(2);
      expect(
        processedRows?.map(({ input }) => (input as { message?: string } | undefined)?.message)
      ).toStrictEqual([
        'host=host-a,cpu_pct=0.5,threshold=20',
        'host=host-b,cpu_pct=0.8,threshold=20',
      ]);
    }
  );
});
