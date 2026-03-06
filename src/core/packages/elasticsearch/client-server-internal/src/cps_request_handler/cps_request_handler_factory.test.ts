/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TransportRequestParams } from '@elastic/elasticsearch';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { PROJECT_ROUTING_ORIGIN, PROJECT_ROUTING_ALL, getSpaceNPRE } from '@kbn/cps-server-utils';
import { getRequestHandlerFactory } from './cps_request_handler_factory';

const makeSearchParams = (body?: Record<string, unknown>): TransportRequestParams => ({
  method: 'GET',
  path: '/_search',
  meta: { name: 'search', acceptedParams: ['project_routing'] },
  body: body ?? {},
});

describe('getRequestHandlerFactory', () => {
  describe('without request (internal user)', () => {
    it('injects PROJECT_ROUTING_ORIGIN when projectRouting is origin-only', () => {
      const factory = getRequestHandlerFactory(true);
      const handler = factory({ projectRouting: 'origin-only' });
      const params = makeSearchParams();

      handler({ scoped: false }, params, {});

      expect((params.body as Record<string, unknown>).project_routing).toBe(PROJECT_ROUTING_ORIGIN);
    });
  });

  describe("projectRouting: 'origin-only'", () => {
    it('injects PROJECT_ROUTING_ORIGIN when CPS is enabled', () => {
      const factory = getRequestHandlerFactory(true);
      const handler = factory({ projectRouting: 'origin-only' });
      const params = makeSearchParams();

      handler({ scoped: true }, params, {});

      expect((params.body as Record<string, unknown>).project_routing).toBe(PROJECT_ROUTING_ORIGIN);
    });

    it('strips project_routing when CPS is disabled', () => {
      const factory = getRequestHandlerFactory(false);
      const handler = factory({ projectRouting: 'origin-only' });
      const params = makeSearchParams({ project_routing: 'should-be-removed' });

      handler({ scoped: true }, params, {});

      expect((params.body as Record<string, unknown>).project_routing).toBeUndefined();
    });
  });

  describe("projectRouting: 'all'", () => {
    it('injects PROJECT_ROUTING_ALL when CPS is enabled', () => {
      const factory = getRequestHandlerFactory(true);
      const handler = factory({ projectRouting: 'all' });
      const params = makeSearchParams();

      handler({ scoped: true }, params, {});

      expect((params.body as Record<string, unknown>).project_routing).toBe(PROJECT_ROUTING_ALL);
    });
  });

  describe("projectRouting: 'space'", () => {
    it('injects the space NPRE derived from a KibanaRequest', () => {
      const factory = getRequestHandlerFactory(true);
      const request = httpServerMock.createKibanaRequest({ path: '/s/my-space/app/discover' });
      const handler = factory({ projectRouting: request });
      const params = makeSearchParams();

      handler({ scoped: true }, params, {});

      expect((params.body as Record<string, unknown>).project_routing).toBe(
        getSpaceNPRE('my-space')
      );
    });
  });
});
