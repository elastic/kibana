/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { DashboardLocatorParams } from '../../dashboard_api/types';

export type DashboardAppLocator = LocatorPublic<DashboardLocatorParams>;

export type ForwardedDashboardState = Omit<
  DashboardLocatorParams,
  'dashboardId' | 'preserveSavedFilters' | 'useHash' | 'searchSessionId'
>;

export class DashboardAppLocatorDefinition implements LocatorDefinition<DashboardLocatorParams> {
  public readonly id = DASHBOARD_APP_LOCATOR;

  constructor(protected readonly useHashedUrl: boolean) {}

  public readonly getLocation = async (params: DashboardLocatorParams) => {
    const { getLocation } = await import('./get_location');
    return getLocation(this.useHashedUrl, params);
  };
}
