/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { AsApiContract } from '@kbn/actions-types';
import { AlertingFrameworkHealth, AlertsHealth } from '@kbn/alerting-types';
import { BASE_ALERTING_API_PATH } from '../../constants';
import { transformAlertingFrameworkHealthResponse, transformAlertsHealthResponse } from '.';

export async function fetchAlertingFrameworkHealth({
  http,
}: {
  http: HttpSetup;
}): Promise<AlertingFrameworkHealth> {
  const res = await http.get<AsApiContract<AlertingFrameworkHealth>>(
    `${BASE_ALERTING_API_PATH}/_health`
  );
  const alertingFrameworkHealthRewrited = transformAlertsHealthResponse(
    res.alerting_framework_health as unknown as AsApiContract<AlertsHealth>
  );
  return {
    ...transformAlertingFrameworkHealthResponse(res),
    alertingFrameworkHealth: alertingFrameworkHealthRewrited,
  };
}
