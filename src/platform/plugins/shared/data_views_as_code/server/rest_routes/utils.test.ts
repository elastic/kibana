/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import { logRequest, writeErrorHandler } from '@kbn/as-code-utils';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import { DuplicateDataViewError } from '@kbn/data-views-plugin/common';
import { ValidationError } from '@kbn/config-schema';
import { requestHandler } from './utils';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';

jest.mock('@kbn/as-code-shared-telemetry', () => ({
  telemetryHandler: jest.fn(async (_request, _usageCounter, handler) => handler()),
}));

jest.mock('@kbn/as-code-utils', () => ({
  logRequest: jest.fn(),
  writeErrorHandler: jest.fn(),
}));

describe('requestHandler', () => {
  const logger = loggerMock.create();
  const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
  const usageCounter = mockUsageCountersSetup.createUsageCounter('data_views_as_code');

  const context = {} as any;
  const request = httpServerMock.createKibanaRequest({
    method: 'get',
    path: '/api/data_views_as_code/data_view/my-id',
    routePath: '/api/data_views_as_code/data_view/{id}',
  });
  const response = httpServerMock.createResponseFactory();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs the handler inside telemetry handler', async () => {
    const handlerResult = response.ok({ body: { ok: true } });
    const handler = jest.fn().mockResolvedValue(handlerResult);

    const wrapped = requestHandler({ logger, usageCounter }, handler);
    const result = await wrapped(context, request, response);

    expect(telemetryHandler).toHaveBeenCalledTimes(1);
    expect(telemetryHandler).toHaveBeenCalledWith(request, { usageCounter }, expect.any(Function));
    expect(handler).toHaveBeenCalledWith(context, request, response);
    expect(result).toBe(handlerResult);
  });

  it('maps SavedObjectNotFound errors to notFound response', async () => {
    const error = new SavedObjectNotFound({ type: 'index-pattern', id: 'my-id' });
    const handler = jest.fn().mockRejectedValue(error);

    const wrapped = requestHandler({ logger, usageCounter }, handler);
    await wrapped(context, request, response);

    expect(logRequest).toHaveBeenCalledWith(logger, request, 'debug', error.message);
    expect(response.notFound).toHaveBeenCalledWith({ body: { message: error.message } });
    expect(writeErrorHandler).not.toHaveBeenCalled();
  });

  it('maps boom 404 errors to notFound response', async () => {
    const error = {
      isBoom: true,
      output: { statusCode: 404 },
      message: 'not found from boom',
    };
    const handler = jest.fn().mockRejectedValue(error);

    const wrapped = requestHandler({ logger, usageCounter }, handler);
    await wrapped(context, request, response);

    expect(logRequest).toHaveBeenCalledWith(logger, request, 'debug', error.message);
    expect(response.notFound).toHaveBeenCalledWith({ body: { message: error.message } });
    expect(writeErrorHandler).not.toHaveBeenCalled();
  });

  it('maps DuplicateDataViewError errors to conflict response', async () => {
    const error = new DuplicateDataViewError('already exists');
    const handler = jest.fn().mockRejectedValue(error);

    const wrapped = requestHandler({ logger, usageCounter }, handler);
    await wrapped(context, request, response);

    expect(logRequest).toHaveBeenCalledWith(logger, request, 'debug', error.message);
    expect(response.conflict).toHaveBeenCalledWith({ body: { message: error.message } });
    expect(writeErrorHandler).not.toHaveBeenCalled();
  });

  it('maps boom 409 errors to conflict response', async () => {
    const error = {
      isBoom: true,
      output: { statusCode: 409 },
      message: 'conflict from boom',
    };
    const handler = jest.fn().mockRejectedValue(error);

    const wrapped = requestHandler({ logger, usageCounter }, handler);
    await wrapped(context, request, response);

    expect(logRequest).toHaveBeenCalledWith(logger, request, 'debug', error.message);
    expect(response.conflict).toHaveBeenCalledWith({ body: { message: error.message } });
    expect(writeErrorHandler).not.toHaveBeenCalled();
  });

  it('rethrows validation errors after warning log', async () => {
    const error = new ValidationError({ message: 'invalid payload', path: [] } as any);
    const handler = jest.fn().mockRejectedValue(error);

    const wrapped = requestHandler({ logger, usageCounter }, handler);

    await expect(wrapped(context, request, response)).rejects.toBe(error);
    expect(logRequest).toHaveBeenCalledWith(logger, request, 'warn', error.message);
    expect(writeErrorHandler).not.toHaveBeenCalled();
  });

  it('delegates unknown errors to writeErrorHandler', async () => {
    const error = new Error('unexpected');
    const delegatedResponse = response.badRequest({ body: { message: 'mapped' } });
    jest.mocked(writeErrorHandler).mockReturnValue(delegatedResponse);
    const handler = jest.fn().mockRejectedValue(error);

    const wrapped = requestHandler({ logger, usageCounter }, handler);
    const result = await wrapped(context, request, response);

    expect(writeErrorHandler).toHaveBeenCalledWith(error, response, logger, request);
    expect(result).toBe(delegatedResponse);
  });
});
