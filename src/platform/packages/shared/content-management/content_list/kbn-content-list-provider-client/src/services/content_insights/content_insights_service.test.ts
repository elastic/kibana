/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { Logger } from '@kbn/logging';
import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import { createContentInsightsService } from './content_insights_service';

describe('createContentInsightsService', () => {
  const http = {
    get: jest.fn(),
    post: jest.fn(),
  } as unknown as jest.Mocked<HttpStart>;
  const childLogger = { warn: jest.fn() };
  const logger = {
    get: jest.fn().mockReturnValue(childLogger),
  } as unknown as jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a real `ContentInsightsClient` configured for the supplied domain id', async () => {
    http.post.mockResolvedValue(undefined);
    http.get.mockResolvedValue({ result: { count: 7 } });

    const service = createContentInsightsService({
      http,
      logger,
      domainId: 'dashboard',
    });

    service.track('dash-1', 'viewed');
    await expect(service.getStats('dash-1', 'viewed')).resolves.toEqual({ count: 7 });

    expect(service).toBeInstanceOf(ContentInsightsClient);
    expect(logger.get).toHaveBeenCalledWith('content_insights_client');
    expect(http.post).toHaveBeenCalledWith(
      '/internal/content_management/insights/dashboard/dash-1/viewed'
    );
    expect(http.get).toHaveBeenCalledWith(
      '/internal/content_management/insights/dashboard/dash-1/viewed/stats'
    );
  });
});
