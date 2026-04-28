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

jest.mock('@kbn/content-management-content-insights-public', () => {
  const actual = jest.requireActual('@kbn/content-management-content-insights-public');
  return {
    ...actual,
    ContentInsightsClient: jest.fn().mockImplementation(function MockClient(this: unknown) {
      Object.assign(this as object, { __isMock: true });
    }),
  };
});

describe('createContentInsightsService', () => {
  const http = {} as HttpStart;
  const logger = { get: jest.fn().mockReturnValue({ warn: jest.fn() }) } as unknown as Logger;

  beforeEach(() => {
    (ContentInsightsClient as unknown as jest.Mock).mockClear();
  });

  it('instantiates `ContentInsightsClient` with the supplied core services and domain id', () => {
    const service = createContentInsightsService({
      http,
      logger,
      domainId: 'dashboard',
    });

    expect(ContentInsightsClient).toHaveBeenCalledTimes(1);
    expect(ContentInsightsClient).toHaveBeenCalledWith({ http, logger }, { domainId: 'dashboard' });
    expect(service).toMatchObject({ __isMock: true });
  });
});
