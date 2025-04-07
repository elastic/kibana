/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AlertDeletePreviewResponse } from '@kbn/alerting-plugin/common/routes/alert_delete';
import type { HttpStart } from '@kbn/core/public';
import type { RulesSettingsAlertDeleteProperties } from '@kbn/alerting-types/rule_settings';
import { BASE_ALERTING_API_PATH } from '../../constants';

export interface AlertDeletePreviewApiCallParams {
  services: { http: HttpStart };
  requestQuery: RulesSettingsAlertDeleteProperties;
}
export const alertDeletePreviewApiCall = async ({
  services: { http },
  requestQuery: {
    isActiveAlertDeleteEnabled,
    isInactiveAlertDeleteEnabled,
    activeAlertDeleteThreshold,
    inactiveAlertDeleteThreshold,
    categoryIds,
  },
}: AlertDeletePreviewApiCallParams) => {
  const { affected_alert_count: affectedAlertCount } = await http.get<AlertDeletePreviewResponse>(
    `${BASE_ALERTING_API_PATH}/rules/settings/_alert_delete_preview`,
    {
      query: {
        is_active_alert_delete_enabled: isActiveAlertDeleteEnabled,
        is_inactive_alert_delete_enabled: isInactiveAlertDeleteEnabled,
        active_alert_delete_threshold: activeAlertDeleteThreshold,
        inactive_alert_delete_threshold: inactiveAlertDeleteThreshold,
        category_ids: categoryIds,
      },
    }
  );

  return { affectedAlertCount };
};
