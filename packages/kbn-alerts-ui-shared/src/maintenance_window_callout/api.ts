/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';

export const fetchActiveMaintenanceWindows = async (
  http: CoreStart['http'],
  signal?: AbortSignal
) =>
  http.fetch(INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH, {
    method: 'GET',
    signal,
  });

const INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH = `/internal/alerting/rules/maintenance_window/_active`;
