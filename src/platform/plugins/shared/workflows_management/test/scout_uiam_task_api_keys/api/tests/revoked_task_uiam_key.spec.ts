/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ExecutionStatus } from '@kbn/workflows';
import { spaceTest } from '../../../scout/api/fixtures';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
};

const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled', 'timed_out'];
const STATUS_PROBE_TIMEOUT_MS = 5_000;

// The short waits (< 5s) sleep inside the workflow:run task, giving the test time to revoke that
// task's UIAM key before `write_doc` runs. Its 10s retry delay then needs a workflow:resume task,
// which Task Manager cannot create because it clones the revoked key.
const WORKFLOW_YAML = `name: Revoked task UIAM key
enabled: true
triggers:
  - type: manual
steps:
  - name: hold_1
    type: wait
    with:
      duration: 4s
  - name: hold_2
    type: wait
    with:
      duration: 4s
  - name: hold_3
    type: wait
    with:
      duration: 4s
  - name: write_doc
    type: elasticsearch.index
    with:
      index: revoked-task-uiam-key
      document:
        message: written with the task UIAM key
    on-failure:
      retry:
        max-attempts: 2
        delay: 10s
      continue: true
  - name: after_write
    type: console
    with:
      message: reached the step after continue
`;

interface TaskDoc {
  task: {
    uiamApiKey?: string;
    userScope?: { uiamApiKeyId?: string };
  };
}

interface ExecutionDoc {
  status: string;
  finishedAt?: string;
  error?: { type?: string; message?: string };
}

interface StepExecutionDoc {
  stepId: string;
  status: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readTask = async (esClient: Client, taskId: string): Promise<TaskDoc | undefined> => {
  const response = await esClient.get<TaskDoc>(
    { index: '.kibana_task_manager', id: `task:${taskId}` },
    { ignore: [404] }
  );
  return response._source;
};

const readExecution = async (
  esClient: Client,
  executionId: string
): Promise<ExecutionDoc | undefined> => {
  const response = await esClient.search<ExecutionDoc>({
    index: '.workflows-executions',
    query: { ids: { values: [executionId] } },
  });
  return response.hits.hits[0]?._source;
};

const readStepExecutions = async (
  esClient: Client,
  executionId: string
): Promise<StepExecutionDoc[]> => {
  const response = await esClient.search<StepExecutionDoc>({
    index: '.workflows-step-executions',
    size: 100,
    query: { term: { workflowRunId: executionId } },
  });
  return response.hits.hits.flatMap((hit) => (hit._source ? [hit._source] : []));
};

/** Returns whether Kibana answered `/api/status` within the probe timeout. */
const isKibanaResponsive = async (kibanaUrl: string): Promise<boolean> => {
  try {
    await fetch(new URL('/api/status', kibanaUrl), {
      signal: AbortSignal.timeout(STATUS_PROBE_TIMEOUT_MS),
    });
    return true;
  } catch {
    return false;
  }
};

spaceTest.describe(
  '[NON-MKI] Workflow execution when the task UIAM API key is revoked',
  { tag: [...tags.serverless.observability.complete] },
  () => {
    let workflowId: string | undefined;

    spaceTest.afterAll(async ({ apiServices }) => {
      if (workflowId) {
        await apiServices.workflowsApi.hardDelete(workflowId);
      }
    });

    spaceTest(
      'fails the execution and keeps Kibana responsive when the resume task cannot be scheduled',
      async ({ apiClient, apiServices, config, esClient, samlAuth, scoutSpace }) => {
        spaceTest.setTimeout(180_000);
        const kibanaUrl = config.hosts.kibana;

        const workflow = await apiServices.workflowsApi.create(WORKFLOW_YAML);
        workflowId = workflow.id;

        // Running from a UIAM session makes Task Manager grant a UIAM API key for the
        // workflow:run task, which it then uses for the steps and to clone resume tasks.
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const runResponse = await apiClient.post(
          `s/${scoutSpace.id}/api/workflows/workflow/${workflow.id}/run`,
          {
            headers: { ...INTERNAL_HEADERS, ...cookieHeader },
            body: { inputs: {} },
            responseType: 'json',
          }
        );
        expect(runResponse).toHaveStatusCode(200);
        const { workflowExecutionId } = runResponse.body as { workflowExecutionId: string };
        const taskId = `workflow:${workflowExecutionId}:manual`;

        const task = await readTask(esClient, taskId);
        const uiamApiKeyId = task?.task.userScope?.uiamApiKeyId;
        expect(task?.task.uiamApiKey).toBeDefined();
        expect(typeof uiamApiKeyId).toBe('string');

        await apiServices.workflowsApi.waitForStatus({
          workflowExecutionId,
          status: ExecutionStatus.RUNNING,
        });

        const invalidateResponse = await apiClient.post(
          'test_endpoints/uiam/api_keys/_invalidate',
          {
            headers: { ...INTERNAL_HEADERS, ...cookieHeader },
            body: { id: uiamApiKeyId, taskId },
            responseType: 'json',
          }
        );
        expect(invalidateResponse).toHaveStatusCode(200);

        // Probe Kibana while the execution runs into the revoked key and for a while after it
        // finishes: a spinning execution loop starves the event loop and stops Kibana answering.
        let unresponsiveProbes = 0;
        let execution: ExecutionDoc | undefined;
        const deadline = Date.now() + 90_000;
        while (Date.now() < deadline) {
          if (!(await isKibanaResponsive(kibanaUrl))) {
            unresponsiveProbes++;
          }
          execution = await readExecution(esClient, workflowExecutionId);
          if (execution && TERMINAL_STATUSES.includes(execution.status)) {
            break;
          }
          await sleep(1_000);
        }
        for (let probe = 0; probe < 10; probe++) {
          if (!(await isKibanaResponsive(kibanaUrl))) {
            unresponsiveProbes++;
          }
          await sleep(1_000);
        }

        expect(unresponsiveProbes).toBe(0);
        expect(execution?.status).toBe('failed');
        expect(execution?.finishedAt).toBeDefined();
        expect(execution?.error?.type).toBe('ResumeTaskSchedulingError');

        const stepExecutions = await readStepExecutions(esClient, workflowExecutionId);
        expect(stepExecutions.some(({ stepId }) => stepId === 'after_write')).toBe(false);
        const nonTerminalSteps = stepExecutions.filter(
          ({ status }) => !TERMINAL_STATUSES.includes(status)
        );
        expect(nonTerminalSteps).toHaveLength(0);
      }
    );
  }
);
