/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup } from '@kbn/core/public';
import { AsApiContract } from '@kbn/actions-types';
import { RulesSettingsFlapping } from '@kbn/alerting-types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { transformFlappingSettingsResponse } from './transform_flapping_settings_response';

export const fetchFlappingSettings = async ({ http }: { http: HttpSetup }) => {
  const res = await http.get<AsApiContract<RulesSettingsFlapping>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_flapping`
  );
  return transformFlappingSettingsResponse(res);
};
