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
import type { DashboardState } from './api';
import type { create, read, update, deleteDashboard } from './api';

/**
 * Client interface for dashboard CRUD operations
 */
export interface DashboardServerClient {
  create: typeof create;
  read: typeof read;
  update: typeof update;
  delete: typeof deleteDashboard;
}

/** The setup contract for the Dashboard plugin on the server. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DashboardPluginSetup {}

/**
 * The start contract for the Dashboard plugin on the server.
 * Provides methods for interacting with dashboards.
 */
export interface DashboardPluginStart {
  /** Client for dashboard CRUD operations. */
  client: DashboardServerClient;
  /**
   * Retrieves a dashboard by ID.
   *
   * @deprecated This method is deprecated and should be replaced by client.read.
   * @param ctx - The request handler context.
   * @param id - The dashboard ID.
   * @returns A promise that resolves to the dashboard summary.
   */
  getDashboard: (
    ctx: RequestHandlerContext,
    id: string
  ) => Promise<
    Pick<DashboardState, 'description' | 'tags' | 'title'> & {
      id: string;
    }
  >;
  /**
   * Scans dashboards with pagination.
   *
   * @deprecated Contact #kibana-presentation about requirements for a proper panel search interface.
   * @param ctx - The request handler context.
   * @param page - The page number.
   * @param perPage - The number of items per page.
   * @returns A promise that resolves to the {@link ScanDashboardsResult}.
   */
  scanDashboards: (
    ctx: RequestHandlerContext,
    page: number,
    perPage: number
  ) => Promise<ScanDashboardsResult>;
}
