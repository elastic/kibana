/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { DashboardApi } from '../dashboard_api/types';

const appClientApi$ = new BehaviorSubject<DashboardApi | undefined>(undefined);

export const dashboardAppClientApi$: PublishingSubject<DashboardApi | undefined> = appClientApi$;

/**
 * Publishes `api` as the app client API and returns a function that clears it, unless another API was published since.
 */
export const publishDashboardAppClientApi = (api: DashboardApi): (() => void) => {
  appClientApi$.next(api);
  return () => {
    if (appClientApi$.value === api) appClientApi$.next(undefined);
  };
};
