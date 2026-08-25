/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import {
  getWorkflowServiceAccountCoordinates,
  withWorkflowServiceAccountRequest,
} from './service_account_execution';
import type { WorkflowServiceAccountOperation } from './types';

const coordinates = {
  workloadType: 'workflow',
  workloadId: 'workflow-1',
  spaceId: 'space-1',
};

const createOperation = (
  binding: Awaited<ReturnType<WorkflowServiceAccountOperation['getBinding']>>
) =>
  ({
    attach: jest.fn(),
    detach: jest.fn(),
    getBinding: jest.fn().mockResolvedValue(binding),
    withScopedRequest: jest
      .fn()
      .mockImplementation(async (_coordinates, fn) =>
        fn({ scoped: true } as unknown as KibanaRequest)
      ),
  } as jest.Mocked<WorkflowServiceAccountOperation>);

describe('workflow service account execution', () => {
  it('builds stable workflow workload coordinates', () => {
    expect(
      getWorkflowServiceAccountCoordinates({
        workflowId: 'workflow-1',
        spaceId: 'space-1',
      })
    ).toEqual(coordinates);
  });

  it('uses the fallback request when run_as is absent', async () => {
    const operation = createOperation(null);
    const fallbackRequest = { fallback: true } as unknown as KibanaRequest;
    const fn = jest.fn().mockResolvedValue('result');

    await expect(
      withWorkflowServiceAccountRequest({
        operation,
        workflowId: 'workflow-1',
        spaceId: 'space-1',
        serviceAccountId: undefined,
        fallbackRequest,
        fn,
      })
    ).resolves.toBe('result');

    expect(fn).toHaveBeenCalledWith(fallbackRequest);
    expect(operation.getBinding).not.toHaveBeenCalled();
    expect(operation.withScopedRequest).not.toHaveBeenCalled();
  });

  it('rejects execution when settings.run_as does not match the authorized binding', async () => {
    const operation = createOperation(null);
    const fn = jest.fn();

    await expect(
      withWorkflowServiceAccountRequest({
        operation,
        workflowId: 'workflow-1',
        spaceId: 'space-1',
        serviceAccountId: 'service-account-1',
        fallbackRequest: {} as KibanaRequest,
        fn,
      })
    ).rejects.toThrow('authorized binding does not match');

    expect(operation.getBinding).toHaveBeenCalledWith(coordinates);
    expect(operation.withScopedRequest).not.toHaveBeenCalled();
    expect(fn).not.toHaveBeenCalled();
  });

  it('runs with the scoped request when settings.run_as matches the binding', async () => {
    const operation = createOperation({
      operationType: 'workflow_execution',
      workloadType: 'workflow',
      workloadId: 'workflow-1',
      serviceAccountId: 'service-account-1',
      spaceId: 'space-1',
      attachedAt: '2024-01-01T00:00:00.000Z',
      attachedBy: { type: 'user', username: 'alice' },
    });
    const fn = jest.fn().mockResolvedValue('result');

    await expect(
      withWorkflowServiceAccountRequest({
        operation,
        workflowId: 'workflow-1',
        spaceId: 'space-1',
        serviceAccountId: 'service-account-1',
        fallbackRequest: {} as KibanaRequest,
        fn,
      })
    ).resolves.toBe('result');

    expect(operation.withScopedRequest).toHaveBeenCalledWith(coordinates, expect.any(Function));
    expect(fn).toHaveBeenCalledWith({ scoped: true });
  });
});
