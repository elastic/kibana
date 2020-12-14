/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Subject } from 'rxjs';

import { trackApplicationUsage } from './application_usage';
import { createApplicationUsageTrackerMock } from '../mocks';

describe('application_usage', () => {
  test('report an appId change', () => {
    const applicationUsageTrackerMock = createApplicationUsageTrackerMock();

    const currentAppId$ = new Subject<string | undefined>();
    trackApplicationUsage(currentAppId$, applicationUsageTrackerMock);

    currentAppId$.next('appId');

    expect(applicationUsageTrackerMock.setCurrentAppId).toHaveBeenCalledWith('appId');
    expect(applicationUsageTrackerMock.setCurrentAppId).toHaveBeenCalledTimes(1);
    expect(applicationUsageTrackerMock.trackApplicationViewUsage).toHaveBeenCalledWith('default');
    expect(applicationUsageTrackerMock.trackApplicationViewUsage).toHaveBeenCalledTimes(1);
  });

  test('skip duplicates', () => {
    const applicationUsageTrackerMock = createApplicationUsageTrackerMock();

    const currentAppId$ = new Subject<string | undefined>();
    trackApplicationUsage(currentAppId$, applicationUsageTrackerMock);

    currentAppId$.next('appId');
    currentAppId$.next('appId');

    expect(applicationUsageTrackerMock.setCurrentAppId).toHaveBeenCalledWith('appId');
    expect(applicationUsageTrackerMock.setCurrentAppId).toHaveBeenCalledTimes(1);
    expect(applicationUsageTrackerMock.trackApplicationViewUsage).toHaveBeenCalledWith('default');
    expect(applicationUsageTrackerMock.trackApplicationViewUsage).toHaveBeenCalledTimes(1);
  });

  test('skip if not a valid value', () => {
    const applicationUsageTrackerMock = createApplicationUsageTrackerMock();

    const currentAppId$ = new Subject<string | undefined>();
    trackApplicationUsage(currentAppId$, applicationUsageTrackerMock);

    currentAppId$.next('');
    currentAppId$.next('kibana');
    currentAppId$.next(undefined);

    expect(applicationUsageTrackerMock.setCurrentAppId).toHaveBeenCalledTimes(0);
    expect(applicationUsageTrackerMock.trackApplicationViewUsage).toHaveBeenCalledTimes(0);
  });
});
