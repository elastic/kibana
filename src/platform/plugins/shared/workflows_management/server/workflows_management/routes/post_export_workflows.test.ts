/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import AdmZip from 'adm-zip';
import { registerPostExportWorkflowsRoute } from './post_export_workflows';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('POST /api/workflows/_export', () => {
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
    registerPostExportWorkflowsRoute({
      router: mockRouter,
      api: workflowsApi,
      logger: mockLogger,
      spaces: mockSpaces,
    });
    const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
      (call: unknown[]) => (call[0] as { path: string }).path === '/api/workflows/_export'
    );
    return postCall?.[1];
  }

  function createRequest(ids: string[]) {
    return {
      body: { ids },
      headers: {},
      url: { pathname: '/api/workflows/_export' },
    };
  }

  it('should export workflows as a ZIP archive', async () => {
    const handler = getRouteHandler();

    workflowsApi.getWorkflowsByIds = jest.fn().mockResolvedValue([
      { id: 'w-1', name: 'Workflow w-1', yaml: 'name: Workflow w-1\nsteps: []', definition: null },
      { id: 'w-2', name: 'Workflow w-2', yaml: 'name: Workflow w-2\nsteps: []', definition: null },
    ]);

    const mockResponse = createMockResponse();
    await handler({}, createRequest(['w-1', 'w-2']), mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    const { body, headers } = (mockResponse.ok as jest.Mock).mock.calls[0][0];

    expect(headers['Content-Type']).toBe('application/zip');
    expect(headers['Content-Disposition']).toContain('.zip');

    const zip = new AdmZip(body);
    const entryNames = zip.getEntries().map((e) => e.entryName);
    expect(entryNames.some((n) => n.includes('w-1.yml'))).toBe(true);
    expect(entryNames.some((n) => n.includes('w-2.yml'))).toBe(true);
    expect(entryNames.some((n) => n.includes('manifest.yml'))).toBe(true);
  });

  it('should use workflow.yaml when definition is null', async () => {
    const handler = getRouteHandler();

    workflowsApi.getWorkflowsByIds = jest
      .fn()
      .mockResolvedValue([
        { id: 'w-1', name: 'Test', yaml: 'name: from-yaml-field', definition: null },
      ]);

    const mockResponse = createMockResponse();
    await handler({}, createRequest(['w-1']), mockResponse);

    const { body } = (mockResponse.ok as jest.Mock).mock.calls[0][0];
    const zip = new AdmZip(body);
    const entry = zip.getEntries().find((e) => e.entryName.includes('w-1.yml'));
    expect(entry!.getData().toString('utf-8')).toBe('name: from-yaml-field');
  });

  it('should return 404 when none of the requested workflows exist', async () => {
    const handler = getRouteHandler();
    workflowsApi.getWorkflowsByIds = jest.fn().mockResolvedValue([]);

    const mockResponse = createMockResponse();
    await handler({}, createRequest(['w-missing']), mockResponse);

    expect(mockResponse.notFound).toHaveBeenCalled();
  });

  it('should skip missing workflows and export the rest', async () => {
    const handler = getRouteHandler();

    workflowsApi.getWorkflowsByIds = jest
      .fn()
      .mockResolvedValue([{ id: 'w-1', name: 'Found', yaml: 'name: w-1', definition: null }]);

    const mockResponse = createMockResponse();
    await handler({}, createRequest(['w-1', 'w-missing']), mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    const { body } = (mockResponse.ok as jest.Mock).mock.calls[0][0];
    const zip = new AdmZip(body);
    const workflowEntries = zip
      .getEntries()
      .filter((e) => e.entryName.endsWith('.yml') && e.entryName !== 'manifest.yml');
    expect(workflowEntries).toHaveLength(1);
  });

  it('should handle API errors gracefully', async () => {
    const handler = getRouteHandler();
    workflowsApi.getWorkflowsByIds = jest.fn().mockRejectedValue(new Error('ES down'));

    const mockResponse = createMockResponse();
    await handler({}, createRequest(['w-1']), mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: expect.stringContaining('ES down') },
    });
  });
});
