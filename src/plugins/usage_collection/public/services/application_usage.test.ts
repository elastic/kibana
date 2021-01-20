/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Subject } from 'rxjs';

import { trackApplicationUsageChange } from './application_usage';
import { createApplicationUsageTrackerMock } from '../mocks';

describe('application_usage', () => {
  test('report an appId change', () => {
    const applicationUsageTrackerMock = createApplicationUsageTrackerMock();

    const currentAppId$ = new Subject<string | undefined>();
    trackApplicationUsageChange(currentAppId$, applicationUsageTrackerMock);

    currentAppId$.next('appId');

    expect(applicationUsageTrackerMock.setCurrentAppId).toHaveBeenCalledWith('appId');
    expect(applicationUsageTrackerMock.setCurrentAppId).toHaveBeenCalledTimes(1);
    expect(applicationUsageTrackerMock.trackApplicationViewUsage).toHaveBeenCalledWith('main');
    expect(applicationUsageTrackerMock.trackApplicationViewUsage).toHaveBeenCalledTimes(1);
  });

  test('skip duplicates', () => {
    const applicationUsageTrackerMock = createApplicationUsageTrackerMock();

    const currentAppId$ = new Subject<string | undefined>();
    trackApplicationUsageChange(currentAppId$, applicationUsageTrackerMock);

    currentAppId$.next('appId');
    currentAppId$.next('appId');

    expect(applicationUsageTrackerMock.setCurrentAppId).toHaveBeenCalledWith('appId');
    expect(applicationUsageTrackerMock.setCurrentAppId).toHaveBeenCalledTimes(1);
    expect(applicationUsageTrackerMock.trackApplicationViewUsage).toHaveBeenCalledWith('main');
    expect(applicationUsageTrackerMock.trackApplicationViewUsage).toHaveBeenCalledTimes(1);
  });

  test('skip if not a valid value', () => {
    const applicationUsageTrackerMock = createApplicationUsageTrackerMock();

    const currentAppId$ = new Subject<string | undefined>();
    trackApplicationUsageChange(currentAppId$, applicationUsageTrackerMock);

    currentAppId$.next('');
    currentAppId$.next('kibana');
    currentAppId$.next(undefined);

    expect(applicationUsageTrackerMock.setCurrentAppId).toHaveBeenCalledTimes(0);
    expect(applicationUsageTrackerMock.trackApplicationViewUsage).toHaveBeenCalledTimes(0);
  });
});
