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
import {
  PROJECT_ROUTING_ORIGIN,
  PROJECT_ROUTING_ALL,
  KBN_PROJECT_ROUTING_HEADER,
  getSpaceNPRE,
} from '@kbn/cps-server-utils';
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
    it('injects PROJECT_ROUTING_ORIGIN when projectRouting is origin-only', () => {
      const factory = getRequestHandlerFactory(true);
      const handler = factory({ projectRouting: 'origin-only', logger: mockLogger });
      const params = makeSearchParams();

      handler({ scoped: false }, params, {}, mockLogger);

      expect((params.body as Record<string, unknown>).project_routing).toBe(PROJECT_ROUTING_ORIGIN);
    });
  });

  describe("projectRouting: 'origin-only'", () => {
    it('injects PROJECT_ROUTING_ORIGIN when CPS is enabled', () => {
      const factory = getRequestHandlerFactory(true);
      const handler = factory({ projectRouting: 'origin-only', logger: mockLogger });
      const params = makeSearchParams();

      handler({ scoped: true }, params, {}, mockLogger);

      expect((params.body as Record<string, unknown>).project_routing).toBe(PROJECT_ROUTING_ORIGIN);
    });

    it('strips project_routing when CPS is disabled', () => {
      const factory = getRequestHandlerFactory(false);
      const handler = factory({ projectRouting: 'origin-only', logger: mockLogger });
      const params = makeSearchParams({ project_routing: 'should-be-removed' });

      handler({ scoped: true }, params, {}, mockLogger);

      expect((params.body as Record<string, unknown>).project_routing).toBeUndefined();
    });
  });

  describe("projectRouting: 'all'", () => {
    it('injects PROJECT_ROUTING_ALL when CPS is enabled', () => {
      const factory = getRequestHandlerFactory(true);
      const handler = factory({ projectRouting: 'all', logger: mockLogger });
      const params = makeSearchParams();

      handler({ scoped: true }, params, {}, mockLogger);

      expect((params.body as Record<string, unknown>).project_routing).toBe(PROJECT_ROUTING_ALL);
    });
  });

  describe("projectRouting: 'space-npre'", () => {
    it('injects the space NPRE derived from a KibanaRequest', () => {
      const factory = getRequestHandlerFactory(true);
      const request = httpServerMock.createKibanaRequest({ path: '/s/my-space/app/discover' });
      const handler = factory({ projectRouting: 'space-npre', request, logger: mockLogger });
      const params = makeSearchParams();

      handler({ scoped: true }, params, {}, mockLogger);

      expect((params.body as Record<string, unknown>).project_routing).toBe(
        getSpaceNPRE('my-space')
      );
    });
  });

  describe("projectRouting: 'request-header'", () => {
    it('injects the routing value from the x-kbn-project-routing header when present', () => {
      const factory = getRequestHandlerFactory(true);
      const request = httpServerMock.createKibanaRequest({
        headers: { [KBN_PROJECT_ROUTING_HEADER]: '_alias:*' },
      });
      const handler = factory({ projectRouting: 'request-header', request, logger: mockLogger });
      const params = makeSearchParams();

      handler({ scoped: true }, params, {}, mockLogger);

      expect((params.body as Record<string, unknown>).project_routing).toBe('_alias:*');
    });

    it('falls back to PROJECT_ROUTING_ORIGIN when the header is absent', () => {
      const factory = getRequestHandlerFactory(true);
      const request = httpServerMock.createKibanaRequest();
      const handler = factory({ projectRouting: 'request-header', request, logger: mockLogger });
      const params = makeSearchParams();

      handler({ scoped: true }, params, {}, mockLogger);

      expect((params.body as Record<string, unknown>).project_routing).toBe(PROJECT_ROUTING_ORIGIN);
    });

    it('takes the first value when the header is an array', () => {
      const factory = getRequestHandlerFactory(true);
      // Use a plain FakeRequest so the headers object is mutable, allowing us to set
      // an array value that simulates multi-value HTTP header parsing by Node.js.
      const request = {
        headers: { [KBN_PROJECT_ROUTING_HEADER]: ['_alias:_origin', '_alias:*'] },
      };
      const handler = factory({ projectRouting: 'request-header', request, logger: mockLogger });
      const params = makeSearchParams();

      handler({ scoped: true }, params, {}, mockLogger);

      expect((params.body as Record<string, unknown>).project_routing).toBe('_alias:_origin');
    });

    it('strips project_routing when CPS is disabled, regardless of header', () => {
      const factory = getRequestHandlerFactory(false);
      const request = httpServerMock.createKibanaRequest({
        headers: { [KBN_PROJECT_ROUTING_HEADER]: '_alias:*' },
      });
      const handler = factory({ projectRouting: 'request-header', request, logger: mockLogger });
      const params = makeSearchParams({ project_routing: 'should-be-removed' });

      handler({ scoped: true }, params, {}, mockLogger);

      expect((params.body as Record<string, unknown>).project_routing).toBeUndefined();
    });
  });
});
