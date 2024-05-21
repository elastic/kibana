/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpStart } from '@kbn/core-http-browser';

export interface UiConfig {
  isUsingSecurity: boolean;
  minimumScheduleInterval?: {
    value: string;
    enforce: boolean;
  };
}

export const fetchUiConfig = async ({ http }: { http: HttpStart }): Promise<UiConfig> => {
  return http.get<UiConfig>('/internal/triggers_actions_ui/_config');
};
