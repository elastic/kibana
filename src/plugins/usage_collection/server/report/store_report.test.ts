/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { storeApplicationUsageMock } from './store_report.test.mocks';

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { storeReport } from './store_report';
import { ReportSchemaType } from './schema';
import { METRIC_TYPE } from '@kbn/analytics';
import { usageCountersServiceMock } from '../usage_counters/usage_counters_service.mock';

describe('store_report', () => {
  const usageCountersServiceSetup = usageCountersServiceMock.createSetupContract();
  const uiCountersUsageCounter = usageCountersServiceSetup.createUsageCounter('uiCounter');

  let repository: ReturnType<typeof savedObjectsRepositoryMock.create>;

  beforeEach(() => {
    repository = savedObjectsRepositoryMock.create();
  });

  afterEach(() => {
    storeApplicationUsageMock.mockReset();
  });

  test('stores report for all types of data', async () => {
    const report: ReportSchemaType = {
      reportVersion: 3,
      userAgent: {
        'key-user-agent': {
          key: 'test-key',
          type: METRIC_TYPE.USER_AGENT,
          appName: 'test-app-name',
          userAgent: 'test-user-agent',
        },
      },
      uiCounter: {
        eventOneId: {
          key: 'test-key',
          type: METRIC_TYPE.LOADED,
          appName: 'test-app-name',
          eventName: 'test-event-name',
          total: 1,
        },
        eventTwoId: {
          key: 'test-key',
          type: METRIC_TYPE.CLICK,
          appName: 'test-app-name',
          eventName: 'test-event-name',
          total: 2,
        },
      },
      application_usage: {
        appId: {
          appId: 'appId',
          viewId: 'appId_view',
          numberOfClicks: 3,
          minutesOnScreen: 10,
        },
      },
    };
    await storeReport(repository, uiCountersUsageCounter, report);

    expect(repository.create.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "ui-metric",
          Object {
            "count": 1,
          },
          Object {
            "id": "key-user-agent:test-user-agent",
            "overwrite": true,
          },
        ],
      ]
    `);

    expect(repository.incrementCounter.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "ui-metric",
          "test-app-name:test-event-name",
          Array [
            Object {
              "fieldName": "count",
              "incrementBy": 3,
            },
          ],
        ],
      ]
    `);
    expect((uiCountersUsageCounter.incrementCounter as jest.Mock).mock.calls)
      .toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "counterName": "test-app-name:test-event-name",
            "counterType": "loaded",
            "incrementBy": 1,
          },
        ],
        Array [
          Object {
            "counterName": "test-app-name:test-event-name",
            "counterType": "click",
            "incrementBy": 2,
          },
        ],
      ]
    `);

    expect(storeApplicationUsageMock).toHaveBeenCalledTimes(1);
    expect(storeApplicationUsageMock).toHaveBeenCalledWith(
      repository,
      Object.values(report.application_usage!),
      expect.any(Date)
    );
  });

  test('it should not fail if nothing to store', async () => {
    const report: ReportSchemaType = {
      reportVersion: 3,
      userAgent: void 0,
      uiCounter: void 0,
      application_usage: void 0,
    };
    await storeReport(repository, uiCountersUsageCounter, report);

    expect(repository.bulkCreate).not.toHaveBeenCalled();
    expect(repository.incrementCounter).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
