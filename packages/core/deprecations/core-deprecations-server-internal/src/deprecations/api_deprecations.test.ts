/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DeepPartial } from '@kbn/utility-types';
import { mockDeprecationsRegistry, mockDeprecationsFactory } from '../mocks';
import {
  registerApiDeprecationsInfo,
  buildApiDeprecationId,
  createGetApiDeprecations,
} from './api_deprecations';
import { RouterDeprecatedRouteDetails } from '@kbn/core-http-server';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import {
  coreUsageDataServiceMock,
  coreUsageStatsClientMock,
} from '@kbn/core-usage-data-server-mocks';
import _ from 'lodash';
import { CoreDeprecatedApiUsageStats } from '@kbn/core-usage-data-server';

describe('#registerApiDeprecationsInfo', () => {
  const deprecationsFactory = mockDeprecationsFactory.create();
  const deprecationsRegistry = mockDeprecationsRegistry.create();
  let usageClientMock: ReturnType<typeof coreUsageStatsClientMock.create>;
  let http: ReturnType<typeof httpServiceMock.createInternalSetupContract>;
  let coreUsageData: ReturnType<typeof coreUsageDataServiceMock.createSetupContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    usageClientMock = coreUsageStatsClientMock.create();
    http = httpServiceMock.createInternalSetupContract();
    coreUsageData = coreUsageDataServiceMock.createSetupContract(usageClientMock);
  });

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-10-17T12:06:41.224Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('registers api deprecations', async () => {
    deprecationsFactory.getRegistry.mockReturnValue(deprecationsRegistry);
    registerApiDeprecationsInfo({ deprecationsFactory, coreUsageData, http });

    expect(deprecationsFactory.getRegistry).toBeCalledWith('core.api_deprecations');
    expect(deprecationsRegistry.registerDeprecations).toBeCalledTimes(1);
    expect(deprecationsRegistry.registerDeprecations).toBeCalledWith({
      getDeprecations: expect.any(Function),
    });
  });

  describe('#createGetApiDeprecations', () => {
    const createDeprecatedRouteDetails = (
      overrides?: DeepPartial<RouterDeprecatedRouteDetails>
    ): RouterDeprecatedRouteDetails =>
      _.merge(
        {
          routeDeprecationOptions: {
            documentationUrl: 'https://fake-url',
            severity: 'critical',
            reason: {
              type: 'remove',
            },
          },
          routeMethod: 'get',
          routePath: '/api/test/',
          routeVersion: '123',
        } as RouterDeprecatedRouteDetails,
        overrides
      );

    const createApiUsageStat = (
      apiId: string,
      overrides?: DeepPartial<CoreDeprecatedApiUsageStats>
    ): CoreDeprecatedApiUsageStats =>
      _.merge(
        {
          apiId,
          totalMarkedAsResolved: 1,
          markedAsResolvedLastCalledAt: '2024-10-17T12:06:41.224Z',
          apiTotalCalls: 13,
          apiLastCalledAt: '2024-09-01T10:06:41.224Z',
        },
        overrides
      );

    it('returns removed type deprecated route', async () => {
      const getDeprecations = createGetApiDeprecations({ coreUsageData, http });
      const deprecatedRoute = createDeprecatedRouteDetails({
        routePath: '/api/test_removed/',
        routeDeprecationOptions: { reason: { type: 'remove' } },
      });
      http.getRegisteredDeprecatedApis.mockReturnValue([deprecatedRoute]);
      usageClientMock.getDeprecatedApiUsageStats.mockResolvedValue([
        createApiUsageStat(buildApiDeprecationId(deprecatedRoute)),
      ]);

      const deprecations = await getDeprecations();
      expect(deprecations).toMatchInlineSnapshot(`
        Array [
          Object {
            "apiId": "123|get|/api/test_removed",
            "correctiveActions": Object {
              "manualSteps": Array [
                "Identify the origin of these API calls.",
                "This API no longer exists and no replacement is available. Delete any requests you have that use this API.",
                "Check that you are no longer using the old API in any requests, and mark this issue as resolved. It will no longer appear in the Upgrade Assistant unless another call using this API is detected.",
              ],
              "mark_as_resolved_api": Object {
                "apiTotalCalls": 13,
                "routeMethod": "get",
                "routePath": "/api/test_removed/",
                "routeVersion": "123",
                "timestamp": 2024-10-17T12:06:41.224Z,
                "totalMarkedAsResolved": 1,
              },
            },
            "deprecationType": "api",
            "documentationUrl": "https://fake-url",
            "domainId": "core.routes-deprecations",
            "level": "critical",
            "message": Array [
              "The API \\"GET /api/test_removed/\\" has been called 13 times. The last call was on Sunday, September 1, 2024 6:06 AM -04:00.",
              "This issue has been marked as resolved on Thursday, October 17, 2024 8:06 AM -04:00 but the API has been called 12 times since.",
            ],
            "title": "The \\"GET /api/test_removed/\\" route is removed",
          },
        ]
      `);
    });

    it('returns migrated type deprecated route', async () => {
      const getDeprecations = createGetApiDeprecations({ coreUsageData, http });
      const deprecatedRoute = createDeprecatedRouteDetails({
        routePath: '/api/test_migrated/',
        routeDeprecationOptions: {
          reason: { type: 'migrate', newApiMethod: 'post', newApiPath: '/api/new_path' },
        },
      });
      http.getRegisteredDeprecatedApis.mockReturnValue([deprecatedRoute]);
      usageClientMock.getDeprecatedApiUsageStats.mockResolvedValue([
        createApiUsageStat(buildApiDeprecationId(deprecatedRoute)),
      ]);

      const deprecations = await getDeprecations();
      expect(deprecations).toMatchInlineSnapshot(`
        Array [
          Object {
            "apiId": "123|get|/api/test_migrated",
            "correctiveActions": Object {
              "manualSteps": Array [
                "Identify the origin of these API calls.",
                "Update the requests to use the following new API instead: \\"POST /api/new_path\\".",
                "Check that you are no longer using the old API in any requests, and mark this issue as resolved. It will no longer appear in the Upgrade Assistant unless another call using this API is detected.",
              ],
              "mark_as_resolved_api": Object {
                "apiTotalCalls": 13,
                "routeMethod": "get",
                "routePath": "/api/test_migrated/",
                "routeVersion": "123",
                "timestamp": 2024-10-17T12:06:41.224Z,
                "totalMarkedAsResolved": 1,
              },
            },
            "deprecationType": "api",
            "documentationUrl": "https://fake-url",
            "domainId": "core.routes-deprecations",
            "level": "critical",
            "message": Array [
              "The API \\"GET /api/test_migrated/\\" has been called 13 times. The last call was on Sunday, September 1, 2024 6:06 AM -04:00.",
              "This issue has been marked as resolved on Thursday, October 17, 2024 8:06 AM -04:00 but the API has been called 12 times since.",
            ],
            "title": "The \\"GET /api/test_migrated/\\" route is migrated to a different API",
          },
        ]
      `);
    });

    it('returns bumped type deprecated route', async () => {
      const getDeprecations = createGetApiDeprecations({ coreUsageData, http });
      const deprecatedRoute = createDeprecatedRouteDetails({
        routePath: '/api/test_bumped/',
        routeDeprecationOptions: { reason: { type: 'bump', newApiVersion: '444' } },
      });
      http.getRegisteredDeprecatedApis.mockReturnValue([deprecatedRoute]);
      usageClientMock.getDeprecatedApiUsageStats.mockResolvedValue([
        createApiUsageStat(buildApiDeprecationId(deprecatedRoute)),
      ]);

      const deprecations = await getDeprecations();
      expect(deprecations).toMatchInlineSnapshot(`
        Array [
          Object {
            "apiId": "123|get|/api/test_bumped",
            "correctiveActions": Object {
              "manualSteps": Array [
                "Identify the origin of these API calls.",
                "Update the requests to use the following new version of the API instead: \\"444\\".",
                "Check that you are no longer using the old API in any requests, and mark this issue as resolved. It will no longer appear in the Upgrade Assistant unless another call using this API is detected.",
              ],
              "mark_as_resolved_api": Object {
                "apiTotalCalls": 13,
                "routeMethod": "get",
                "routePath": "/api/test_bumped/",
                "routeVersion": "123",
                "timestamp": 2024-10-17T12:06:41.224Z,
                "totalMarkedAsResolved": 1,
              },
            },
            "deprecationType": "api",
            "documentationUrl": "https://fake-url",
            "domainId": "core.routes-deprecations",
            "level": "critical",
            "message": Array [
              "The API \\"GET /api/test_bumped/\\" has been called 13 times. The last call was on Sunday, September 1, 2024 6:06 AM -04:00.",
              "This issue has been marked as resolved on Thursday, October 17, 2024 8:06 AM -04:00 but the API has been called 12 times since.",
            ],
            "title": "The \\"GET /api/test_bumped/\\" route has a newer version available",
          },
        ]
      `);
    });

    it('does not return resolved deprecated route', async () => {
      const getDeprecations = createGetApiDeprecations({ coreUsageData, http });
      const deprecatedRoute = createDeprecatedRouteDetails({ routePath: '/api/test_resolved/' });
      http.getRegisteredDeprecatedApis.mockReturnValue([deprecatedRoute]);
      usageClientMock.getDeprecatedApiUsageStats.mockResolvedValue([
        createApiUsageStat(buildApiDeprecationId(deprecatedRoute), {
          apiTotalCalls: 5,
          totalMarkedAsResolved: 5,
        }),
      ]);

      const deprecations = await getDeprecations();
      expect(deprecations).toEqual([]);
    });

    it('returns never resolved deprecated route', async () => {
      const getDeprecations = createGetApiDeprecations({ coreUsageData, http });
      const deprecatedRoute = createDeprecatedRouteDetails({
        routePath: '/api/test_never_resolved/',
      });
      http.getRegisteredDeprecatedApis.mockReturnValue([deprecatedRoute]);
      usageClientMock.getDeprecatedApiUsageStats.mockResolvedValue([
        createApiUsageStat(buildApiDeprecationId(deprecatedRoute), {
          totalMarkedAsResolved: 0,
          markedAsResolvedLastCalledAt: undefined,
        }),
      ]);

      const deprecations = await getDeprecations();
      expect(deprecations).toMatchInlineSnapshot(`
        Array [
          Object {
            "apiId": "123|get|/api/test_never_resolved",
            "correctiveActions": Object {
              "manualSteps": Array [
                "Identify the origin of these API calls.",
                "This API no longer exists and no replacement is available. Delete any requests you have that use this API.",
                "Check that you are no longer using the old API in any requests, and mark this issue as resolved. It will no longer appear in the Upgrade Assistant unless another call using this API is detected.",
              ],
              "mark_as_resolved_api": Object {
                "apiTotalCalls": 13,
                "routeMethod": "get",
                "routePath": "/api/test_never_resolved/",
                "routeVersion": "123",
                "timestamp": 2024-10-17T12:06:41.224Z,
                "totalMarkedAsResolved": 0,
              },
            },
            "deprecationType": "api",
            "documentationUrl": "https://fake-url",
            "domainId": "core.routes-deprecations",
            "level": "critical",
            "message": Array [
              "The API \\"GET /api/test_never_resolved/\\" has been called 13 times. The last call was on Sunday, September 1, 2024 6:06 AM -04:00.",
            ],
            "title": "The \\"GET /api/test_never_resolved/\\" route is removed",
          },
        ]
      `);
    });

    it('does not return deprecated routes that have never been called', async () => {
      const getDeprecations = createGetApiDeprecations({ coreUsageData, http });
      const deprecatedRoute = createDeprecatedRouteDetails({
        routePath: '/api/test_never_resolved/',
      });
      http.getRegisteredDeprecatedApis.mockReturnValue([deprecatedRoute]);
      usageClientMock.getDeprecatedApiUsageStats.mockResolvedValue([]);
      expect(await getDeprecations()).toEqual([]);

      usageClientMock.getDeprecatedApiUsageStats.mockResolvedValue([
        createApiUsageStat(buildApiDeprecationId(deprecatedRoute), {
          apiTotalCalls: 0,
          apiLastCalledAt: undefined,
          totalMarkedAsResolved: 0,
          markedAsResolvedLastCalledAt: undefined,
        }),
      ]);
      expect(await getDeprecations()).toEqual([]);
    });
  });
});

