/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup } from '@kbn/core/public';
// import { AsApiContract } from '@kbn/actions-types';
// import { RulesSettingsAlertDeletion } from '@kbn/alerting-types';
// import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { transformAlertDeletionSettingsResponse } from './transform_alert_deletion_settings_response';

export const fetchAlertDeletionSettings = async ({ http }: { http: HttpSetup }) => {
  // TODO: https://github.com/elastic/kibana/issues/209258
  // const res = await http.get<AsApiContract<RulesSettingsAlertDeletion>>(
  //   `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_deletion`
  // );

  const res = {
    is_active_alert_deletion_enabled: false,
    is_inactive_alert_deletion_enabled: false,
    active_alert_deletion_threshold: 0,
    inactive_alert_deletion_threshold: 90,
    created_at: String(new Date().valueOf),
    updated_at: String(new Date().valueOf),
    created_by: null,
    updated_by: null,
  };

  return transformAlertDeletionSettingsResponse(res);
};
