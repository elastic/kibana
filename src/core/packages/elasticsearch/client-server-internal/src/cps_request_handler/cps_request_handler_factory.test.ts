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

    it('uses basePath when provided so rewritten URLs still resolve the space NPRE', () => {
      const basePath = {
        serverBasePath: '',
        get: jest.fn().mockReturnValue('/s/from-base-path'),
      };
      const factory = getRequestHandlerFactory(true, true, { basePath });
      const request = httpServerMock.createKibanaRequest({
        path: '/api/detection_engine/rules/preview',
      });
      const handler = factory({ projectRouting: 'space', request, logger: mockLogger });
      const params = makeSearchParams();

      handler({ scoped: true }, params, {}, mockLogger);

      expect((params.body as Record<string, unknown>).project_routing).toBe(
        getSpaceNPRE('from-base-path')
      );
      expect(basePath.get).toHaveBeenCalledWith(request);
    });
  });

  describe('timing context', () => {
    it('sets timing context for internal user', () => {
      const factory = getRequestHandlerFactory(true);
      const handler = factory({ logger: mockLogger });
      const params = makeSearchParams();
      const options = {};

      handler({ scoped: false }, params, options, mockLogger);

      expect((options as any).context).toBeDefined();
      expect((options as any).context.timingContext).toBeDefined();
      expect((options as any).context.timingContext.startTime).toBeGreaterThan(0);
    });

    it('sets timing context with kibanaRequest for scoped user', () => {
      const factory = getRequestHandlerFactory(true);
      const request = httpServerMock.createKibanaRequest({ path: '/s/my-space/app/discover' });
      const handler = factory({ projectRouting: 'space', request, logger: mockLogger });
      const params = makeSearchParams();
      const options = {};

      handler({ scoped: true }, params, options, mockLogger);

      expect((options as any).context).toBeDefined();
      expect((options as any).context.timingContext).toBeDefined();
      expect((options as any).context.timingContext.startTime).toBeGreaterThan(0);
      expect((options as any).context.timingContext.kibanaRequest).toBe(request);
    });

    it('sets both timing and CPS contexts', () => {
      const factory = getRequestHandlerFactory(true);
      const request = httpServerMock.createKibanaRequest({ path: '/s/my-space/app/discover' });
      const handler = factory({ projectRouting: 'space', request, logger: mockLogger });
      const params = makeSearchParams();
      const options = {};

      handler({ scoped: true }, params, options, mockLogger);

      expect((options as any).context.timingContext).toBeDefined();
      expect((options as any).context.cpsRoutingContext).toBeDefined();
    });

    it('does not set timing context when esTimingEnabled is false', () => {
      const factory = getRequestHandlerFactory(true, false);
      const request = httpServerMock.createKibanaRequest({ path: '/s/my-space/app/discover' });
      const handler = factory({ projectRouting: 'space', request, logger: mockLogger });
      const params = makeSearchParams();
      const options = {};

      handler({ scoped: true }, params, options, mockLogger);

      expect((options as any).context?.timingContext).toBeUndefined();
      expect((options as any).context?.cpsRoutingContext).toBeDefined();
    });

    it('sets timing context when esTimingEnabled is true (explicit)', () => {
      const factory = getRequestHandlerFactory(true, true);
      const handler = factory({ logger: mockLogger });
      const params = makeSearchParams();
      const options = {};

      handler({ scoped: false }, params, options, mockLogger);

      expect((options as any).context).toBeDefined();
      expect((options as any).context.timingContext).toBeDefined();
      expect((options as any).context.timingContext.startTime).toBeGreaterThan(0);
    });

    it('defaults esTimingEnabled to true when not specified', () => {
      const factory = getRequestHandlerFactory(true);
      const handler = factory({ logger: mockLogger });
      const params = makeSearchParams();
      const options = {};

      handler({ scoped: false }, params, options, mockLogger);

      expect((options as any).context).toBeDefined();
      expect((options as any).context.timingContext).toBeDefined();
    });
  });
});