describe('#buildApiDeprecationId', () => {
  it('returns apiDeprecationId string for versioned routes', () => {
    const apiDeprecationId = buildApiDeprecationId({
      routeMethod: 'get',
      routePath: '/api/test',
      routeVersion: '10-10-2023',
    });
    expect(apiDeprecationId).toBe('10-10-2023|get|/api/test');
  });

  it('returns apiDeprecationId string for unversioned routes', () => {
    const apiDeprecationId = buildApiDeprecationId({
      routeMethod: 'get',
      routePath: '/api/test',
    });
    expect(apiDeprecationId).toBe('unversioned|get|/api/test');
  });

  it('gives the same ID the route method is capitalized or not', () => {
    const apiDeprecationId = buildApiDeprecationId({
      // @ts-expect-error
      routeMethod: 'GeT',
      routePath: '/api/test',
      routeVersion: '10-10-2023',
    });

    expect(apiDeprecationId).toBe('10-10-2023|get|/api/test');
  });

  it('gives the same ID the route path has a trailing slash or not', () => {
    const apiDeprecationId = buildApiDeprecationId({
      // @ts-expect-error
      routeMethod: 'GeT',
      routePath: '/api/test/',
      routeVersion: '10-10-2023',
    });

    expect(apiDeprecationId).toBe('10-10-2023|get|/api/test');
  });
});
