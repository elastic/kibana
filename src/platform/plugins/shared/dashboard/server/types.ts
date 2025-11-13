/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import type { ScanDashboardsResult } from './scan_dashboards';
import type { DashboardState } from './content_management';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DashboardPluginSetup {}
export interface DashboardPluginStart {
  getDashboard: (
    ctx: RequestHandlerContext,
    id: string
  ) => Promise<
    Pick<DashboardState, 'description' | 'tags' | 'title'> & {
      id: string;
    }
  >;
  /**
   * @deprecated Contact #kibana-presentation about requirements for a proper panel search interface
   */
  scanDashboards: (
    ctx: RequestHandlerContext,
    page: number,
    perPage: number
  ) => Promise<ScanDashboardsResult>;
}
