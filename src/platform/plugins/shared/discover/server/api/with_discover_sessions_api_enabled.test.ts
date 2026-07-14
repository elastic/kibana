/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import {
  DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_DEFAULT,
  DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_KEY,
} from '../../common/constants';
import { withDiscoverSessionsApiEnabled } from './with_discover_sessions_api_enabled';

describe('withDiscoverSessionsApiEnabled', () => {
  const request = httpServerMock.createKibanaRequest();

  it('returns not found without calling the handler when disabled', async () => {
    const coreContext = coreMock.createRequestHandlerContext();
    coreContext.featureFlags.getBooleanValue.mockResolvedValue(false);
    const context = jest.mocked<RequestHandlerContext>({
      core: Promise.resolve(coreContext),
      resolve: jest.fn(),
    });
    const response = httpServerMock.createResponseFactory();
    const handler = jest.fn();

    const result = await withDiscoverSessionsApiEnabled(handler)(context, request, response);

    expect(coreContext.featureFlags.getBooleanValue).toHaveBeenCalledWith(
      DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_KEY,
      DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_DEFAULT
    );
    expect(DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_DEFAULT).toBe(false);
    expect(response.notFound).toHaveBeenCalledWith();
    expect(handler).not.toHaveBeenCalled();
    expect(result).toBe(response.notFound.mock.results[0].value);
  });

  it('calls the handler when enabled', async () => {
    const coreContext = coreMock.createRequestHandlerContext();
    coreContext.featureFlags.getBooleanValue.mockResolvedValue(true);
    const context = jest.mocked<RequestHandlerContext>({
      core: Promise.resolve(coreContext),
      resolve: jest.fn(),
    });
    const response = httpServerMock.createResponseFactory();
    const handlerResult = response.ok();
    const handler = jest.fn().mockResolvedValue(handlerResult);

    const result = await withDiscoverSessionsApiEnabled(handler)(context, request, response);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(context, request, response);
    expect(response.notFound).not.toHaveBeenCalled();
    expect(result).toBe(handlerResult);
  });
});
