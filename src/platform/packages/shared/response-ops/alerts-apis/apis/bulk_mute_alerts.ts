/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../constants';

export interface BulkMuteAlertsRule {
  rule_id: string;
  alert_instance_ids: string[];
}

export interface BulkMuteAlertsParams {
  rules: BulkMuteAlertsRule[];
  http: HttpStart;
}

export const bulkMuteAlerts = ({ rules, http }: BulkMuteAlertsParams) => {
  return http.post<void>(`${INTERNAL_BASE_ALERTING_API_PATH}/alerts/_bulk_mute`, {
    body: JSON.stringify({ rules }),
  });
};
