/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, Observable } from 'rxjs';
import { coreContextMock } from '@kbn/core-base-browser-mocks';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import { analyticsClientMock } from './analytics_service.test.mocks';
import { AnalyticsService } from './analytics_service';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService = new AnalyticsService(coreContextMock.create());
  });
  test('should register some context providers on creation', async () => {
    expect(analyticsClientMock.registerContextProvider).toHaveBeenCalledTimes(3);
    await expect(
      firstValueFrom(analyticsClientMock.registerContextProvider.mock.calls[0][0].context$)
    ).resolves.toMatchInlineSnapshot(`
      Object {
        "branch": "branch",
        "buildNum": 100,
        "buildSha": "buildSha",
        "isDev": true,
        "isDistributable": false,
        "version": "version",
      }
    `);
    await expect(
      firstValueFrom(analyticsClientMock.registerContextProvider.mock.calls[1][0].context$)
    ).resolves.toEqual({ session_id: expect.any(String) });
    await expect(
      firstValueFrom(analyticsClientMock.registerContextProvider.mock.calls[2][0].context$)
    ).resolves.toEqual({
      preferred_language: 'en-US',
      preferred_languages: ['en-US', 'en'],
      user_agent: expect.any(String),
    });
  });

  test('setup should expose all the register APIs, reportEvent and opt-in', () => {
    const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    expect(analyticsService.setup({ injectedMetadata })).toStrictEqual({
      registerShipper: expect.any(Function),
      registerContextProvider: expect.any(Function),
      removeContextProvider: expect.any(Function),
      registerEventType: expect.any(Function),
      reportEvent: expect.any(Function),
      optIn: expect.any(Function),
      telemetryCounter$: expect.any(Observable),
    });
  });

  test('setup should register the elasticsearch info context provider (undefined)', async () => {
    const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    analyticsService.setup({ injectedMetadata });
    await expect(
      firstValueFrom(analyticsClientMock.registerContextProvider.mock.calls[3][0].context$)
    ).resolves.toMatchInlineSnapshot(`undefined`);
  });

  test('setup should register the elasticsearch info context provider (with info)', async () => {
    const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    injectedMetadata.getElasticsearchInfo.mockReturnValue({
      cluster_name: 'cluster_name',
      cluster_uuid: 'cluster_uuid',
      cluster_version: 'version',
    });
    analyticsService.setup({ injectedMetadata });
    await expect(
      firstValueFrom(analyticsClientMock.registerContextProvider.mock.calls[3][0].context$)
    ).resolves.toMatchInlineSnapshot(`
      Object {
        "cluster_name": "cluster_name",
        "cluster_uuid": "cluster_uuid",
        "cluster_version": "version",
      }
    `);
  });

  test('setup should expose only the APIs report and opt-in', () => {
    expect(analyticsService.start()).toStrictEqual({
      reportEvent: expect.any(Function),
      optIn: expect.any(Function),
      telemetryCounter$: expect.any(Observable),
    });
  });
});
