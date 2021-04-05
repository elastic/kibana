/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { storeApplicationUsageMock } from './store_report.test.mocks';

import { savedObjectsRepositoryMock } from '../../../../core/server/mocks';
import { storeReport } from './store_report';
import { ReportSchemaType } from './schema';
import { METRIC_TYPE } from '@kbn/analytics';
import moment from 'moment';

describe('store_report', () => {
  const momentTimestamp = moment();
  const date = momentTimestamp.format('DDMMYYYY');

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
    await storeReport(repository, report);

    expect(repository.create).toHaveBeenCalledWith(
      'ui-metric',
      { count: 1 },
      {
        id: 'key-user-agent:test-user-agent',
        overwrite: true,
      }
    );
    expect(repository.incrementCounter).toHaveBeenNthCalledWith(
      1,
      'ui-metric',
      'test-app-name:test-event-name',
      [{ fieldName: 'count', incrementBy: 3 }]
    );
    expect(repository.incrementCounter).toHaveBeenNthCalledWith(
      2,
      'ui-counter',
      `test-app-name:${date}:${METRIC_TYPE.LOADED}:test-event-name`,
      [{ fieldName: 'count', incrementBy: 1 }]
    );
    expect(repository.incrementCounter).toHaveBeenNthCalledWith(
      3,
      'ui-counter',
      `test-app-name:${date}:${METRIC_TYPE.CLICK}:test-event-name`,
      [{ fieldName: 'count', incrementBy: 2 }]
    );

    expect(storeApplicationUsageMock).toHaveBeenCalledTimes(1);
    expect(storeApplicationUsageMock).toHaveBeenCalledWith(
      repository,
      Object.values(report.application_usage as Record<string, any>),
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
    await storeReport(repository, report);

    expect(repository.bulkCreate).not.toHaveBeenCalled();
    expect(repository.incrementCounter).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
