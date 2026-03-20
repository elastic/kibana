/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TransportRequestParams } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { PROJECT_ROUTING_ORIGIN, getSpaceNPRE } from '@kbn/cps-server-utils';
import { loggerMock } from '@kbn/logging-mocks';
import { getRequestHandlerFactory } from './cps_request_handler_factory';

const makeSearchParams = (body?: Record<string, unknown>): TransportRequestParams => ({
  method: 'GET',
  path: '/_search',
  meta: { name: 'search', acceptedParams: ['project_routing'] },
  body: body ?? {},
});

describe('getRequestHandlerFactory', () => {
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = loggerMock.create();
  });

  describe('without request (internal user)', () => {
    it('injects PROJECT_ROUTING_ORIGIN when no opts are passed', () => {
      const factory = getRequestHandlerFactory(true);
      const handler = factory({ logger: mockLogger });
      const params = makeSearchParams();

      handler({ scoped: false }, params, {}, mockLogger);

      expect((params.body as Record<string, unknown>).project_routing).toBe(PROJECT_ROUTING_ORIGIN);
    });
  });

  describe("projectRouting: 'space'", () => {
    it('injects the space NPRE derived from a KibanaRequest', () => {
      const factory = getRequestHandlerFactory(true);
      const request = httpServerMock.createKibanaRequest({ path: '/s/my-space/app/discover' });
      const handler = factory({ projectRouting: 'space', request, logger: mockLogger });
      const params = makeSearchParams();

      handler({ scoped: true }, params, {}, mockLogger);

      expect((params.body as Record<string, unknown>).project_routing).toBe(
        getSpaceNPRE('my-space')
      );
    });
  });
});
