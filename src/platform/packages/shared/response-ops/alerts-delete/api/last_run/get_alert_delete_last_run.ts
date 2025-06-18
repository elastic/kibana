/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AlertDeleteLastRunResponse } from '@kbn/alerting-plugin/common/routes/alert_delete';
import type { AlertDeleteLastRun } from '@kbn/alerting-types/alert_delete_types';
import type { HttpStart } from '@kbn/core/public';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export type GetAlertDeleteLastRunResponse = AlertDeleteLastRun;

export interface GetAlertDeleteLastRunParams {
  services: { http: HttpStart };
}
export const getAlertDeleteLastRun = async ({
  services: { http },
}: GetAlertDeleteLastRunParams): Promise<GetAlertDeleteLastRunResponse> => {
  const { last_run: lastRun } = await http.get<AlertDeleteLastRunResponse>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_delete_last_run`
  );

  return { lastRun };
};
