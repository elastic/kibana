/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerGetWorkflowsConfigRoute } from './get_workflows_config';
import { createMockRouterInstance, getWorkflowExecutionEngineMock } from './test_utils';
import { WORKFLOWS_CONFIG_PATH } from '../../../common/routes';

jest.mock('../lib/with_license_check', () => ({
  withLicenseCheck: (handler: Function) => handler,
}));

describe(`GET ${WORKFLOWS_CONFIG_PATH}`, () => {
  let mockRouter: ReturnType<typeof createMockRouterInstance>;
  let routeHandler: (context: unknown, request: unknown, response: any) => Promise<unknown>;

  beforeEach(() => {
    mockRouter = createMockRouterInstance();
    registerGetWorkflowsConfigRoute({
      router: mockRouter,
      getWorkflowExecutionEngine: getWorkflowExecutionEngineMock(true),
    });
    const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
      (call: unknown[]) => (call[0] as { path?: string })?.path === WORKFLOWS_CONFIG_PATH
    );
    routeHandler = getCall?.[1];
  });

  it('returns eventDrivenExecutionEnabled true when engine getter returns true', async () => {
    const mockResponse = { ok: jest.fn().mockReturnThis() };
    await routeHandler(null, {} as any, mockResponse);
    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: { eventDrivenExecutionEnabled: true },
    });
  });

  it('returns eventDrivenExecutionEnabled false when engine getter returns false', async () => {
    mockRouter = createMockRouterInstance();
    registerGetWorkflowsConfigRoute({
      router: mockRouter,
      getWorkflowExecutionEngine: getWorkflowExecutionEngineMock(false),
    });
    const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
      (call: unknown[]) => (call[0] as { path?: string })?.path === WORKFLOWS_CONFIG_PATH
    );
    const handler = getCall?.[1];
    const mockResponse = { ok: jest.fn().mockReturnThis() };
    await handler(null, {} as any, mockResponse);
    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: { eventDrivenExecutionEnabled: false },
    });
  });
});
