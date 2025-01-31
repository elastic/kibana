/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DeepPartial } from '@kbn/utility-types';
import { mockDeprecationsRegistry, mockDeprecationsFactory } from '../../mocks';
import {
  registerApiDeprecationsInfo,
  createGetApiDeprecations,
} from './register_api_depercation_info';
import { buildApiDeprecationId } from './api_deprecation_id';
import type {
  RouterAccessDeprecatedApiDetails,
  RouterDeprecatedApiDetails,
} from '@kbn/core-http-server';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import {
  coreUsageDataServiceMock,
  coreUsageStatsClientMock,
} from '@kbn/core-usage-data-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import _ from 'lodash';
import type { DocLinksServiceSetup } from '@kbn/core-doc-links-server';
import { CoreDeprecatedApiUsageStats } from '@kbn/core-usage-data-server';

describe('#registerApiDeprecationsInfo', () => {
  const deprecationsFactory = mockDeprecationsFactory.create();
  const deprecationsRegistry = mockDeprecationsRegistry.create();
  const docLinks: DocLinksServiceSetup = docLinksServiceMock.createSetupContract();
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
    registerApiDeprecationsInfo({ deprecationsFactory, coreUsageData, http, docLinks });

    expect(deprecationsFactory.getRegistry).toBeCalledWith('core.api_deprecations');
    expect(deprecationsRegistry.registerDeprecations).toBeCalledTimes(1);
    expect(deprecationsRegistry.registerDeprecations).toBeCalledWith({
      getDeprecations: expect.any(Function),
    });
  });

  describe('#createGetApiDeprecations', () => {
    const createDeprecatedRouteDetails = (
      overrides?: DeepPartial<RouterDeprecatedApiDetails>
    ): RouterDeprecatedApiDetails =>
      _.merge(
        {
          routeAccess: 'public',
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
        } as RouterDeprecatedApiDetails,
        overrides
      );

    const createInternalRouteDetails = (
      overrides?: Partial<RouterAccessDeprecatedApiDetails>
    ): RouterAccessDeprecatedApiDetails =>
      _.merge(
        {
          routeAccess: 'internal',
          routeMethod: 'post',
          routePath: '/internal/api/',
          routeVersion: '1.0.0',
        } as RouterAccessDeprecatedApiDetails,
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
      const getDeprecations = createGetApiDeprecations({ coreUsageData, http, docLinks });
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
            "domainId": "core.http.routes-deprecations",
            "level": "critical",
            "message": Array [
              "The API \\"GET /api/test_removed/\\" has been called 13 times. The last call was on Sunday, September 1, 2024 6:06 AM -04:00.",
              Object {
                "content": "To include information about deprecated API calls in debug logs, edit your Kibana configuration as detailed in [the documentation](https://www.elastic.co/guide/en/kibana/test-branch/logging-settings.html#enable-http-debug-logs).",
                "type": "markdown",
              },
              "This issue has been marked as resolved on Thursday, October 17, 2024 8:06 AM -04:00 but the API has been called 12 times since.",
            ],
            "title": "The \\"GET /api/test_removed/\\" route is removed",
          },
        ]
      `);
    });

    it('returns migrated type deprecated route', async () => {
      const getDeprecations = createGetApiDeprecations({ coreUsageData, http, docLinks });
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
            "domainId": "core.http.routes-deprecations",
            "level": "critical",
            "message": Array [
              "The API \\"GET /api/test_migrated/\\" has been called 13 times. The last call was on Sunday, September 1, 2024 6:06 AM -04:00.",
              Object {
                "content": "To include information about deprecated API calls in debug logs, edit your Kibana configuration as detailed in [the documentation](https://www.elastic.co/guide/en/kibana/test-branch/logging-settings.html#enable-http-debug-logs).",
                "type": "markdown",
              },
              "This issue has been marked as resolved on Thursday, October 17, 2024 8:06 AM -04:00 but the API has been called 12 times since.",
            ],
            "title": "The \\"GET /api/test_migrated/\\" route is migrated to a different API",
          },
        ]
      `);
    });

    it('returns bumped type deprecated route', async () => {
      const getDeprecations = createGetApiDeprecations({ coreUsageData, http, docLinks });
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
            "domainId": "core.http.routes-deprecations",
            "level": "critical",
            "message": Array [
              "The API \\"GET /api/test_bumped/\\" has been called 13 times. The last call was on Sunday, September 1, 2024 6:06 AM -04:00.",
              Object {
                "content": "To include information about deprecated API calls in debug logs, edit your Kibana configuration as detailed in [the documentation](https://www.elastic.co/guide/en/kibana/test-branch/logging-settings.html#enable-http-debug-logs).",
                "type": "markdown",
              },
              "This issue has been marked as resolved on Thursday, October 17, 2024 8:06 AM -04:00 but the API has been called 12 times since.",
            ],
            "title": "The \\"GET /api/test_bumped/\\" route has a newer version available",
          },
        ]
      `);
    });

    it('returns deprecated type deprecated route', async () => {
      const getDeprecations = createGetApiDeprecations({ coreUsageData, http, docLinks });
      const deprecatedRoute = createDeprecatedRouteDetails({
        routePath: '/api/test_deprecated/',
        routeDeprecationOptions: { reason: { type: 'deprecate' }, message: 'additional message' },
      });
      http.getRegisteredDeprecatedApis.mockReturnValue([deprecatedRoute]);
      usageClientMock.getDeprecatedApiUsageStats.mockResolvedValue([
        createApiUsageStat(buildApiDeprecationId(deprecatedRoute)),
      ]);

      const deprecations = await getDeprecations();
      expect(deprecations).toMatchInlineSnapshot(`
        Array [
          Object {
            "apiId": "123|get|/api/test_deprecated",
            "correctiveActions": Object {
              "manualSteps": Array [
                "Identify the origin of these API calls.",
                "For now, the API will still work, but will be moved or removed in a future version. Check the Learn more link for more information. If you are no longer using the API, you can mark this issue as resolved. It will no longer appear in the Upgrade Assistant unless another call using this API is detected.",
              ],
              "mark_as_resolved_api": Object {
                "apiTotalCalls": 13,
                "routeMethod": "get",
                "routePath": "/api/test_deprecated/",
                "routeVersion": "123",
                "timestamp": 2024-10-17T12:06:41.224Z,
                "totalMarkedAsResolved": 1,
              },
            },
            "deprecationType": "api",
            "documentationUrl": "https://fake-url",
            "domainId": "core.http.routes-deprecations",
            "level": "critical",
            "message": Array [
              "The API \\"GET /api/test_deprecated/\\" has been called 13 times. The last call was on Sunday, September 1, 2024 6:06 AM -04:00.",
              Object {
                "content": "To include information about deprecated API calls in debug logs, edit your Kibana configuration as detailed in [the documentation](https://www.elastic.co/guide/en/kibana/test-branch/logging-settings.html#enable-http-debug-logs).",
                "type": "markdown",
              },
              "This issue has been marked as resolved on Thursday, October 17, 2024 8:06 AM -04:00 but the API has been called 12 times since.",
              "additional message",
            ],
            "title": "The \\"GET /api/test_deprecated/\\" route is deprecated",
          },
        ]
      `);
    });

    it('does not return resolved deprecated route', async () => {
      const getDeprecations = createGetApiDeprecations({ coreUsageData, http, docLinks });
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
      const getDeprecations = createGetApiDeprecations({ coreUsageData, http, docLinks });
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
            "domainId": "core.http.routes-deprecations",
            "level": "critical",
            "message": Array [
              "The API \\"GET /api/test_never_resolved/\\" has been called 13 times. The last call was on Sunday, September 1, 2024 6:06 AM -04:00.",
              Object {
                "content": "To include information about deprecated API calls in debug logs, edit your Kibana configuration as detailed in [the documentation](https://www.elastic.co/guide/en/kibana/test-branch/logging-settings.html#enable-http-debug-logs).",
                "type": "markdown",
              },
            ],
            "title": "The \\"GET /api/test_never_resolved/\\" route is removed",
          },
        ]
      `);
    });

    it('returns internal route access deprecation', async () => {
      const getDeprecations = createGetApiDeprecations({ coreUsageData, http, docLinks });
      const deprecatedRoute = createInternalRouteDetails({});
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
            "apiId": "1.0.0|post|/internal/api",
            "correctiveActions": Object {
              "manualSteps": Array [
                "Identify the origin of these API calls.",
                "Delete any requests you have that use this API. Check the learn more link for possible alternatives.",
                "Once you have successfully stopped using this API, mark this issue as resolved. It will no longer appear in the Upgrade Assistant unless another call using this API is detected.",
              ],
              "mark_as_resolved_api": Object {
                "apiTotalCalls": 13,
                "routeMethod": "post",
                "routePath": "/internal/api/",
                "routeVersion": "1.0.0",
                "timestamp": 2024-10-17T12:06:41.224Z,
                "totalMarkedAsResolved": 0,
              },
            },
            "deprecationType": "api",
            "documentationUrl": undefined,
            "domainId": "core.http.access-deprecations",
            "level": "warning",
            "message": Array [
              "The API \\"POST /internal/api/\\" has been called 13 times. The last call was on Sunday, September 1, 2024 6:06 AM -04:00.",
              "Internal APIs are meant to be used by Elastic services only. You should not use them. External access to these APIs will be restricted.",
              Object {
                "content": "To include information in debug logs about calls to APIs that are internal to Elastic, edit your Kibana configuration as detailed in [the documentation](https://www.elastic.co/guide/en/kibana/test-branch/logging-settings.html#enable-http-debug-logs).",
                "type": "markdown",
              },
            ],
            "title": "The \\"POST /internal/api/\\" API is internal to Elastic",
          },
        ]
      `);
    });

    it('does not return deprecated routes that have never been called', async () => {
      const getDeprecations = createGetApiDeprecations({ coreUsageData, http, docLinks });
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
