/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, Observable } from 'rxjs';
import { createTestEnv, createTestPackageInfo } from '@kbn/config-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { analyticsClientMock } from './analytics_service.test.mocks';
import { AnalyticsService } from './analytics_service';

const packageInfo = createTestPackageInfo();

const createCoreContext = () => {
  const env = createTestEnv({ packageInfo });
  return mockCoreContext.create({ env });
};

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService = new AnalyticsService(createCoreContext());
  });

  test('should register the context provider `build info` on creation', async () => {
    expect(analyticsClientMock.registerContextProvider).toHaveBeenCalledTimes(1);
    await expect(
      await firstValueFrom(analyticsClientMock.registerContextProvider.mock.calls[0][0].context$)
    ).toEqual({
      branch: packageInfo.branch,
      version: packageInfo.version,
      buildNum: packageInfo.build.number,
      buildSha: packageInfo.build.sha,
      isDev: expect.any(Boolean),
      isDistributable: packageInfo.build.distributable,
    });
  });

  test('should register the `performance_metric` event type on creation', () => {
    expect(analyticsClientMock.registerEventType).toHaveBeenCalledTimes(1);
    expect(analyticsClientMock.registerEventType.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "eventType": "performance_metric",
          "schema": Object {
            "duration": Object {
              "_meta": Object {
                "description": "The main event duration in ms",
              },
              "type": "integer",
            },
            "eventName": Object {
              "_meta": Object {
                "description": "The name of the event that is tracked in the metrics i.e. kibana_loaded, kibana_started",
              },
              "type": "keyword",
            },
            "key1": Object {
              "_meta": Object {
                "description": "Performance metric label 1",
                "optional": true,
              },
              "type": "keyword",
            },
            "key2": Object {
              "_meta": Object {
                "description": "Performance metric label 2",
                "optional": true,
              },
              "type": "keyword",
            },
            "key3": Object {
              "_meta": Object {
                "description": "Performance metric label 3",
                "optional": true,
              },
              "type": "keyword",
            },
            "key4": Object {
              "_meta": Object {
                "description": "Performance metric label 4",
                "optional": true,
              },
              "type": "keyword",
            },
            "key5": Object {
              "_meta": Object {
                "description": "Performance metric label 5",
                "optional": true,
              },
              "type": "keyword",
            },
            "meta": Object {
              "_meta": Object {
                "description": "Meta data that is searchable but not aggregatable",
                "optional": true,
              },
              "type": "pass_through",
            },
            "value1": Object {
              "_meta": Object {
                "description": "Performance metric value 1",
                "optional": true,
              },
              "type": "long",
            },
            "value2": Object {
              "_meta": Object {
                "description": "Performance metric value 2",
                "optional": true,
              },
              "type": "long",
            },
            "value3": Object {
              "_meta": Object {
                "description": "Performance metric value 3",
                "optional": true,
              },
              "type": "long",
            },
            "value4": Object {
              "_meta": Object {
                "description": "Performance metric value 4",
                "optional": true,
              },
              "type": "long",
            },
            "value5": Object {
              "_meta": Object {
                "description": "Performance metric value 5",
                "optional": true,
              },
              "type": "long",
            },
          },
        },
      ]
    `);
  });

  test('setup should expose all the register APIs, reportEvent and opt-in', () => {
    expect(analyticsService.setup()).toStrictEqual({
      registerShipper: expect.any(Function),
      registerContextProvider: expect.any(Function),
      removeContextProvider: expect.any(Function),
      registerEventType: expect.any(Function),
      reportEvent: expect.any(Function),
      optIn: expect.any(Function),
      telemetryCounter$: expect.any(Observable),
    });
  });

  test('setup should expose only the APIs report and opt-in', () => {
    expect(analyticsService.start()).toStrictEqual({
      reportEvent: expect.any(Function),
      optIn: expect.any(Function),
      telemetryCounter$: expect.any(Observable),
    });
  });
});
