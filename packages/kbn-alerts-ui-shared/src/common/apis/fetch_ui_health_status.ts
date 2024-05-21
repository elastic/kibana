/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpStart } from '@kbn/core-http-browser';

export interface UiHealthCheck {
  isRulesAvailable: boolean;
}

export interface UiHealthCheckResponse {
  isAlertsAvailable: boolean;
}

export const fetchUiHealthStatus = async ({
  http,
}: {
  http: HttpStart;
}): Promise<UiHealthCheck> => {
  const response = await http.get<UiHealthCheckResponse>('/internal/triggers_actions_ui/_health');
  return {
    isRulesAvailable: response.isAlertsAvailable,
  };
};
