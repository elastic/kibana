/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AsApiContract } from '@kbn/actions-types';
import type { KibanaServices, MaintenanceWindow } from './types';

const rewriteMaintenanceWindowRes = ({
  expiration_date: expirationDate,
  r_rule: rRule,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
  event_start_time: eventStartTime,
  event_end_time: eventEndTime,
  category_ids: categoryIds,
  ...rest
}: AsApiContract<MaintenanceWindow>): MaintenanceWindow => ({
  ...rest,
  expirationDate,
  rRule,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  eventStartTime,
  eventEndTime,
  categoryIds,
});

export const fetchActiveMaintenanceWindows = async (
  http: KibanaServices['http'],
  signal?: AbortSignal
): Promise<MaintenanceWindow[]> => {
  const result = await http.fetch<Array<AsApiContract<MaintenanceWindow>>>(
    INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH,
    {
      method: 'GET',
      signal,
    }
  );
  return result.map((mw) => rewriteMaintenanceWindowRes(mw));
};

const INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH = `/internal/alerting/rules/maintenance_window/_active`;
