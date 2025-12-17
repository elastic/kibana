/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { checkForDuplicateDashboardTitle } from './check_for_duplicate_dashboard_title';
export { dashboardClient } from './dashboard_client';
export { findService } from './find_service';
export { searchAction } from './search_action';
export { getDashboardsByIdsAction } from './get_dashboard_by_id_action';

export type { FindDashboardsByIdResponse, FindDashboardsService } from './types';
