/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import { DashboardStartDependencies } from '../../plugin';
import { DashboardContentInsightsService } from './types';

export type DashboardContentInsightsServiceFactory = KibanaPluginServiceFactory<
  DashboardContentInsightsService,
  DashboardStartDependencies
>;

export const dashboardContentInsightsServiceFactory: DashboardContentInsightsServiceFactory = (
  params
) => {
  const contentInsightsClient = new ContentInsightsClient(
    { http: params.coreStart.http },
    { domainId: 'dashboard' }
  );

  return {
    trackDashboardView: (dashboardId: string) => {
      contentInsightsClient.track(dashboardId, 'viewed');
    },
    contentInsightsClient,
  };
};
