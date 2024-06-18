/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { BASE_TRIGGERS_ACTIONS_UI_API_PATH } from '../../constants';
import { UiConfig } from '.';

export const fetchUiConfig = async ({ http }: { http: HttpStart }): Promise<UiConfig> => {
  return http.get<UiConfig>(`${BASE_TRIGGERS_ACTIONS_UI_API_PATH}/_config`);
};
