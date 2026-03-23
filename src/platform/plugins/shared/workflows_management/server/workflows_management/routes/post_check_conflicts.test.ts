/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerPostCheckConflictsRoute } from './post_check_conflicts';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('POST /api/workflows/_check-conflicts', () => {
  let workflowsApi: WorkflowsManagementApi;
  let mockRouter: ReturnType<typeof createMockRouterInstance>;
  let mockSpaces: any;

  beforeEach(() => {
    mockRouter = createMockRouterInstance();
    workflowsApi = createMockWorkflowsApi();
    mockSpaces = createSpacesMock();
    jest.clearAllMocks();
  });

  function getRouteHandler() {
    registerPostCheckConflictsRoute({
      router: mockRouter,
      api: workflowsApi,
      logger: mockLogger,
      spaces: mockSpaces,
    });
    const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
      (call: unknown[]) => (call[0] as { path: string }).path === '/api/workflows/_check-conflicts'
    );
    return postCall?.[1];
  }

  function createRequest(ids: string[]) {
    return {
      body: { ids },
      headers: {},
    };
  }

  it('should return empty conflicts when no workflows exist', async () => {
    const handler = getRouteHandler();
    workflowsApi.checkWorkflowConflicts = jest.fn().mockResolvedValue([]);

    const mockResponse = createMockResponse();
    await handler({}, createRequest(['w-1', 'w-2']), mockResponse);

    const body = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.conflicts).toEqual([]);
    expect(workflowsApi.checkWorkflowConflicts).toHaveBeenCalledWith(['w-1', 'w-2'], 'default');
  });

  it('should return conflicts for existing workflows', async () => {
    const handler = getRouteHandler();
    workflowsApi.checkWorkflowConflicts = jest
      .fn()
      .mockResolvedValue([{ id: 'w-1', name: 'Existing Workflow One' }]);

    const mockResponse = createMockResponse();
    await handler({}, createRequest(['w-1', 'w-2']), mockResponse);

    const body = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.conflicts).toHaveLength(1);
    expect(body.conflicts[0]).toEqual({ id: 'w-1', existingName: 'Existing Workflow One' });
  });
});
