/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { ScanDashboardsResult } from './scan_dashboards';
import type {
  DashboardCreateResponseBody,
  DashboardReadResponseBody,
  DashboardUpdateResponseBody,
} from './api';

interface DashboardWriteOptions {
  /** Takes the dashboard the way the Dashboard app saves it, keeping panels that can't be converted to the as-code API format. */
  isDashboardAppRequest?: boolean;
}

/**
 * Client interface for dashboard CRUD operations
 */
export interface DashboardServerClient {
  read(
    savedObjectsClient: SavedObjectsClientContract,
    id: string,
    options?: {
      /** Returns the dashboard the way the Dashboard app loads it, keeping panels that can't be converted to the as-code API format. */
      isDashboardAppRequest?: boolean;
    }
  ): Promise<DashboardReadResponseBody>;
  /**
   * Creates a dashboard as the user of the request, in the request's space, without validating it.
   * The change history records the user.
   */
  create(
    request: KibanaRequest,
    dashboardState: DashboardState,
    options?: DashboardWriteOptions
  ): Promise<DashboardCreateResponseBody>;
  /**
   * Upserts a dashboard by id as the user of the request, in the request's space, without
   * validating it. The change history records the user.
   */
  update(
    request: KibanaRequest,
    id: string,
    dashboardState: DashboardState,
    options?: DashboardWriteOptions
  ): Promise<DashboardCreateResponseBody | DashboardUpdateResponseBody>;
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
   * Scans dashboards with pagination.
   *
   * @deprecated Contact #kibana-dashboards about requirements for a proper panel search interface.
   * @param ctx - The request handler context.
   * @param page - The page number.
   * @param perPage - The number of items per page.
   * @returns A promise that resolves to the {@link ScanDashboardsResult}.
   */
  scanDashboards: (
    savedObjectsClient: SavedObjectsClientContract,
    page: number,
    perPage: number
  ) => Promise<ScanDashboardsResult>;
}
