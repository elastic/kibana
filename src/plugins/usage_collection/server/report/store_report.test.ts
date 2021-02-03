/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { savedObjectsRepositoryMock } from '../../../../core/server/mocks';
import { storeReport } from './store_report';
import { ReportSchemaType } from './schema';
import { METRIC_TYPE } from '@kbn/analytics';
import moment from 'moment';

describe('store_report', () => {
  const momentTimestamp = moment();
  const date = momentTimestamp.format('DDMMYYYY');

  test('stores report for all types of data', async () => {
    const savedObjectClient = savedObjectsRepositoryMock.create();
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
    await storeReport(savedObjectClient, report);

    expect(savedObjectClient.create).toHaveBeenCalledWith(
      'ui-metric',
      { count: 1 },
      {
        id: 'key-user-agent:test-user-agent',
        overwrite: true,
      }
    );
    expect(savedObjectClient.incrementCounter).toHaveBeenNthCalledWith(
      1,
      'ui-metric',
      'test-app-name:test-event-name',
      [{ fieldName: 'count', incrementBy: 3 }]
    );
    expect(savedObjectClient.incrementCounter).toHaveBeenNthCalledWith(
      2,
      'ui-counter',
      `test-app-name:${date}:${METRIC_TYPE.LOADED}:test-event-name`,
      [{ fieldName: 'count', incrementBy: 1 }]
    );
    expect(savedObjectClient.incrementCounter).toHaveBeenNthCalledWith(
      3,
      'ui-counter',
      `test-app-name:${date}:${METRIC_TYPE.CLICK}:test-event-name`,
      [{ fieldName: 'count', incrementBy: 2 }]
    );
    expect(savedObjectClient.bulkCreate).toHaveBeenNthCalledWith(1, [
      {
        type: 'application_usage_transactional',
        attributes: {
          numberOfClicks: 3,
          minutesOnScreen: 10,
          appId: 'appId',
          viewId: 'appId_view',
          timestamp: expect.any(Date),
        },
      },
    ]);
  });

  test('it should not fail if nothing to store', async () => {
    const savedObjectClient = savedObjectsRepositoryMock.create();
    const report: ReportSchemaType = {
      reportVersion: 3,
      userAgent: void 0,
      uiCounter: void 0,
      application_usage: void 0,
    };
    await storeReport(savedObjectClient, report);

    expect(savedObjectClient.bulkCreate).not.toHaveBeenCalled();
    expect(savedObjectClient.incrementCounter).not.toHaveBeenCalled();
    expect(savedObjectClient.create).not.toHaveBeenCalled();
    expect(savedObjectClient.create).not.toHaveBeenCalled();
  });
});
