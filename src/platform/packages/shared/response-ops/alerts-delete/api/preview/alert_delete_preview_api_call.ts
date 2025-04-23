/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AlertDeletePreviewQuery,
  AlertDeletePreviewResponse,
} from '@kbn/alerting-plugin/common/routes/alert_delete';
import type { HttpStart } from '@kbn/core/public';
import type { SnakeToCamelCase } from '@kbn/cases-plugin/common/types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export type AlertDeletePreviewApiCallResponse = SnakeToCamelCase<AlertDeletePreviewResponse>;

export interface AlertDeletePreviewApiCallParams {
  services: { http: HttpStart };
  requestQuery: SnakeToCamelCase<AlertDeletePreviewQuery>;
}
export const alertDeletePreviewApiCall = async ({
  services: { http },
  requestQuery: { activeAlertDeleteThreshold, inactiveAlertDeleteThreshold, categoryIds },
}: AlertDeletePreviewApiCallParams): Promise<AlertDeletePreviewApiCallResponse> => {
  const { affected_alert_count: affectedAlertCount } = await http.get<AlertDeletePreviewResponse>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_delete_preview`,
    {
      query: {
        active_alert_delete_threshold: activeAlertDeleteThreshold,
        inactive_alert_delete_threshold: inactiveAlertDeleteThreshold,
        category_ids: categoryIds,
      },
    }
  );

  return { affectedAlertCount };
};
