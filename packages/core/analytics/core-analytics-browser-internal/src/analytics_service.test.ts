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
    expect(
      await firstValueFrom(analyticsClientMock.registerContextProvider.mock.calls[0][0].context$)
    ).toMatchInlineSnapshot(`
            Object {
              "branch": "branch",
              "buildNum": 100,
              "buildSha": "buildSha",
              "isDev": true,
              "isDistributable": false,
              "version": "version",
            }
          `);
    expect(
      await firstValueFrom(analyticsClientMock.registerContextProvider.mock.calls[1][0].context$)
    ).toEqual({ session_id: expect.any(String) });
    expect(
      await firstValueFrom(analyticsClientMock.registerContextProvider.mock.calls[2][0].context$)
    ).toEqual({
      preferred_language: 'en-US',
      preferred_languages: ['en-US', 'en'],
      user_agent: expect.any(String),
    });
  });

  test('should register the `performance_metric` and `click` event types on creation', () => {
    expect(analyticsClientMock.registerEventType).toHaveBeenCalledTimes(2);
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
    expect(analyticsClientMock.registerEventType.mock.calls[1]).toMatchInlineSnapshot(`
      Array [
        Object {
          "eventType": "click",
          "schema": Object {
            "target": Object {
              "items": Object {
                "_meta": Object {
                  "description": "The attributes of the clicked element and all its parents in the form \`{attr.name}={attr.value}\`. It allows finding the clicked elements by looking up its attributes like \\"data-test-subj=my-button\\".",
                },
                "type": "keyword",
              },
              "type": "array",
            },
          },
        },
      ]
    `);
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
    expect(
      await firstValueFrom(analyticsClientMock.registerContextProvider.mock.calls[3][0].context$)
    ).toMatchInlineSnapshot(`undefined`);
  });

  test('setup should register the elasticsearch info context provider (with info)', async () => {
    const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    injectedMetadata.getElasticsearchInfo.mockReturnValue({
      cluster_name: 'cluster_name',
      cluster_uuid: 'cluster_uuid',
      cluster_version: 'version',
    });
    analyticsService.setup({ injectedMetadata });
    expect(
      await firstValueFrom(analyticsClientMock.registerContextProvider.mock.calls[3][0].context$)
    ).toMatchInlineSnapshot(`
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
