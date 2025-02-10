/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup } from '@kbn/core/public';
import { AsApiContract, RewriteRequestCase } from '@kbn/actions-plugin/common';
import type {
  RulesSettingsAlertsDeletion,
  RulesSettingsAlertsDeletionProperties,
} from '@kbn/alerting-types/rule_settings';
// import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

const rewriteBodyRes: RewriteRequestCase<RulesSettingsAlertsDeletion> = ({ ...rest }: any) => ({
  ...rest,
});

export const updateAlertsDeletionSettings = async ({
  http,
  alertsDeletionSettings,
}: {
  http: HttpSetup;
  alertsDeletionSettings: RulesSettingsAlertsDeletionProperties;
}) => {
  // let body: string;
  try {
    // body = JSON.stringify({
    // is_active_alerts_deletion_enabled: alertsDeletionSettings.isActiveAlertsDeletionEnabled,
    // is_inactive_alerts_deletion_enabled: alertsDeletionSettings.isInactiveAlertsDeletionEnabled,
    // active_alerts_deletion_threshold: alertsDeletionSettings.activeAlertsDeletionThreshold,
    // inactive_alerts_deletion_threshold: alertsDeletionSettings.inactiveAlertsDeletionThreshold,
    // });
  } catch (e) {
    throw new Error(`Unable to parse alert deletion settings update params: ${e}`);
  }

  // TODO: https://github.com/elastic/kibana/issues/209258
  // const res = await http.post<AsApiContract<RulesSettingsAlertDeletion>>(
  //   `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_deletion`,
  //   {
  //     body,
  //   }
  // );

  const response: AsApiContract<RulesSettingsAlertsDeletion> = await new Promise((resolve) => {
    resolve({
      is_active_alerts_deletion_enabled: alertsDeletionSettings.isActiveAlertsDeletionEnabled,
      is_inactive_alerts_deletion_enabled: alertsDeletionSettings.isInactiveAlertsDeletionEnabled,
      active_alerts_deletion_threshold: alertsDeletionSettings.activeAlertsDeletionThreshold,
      inactive_alerts_deletion_threshold: alertsDeletionSettings.inactiveAlertsDeletionThreshold,
      created_by: null,
      updated_by: null,
      created_at: '2021-08-25T14:00:00.000Z',
      updated_at: '2021-08-25T14:00:00.000Z',
    });
  });

  return rewriteBodyRes(response);
};
