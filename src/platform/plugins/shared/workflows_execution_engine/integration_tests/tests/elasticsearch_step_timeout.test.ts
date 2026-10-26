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
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe('elasticsearch step timeout', () => {
  const getTransportRequest = (fixture: WorkflowRunFixture) =>
    jest.mocked(
      fixture.dependencies.coreStart.elasticsearch.client.asScoped(fixture.fakeKibanaRequest)
        .asCurrentUser.transport.request
    );

  const getExecution = (fixture: WorkflowRunFixture) =>
    fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

  it('uses the step timeout as the request timeout and passes the step abort signal', async () => {
    const fixture = new WorkflowRunFixture();
    const transportRequest = getTransportRequest(fixture);
    transportRequest.mockResolvedValue({ hits: { hits: [] } });

    await fixture.runWorkflow({
      workflowYaml: `
steps:
  - name: search
    type: elasticsearch.search
    timeout: 10m
    with:
      index: my-index
`,
    });

    expect(getExecution(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    expect(transportRequest.mock.calls[0][1]).toEqual(
      expect.objectContaining({ requestTimeout: 600_000, signal: expect.any(AbortSignal) })
    );
  });

  it('keeps the client request timeout when the step has no timeout', async () => {
    const fixture = new WorkflowRunFixture();
    const transportRequest = getTransportRequest(fixture);
    transportRequest.mockResolvedValue({ hits: { hits: [] } });

    await fixture.runWorkflow({
      workflowYaml: `
steps:
  - name: search
    type: elasticsearch.search
    with:
      index: my-index
`,
    });

    expect(getExecution(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    expect(transportRequest.mock.calls[0][1]).not.toHaveProperty('requestTimeout');
  });

  it('fails with the step timeout and aborts the in-flight request', async () => {
    const fixture = new WorkflowRunFixture();
    const transportRequest = getTransportRequest(fixture);
    let requestSignal: AbortSignal | undefined;
    transportRequest.mockImplementation(
      (_params: unknown, options?: TransportRequestOptions) =>
        new Promise((_resolve, reject) => {
          requestSignal = options?.signal;
          requestSignal?.addEventListener('abort', () => {
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
