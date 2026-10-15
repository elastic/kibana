/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import type { TransportRequestOptions } from '@elastic/elasticsearch';
import { ExecutionStatus } from '@kbn/workflows';
import { STACK_MONITOR_INTERVAL_MS } from '../../server/workflow_execution_loop/run_stack_monitor/constants';
import { WorkflowRunFixture } from '../workflow_run_fixture';

const MARGIN_MS = 2 * STACK_MONITOR_INTERVAL_MS;

describe('elasticsearch step timeout', () => {
  const getTransportRequest = (fixture: WorkflowRunFixture) =>
    jest.mocked(
      fixture.dependencies.coreStart.elasticsearch.client.asScoped(fixture.fakeKibanaRequest)
        .asCurrentUser.transport.request
    );

  const getExecution = (fixture: WorkflowRunFixture) =>
    fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

  it('sends the step timeout as the request timeout and keeps the client default otherwise', async () => {
    const fixture = new WorkflowRunFixture();
    const transportRequest = getTransportRequest(fixture);
    transportRequest.mockResolvedValue({ hits: { hits: [] } });

    await fixture.runWorkflow({
      workflowYaml: `
steps:
  - name: withTimeout
    type: elasticsearch.search
    timeout: 5m
    with:
      index: my-index
  - name: withoutTimeout
    type: elasticsearch.search
    with:
      index: my-index
`,
    });

    expect(getExecution(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    const [[, withTimeoutOptions], [, withoutTimeoutOptions]] = transportRequest.mock.calls;
    expect(withTimeoutOptions).toEqual(
      expect.objectContaining({
        requestTimeout: 300_000 + MARGIN_MS,
        signal: expect.any(AbortSignal),
      })
    );
    expect(withoutTimeoutOptions).not.toHaveProperty('requestTimeout');
  });

  it('sends the rendered value of a templated step timeout', async () => {
    const fixture = new WorkflowRunFixture();
    const transportRequest = getTransportRequest(fixture);
    transportRequest.mockResolvedValue({ hits: { hits: [] } });

    await fixture.runWorkflow({
      workflowYaml: `
inputs:
  stepTimeout:
    type: string
steps:
  - name: query
    type: elasticsearch.esql.query
    timeout: "{{ inputs.stepTimeout }}"
    with:
      query: FROM my-index | LIMIT 1
`,
      inputs: { stepTimeout: '90s' },
    });

    expect(getExecution(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    expect(transportRequest.mock.calls[0][1]).toEqual(
      expect.objectContaining({ requestTimeout: 90_000 + MARGIN_MS })
    );
  });

  it('finds the step timeout when the step also has a condition and a retry', async () => {
    const fixture = new WorkflowRunFixture();
    const transportRequest = getTransportRequest(fixture);
    transportRequest.mockResolvedValue({ hits: { hits: [] } });

    await fixture.runWorkflow({
      workflowYaml: `
steps:
  - name: wrapped
    type: elasticsearch.search
    if: "\${{ 1 == 1 }}"
    timeout: 3m
    on-failure:
      retry:
        max-attempts: 1
    with:
      index: my-index
`,
    });

    expect(getExecution(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    expect(transportRequest.mock.calls[0][1]).toEqual(
      expect.objectContaining({ requestTimeout: 180_000 + MARGIN_MS })
    );
  });

  it('fails with the step timeout and aborts the in-flight request', async () => {
    const fixture = new WorkflowRunFixture();
    const transportRequest = getTransportRequest(fixture);
    let requestSignal: AbortSignal | undefined;
    transportRequest.mockImplementation(
      (_params: unknown, options?: TransportRequestOptions) =>
        new Promise((_resolve, reject) => {
          requestSignal = options?.signal;
          const clientTimer = setTimeout(
            () => reject(new errors.TimeoutError('Request timed out')),
            Number(options?.requestTimeout)
          );
          requestSignal?.addEventListener('abort', () => {
            clearTimeout(clientTimer);
            reject(new errors.RequestAbortedError('Request aborted'));
          });
        })
    );

    await fixture.runWorkflow({
      workflowYaml: `
steps:
  - name: slowSearch
    type: elasticsearch.search
    timeout: 1s
    with:
      index: my-index
`,
    });

    expect(getExecution(fixture)?.error).toEqual({
      type: 'TimeoutError',
      message: 'Step execution exceeded the configured timeout of 1s.',
    });
    expect(requestSignal?.aborted).toBe(true);
  });
});
