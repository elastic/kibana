/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable, fromEvent } from 'rxjs';
import { filter, distinctUntilChanged } from 'rxjs';
import { ApplicationUsageTracker } from '@kbn/analytics';
import { MAIN_APP_DEFAULT_VIEW_ID } from '../../common/constants';

/**
 * List of appIds not to report usage from (due to legacy hacks)
 */
const DO_NOT_REPORT = ['kibana'];

export function trackApplicationUsageChange(
  currentAppId$: Observable<string | undefined>,
  applicationUsageTracker: Pick<
    ApplicationUsageTracker,
    'updateViewClickCounter' | 'setCurrentAppId' | 'trackApplicationViewUsage'
  >
) {
  const windowClickSubscrition = fromEvent(window, 'click').subscribe(() => {
    applicationUsageTracker.updateViewClickCounter(MAIN_APP_DEFAULT_VIEW_ID);
  });

  const appIdSubscription = currentAppId$
    .pipe(
      filter((appId) => typeof appId === 'string' && !DO_NOT_REPORT.includes(appId)),
      distinctUntilChanged()
    )
    .subscribe((appId) => {
      if (!appId) {
        return;
      }
      applicationUsageTracker.setCurrentAppId(appId);
      applicationUsageTracker.trackApplicationViewUsage(MAIN_APP_DEFAULT_VIEW_ID);
    });

  return [windowClickSubscrition, appIdSubscription];
}
