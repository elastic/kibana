/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import type { SetupServerReturn } from '@kbn/core-test-helpers-test-utils';
import { setupServer } from '@kbn/core-test-helpers-test-utils';
import type { RequestHandlerContext } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { registerTerraformRoute, MAX_TERRAFORM_REQUEST_BYTES } from './register_terraform_route';

const mockConvert = jest.fn();
jest.mock('@kbn/as-code-dashboard-terraform', () => {
  const actual = jest.requireActual('@kbn/as-code-dashboard-terraform');
  return {
    ...actual,
    loadDashboardOas: jest.fn().mockResolvedValue({}),
    createDashboardConverter: () => mockConvert,
  };
});

const PATH = '/internal/dashboards/_terraform';

describe('POST /internal/dashboards/_terraform', () => {
  let server: SetupServerReturn['server'];
  let createRouter: SetupServerReturn['createRouter'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let flagEnabled: boolean;

  const post = (body: object) =>
    supertest(server.listener)
      .post(PATH)
      .set('elastic-api-version', '1')
      .set('x-elastic-internal-origin', 'kibana')
      .set('content-type', 'application/json')
      .send(JSON.stringify(body));

  beforeEach(async () => {
    ({ server, createRouter, handlerContext } = await setupServer());
    logger = loggingSystemMock.createLogger();
    flagEnabled = true;
    Object.assign(handlerContext, {
      featureFlags: { getBooleanValue: jest.fn(async () => flagEnabled) },
    });
    const { versioned } = createRouter<RequestHandlerContext>('/');
    registerTerraformRoute(versioned, logger);
    await server.start();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await server.stop();
  });

  it('converts a dashboard', async () => {
    mockConvert.mockReturnValueOnce({
      body: { title: 'Logs' },
      droppedFields: [],
      skippedPanels: [],
      partialPanels: [],
      jsonPanels: [],
    });
    const result = await post({ dashboard: { title: 'Logs', panels: [] } });
    expect(result.status).toBe(200);
    expect(result.body.body).toEqual({ title: 'Logs' });
  });

  it('rejects a body larger than the bound without converting it', async () => {
    const title = 'x'.repeat(MAX_TERRAFORM_REQUEST_BYTES);
    const result = await post({ dashboard: { title, panels: [] } });
    expect(result.status).toBe(413);
    expect(mockConvert).not.toHaveBeenCalled();
  });

  it('rejects a title longer than the as-code title limit without converting it', async () => {
    const result = await post({ dashboard: { title: 'x'.repeat(1001), panels: [] } });
    expect(result.status).toBe(400);
    expect(result.body.message).toContain('[request body.dashboard.title]');
    expect(mockConvert).not.toHaveBeenCalled();
  });

  it('returns the conversion error for input the resource cannot hold', async () => {
    const { DashboardConversionError } = jest.requireActual('@kbn/as-code-dashboard-terraform');
    mockConvert.mockImplementationOnce(() => {
      throw new DashboardConversionError('panels: expected a list');
    });
    const result = await post({ dashboard: { title: 'Logs', panels: {} } });
    expect(result.status).toBe(400);
    expect(result.body.message).toBe('panels: expected a list');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs a failing converter with context and answers with a generic server error', async () => {
    mockConvert.mockImplementationOnce(() => {
      throw new Error('secret internal detail');
    });
    const result = await post({
      dashboard: {
        title: 'Private title',
        panels: [{ type: 'lens' }, { title: 'Private section', panels: [{ type: 'markdown' }] }],
        pinned_panels: [{ type: 'options_list_control' }],
      },
    });
    expect(result.status).toBe(500);
    expect(JSON.stringify(result.body)).not.toContain('secret internal detail');
    expect(logger.error).toHaveBeenCalledTimes(1);
    const [message] = logger.error.mock.calls[0];
    expect(message).toContain(`POST ${PATH}`);
    expect(message).toContain(
      'panels [lens, section, markdown], pinned panels [options_list_control]'
    );
    expect(message).not.toContain('Private');
    expect(message).toContain('secret internal detail');
  });

  it('is not found while the feature flag is off', async () => {
    flagEnabled = false;
    const result = await post({ dashboard: { title: 'Logs', panels: [] } });
    expect(result.status).toBe(404);
  });
});
