/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { getDailyId } from '../../common/application_usage';
import { storeApplicationUsage } from './store_application_usage';
import { ApplicationUsageReport } from './schema';

const createReport = (parts: Partial<ApplicationUsageReport>): ApplicationUsageReport => ({
  appId: 'appId',
  viewId: 'viewId',
  numberOfClicks: 0,
  minutesOnScreen: 0,
  ...parts,
});

describe('storeApplicationUsage', () => {
  let repository: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let timestamp: Date;

  beforeEach(() => {
    repository = savedObjectsRepositoryMock.create();
    timestamp = new Date();
  });

  it('does not call `repository.incrementUsageCounters` when the report list is empty', async () => {
    await storeApplicationUsage(repository, [], timestamp);
    expect(repository.incrementCounter).not.toHaveBeenCalled();
  });

  it('calls `repository.incrementUsageCounters` with the correct parameters', async () => {
    const report = createReport({
      appId: 'app1',
      viewId: 'view1',
      numberOfClicks: 2,
      minutesOnScreen: 5,
    });

    await storeApplicationUsage(repository, [report], timestamp);

    expect(repository.incrementCounter).toHaveBeenCalledTimes(1);

    expect(repository.incrementCounter).toHaveBeenCalledWith(
      ...expectedIncrementParams(report, timestamp)
    );
  });

  it('aggregates reports with the same appId/viewId tuple', async () => {
    const report1 = createReport({
      appId: 'app1',
      viewId: 'view1',
      numberOfClicks: 2,
      minutesOnScreen: 5,
    });
    const report2 = createReport({
      appId: 'app1',
      viewId: 'view2',
      numberOfClicks: 1,
      minutesOnScreen: 7,
    });
    const report3 = createReport({
      appId: 'app1',
      viewId: 'view1',
      numberOfClicks: 3,
      minutesOnScreen: 9,
    });

    await storeApplicationUsage(repository, [report1, report2, report3], timestamp);

    expect(repository.incrementCounter).toHaveBeenCalledTimes(2);

    expect(repository.incrementCounter).toHaveBeenCalledWith(
      ...expectedIncrementParams(
        {
          appId: 'app1',
          viewId: 'view1',
          numberOfClicks: report1.numberOfClicks + report3.numberOfClicks,
          minutesOnScreen: report1.minutesOnScreen + report3.minutesOnScreen,
        },
        timestamp
      )
    );
    expect(repository.incrementCounter).toHaveBeenCalledWith(
      ...expectedIncrementParams(report2, timestamp)
    );
  });
});

const expectedIncrementParams = (
  { appId, viewId, minutesOnScreen, numberOfClicks }: ApplicationUsageReport,
  timestamp: Date
) => {
  const dayId = moment(timestamp).format('YYYY-MM-DD');
  return [
    'application_usage_daily',
    getDailyId({ appId, viewId, dayId }),
    [
      { fieldName: 'numberOfClicks', incrementBy: numberOfClicks },
      { fieldName: 'minutesOnScreen', incrementBy: minutesOnScreen },
    ],
    {
      upsertAttributes: {
        appId,
        viewId,
        timestamp: moment(`${moment(dayId).format('YYYY-MM-DD')}T00:00:00Z`).toISOString(),
      },
    },
  ];
};
