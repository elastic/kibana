/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { UiHealthCheck, UiHealthCheckResponse } from './types';
import { BASE_TRIGGERS_ACTIONS_UI_API_PATH } from '../../constants';

export const fetchUiHealthStatus = async ({
  http,
}: {
  http: HttpStart;
}): Promise<UiHealthCheck> => {
  const result = await http.get<UiHealthCheckResponse>(
    `${BASE_TRIGGERS_ACTIONS_UI_API_PATH}/_health`
  );
  if (result) {
    return {
      isRulesAvailable: result.isAlertsAvailable,
    };
  }
  return result;
};
