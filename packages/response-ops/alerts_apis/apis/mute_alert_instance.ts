/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup } from '@kbn/core/public';
import { BASE_ALERTING_API_PATH } from '../constants';

export interface MuteAlertInstanceParams {
  id: string;
  instanceId: string;
  http: HttpSetup;
}

export const muteAlertInstance = ({ id, instanceId, http }: MuteAlertInstanceParams) => {
  return http.post<void>(
    `${BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/alert/${encodeURIComponent(
      instanceId
    )}/_mute`
  );
};
