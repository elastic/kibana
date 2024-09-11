/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { storeApplicationUsageMock } from './store_ui_report.test.mocks';

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { METRIC_TYPE } from '@kbn/analytics';
import type { ReportSchemaType } from './schema';
import { storeUiReport } from './store_ui_report';
import { usageCountersServiceMock } from '../usage_counters/usage_counters_service.mock';

describe('store_ui_report', () => {
  let repository: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let usageCountersServiceSetup: ReturnType<typeof usageCountersServiceMock.createSetupContract>;
  let usageCounterMock: ReturnType<typeof usageCountersServiceSetup.createUsageCounter>;

  beforeEach(() => {
    usageCountersServiceSetup = usageCountersServiceMock.createSetupContract();
    repository = savedObjectsRepositoryMock.create();
    usageCounterMock = usageCountersServiceSetup.createUsageCounter('dashboards');
    usageCountersServiceSetup.createUsageCounter.mockReturnValue(usageCounterMock);
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
    await storeUiReport(repository, usageCountersServiceSetup, report);
    await new Promise((resolve) => setTimeout(resolve, 4000));

    expect(usageCountersServiceSetup.createUsageCounter.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "dashboards",
        ],
        Array [
          "test-app-name",
        ],
        Array [
          "test-app-name",
        ],
      ]
    `);
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
            "refresh": false,
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
    expect((usageCounterMock.incrementCounter as jest.Mock).mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "counterName": "test-event-name",
            "counterType": "loaded",
            "incrementBy": 1,
            "source": "ui",
          },
        ],
        Array [
          Object {
            "counterName": "test-event-name",
            "counterType": "click",
            "incrementBy": 2,
            "source": "ui",
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
    await storeUiReport(repository, usageCountersServiceSetup, report);

    expect(repository.bulkCreate).not.toHaveBeenCalled();
    expect(repository.incrementCounter).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
