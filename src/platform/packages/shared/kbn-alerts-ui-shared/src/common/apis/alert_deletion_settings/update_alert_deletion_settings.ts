/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup } from '@kbn/core/public';
import type { AsApiContract, RewriteRequestCase } from '@kbn/actions-plugin/common';
import type {
  RulesSettingsAlertDeletion,
  RulesSettingsAlertDeletionProperties,
} from '@kbn/alerting-types/rule_settings';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

const rewriteBodyRes: RewriteRequestCase<RulesSettingsAlertDeletion> = ({
  is_active_alerts_deletion_enabled: isActiveAlertsDeletionEnabled,
  is_inactive_alerts_deletion_enabled: isInactiveAlertsDeletionEnabled,
  active_alerts_deletion_threshold: activeAlertsDeletionThreshold,
  inactive_alerts_deletion_threshold: inactiveAlertsDeletionThreshold,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
}: any) => ({
  isActiveAlertsDeletionEnabled,
  isInactiveAlertsDeletionEnabled,
  activeAlertsDeletionThreshold,
  inactiveAlertsDeletionThreshold,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
});

export const updateAlertDeletionSettings = async ({
  http,
  alertDeletionSettings,
}: {
  http: HttpSetup;
  alertDeletionSettings: RulesSettingsAlertDeletionProperties;
}) => {
  let body: string;
  try {
    body = JSON.stringify({
      is_active_alerts_deletion_enabled: alertDeletionSettings.isActiveAlertsDeletionEnabled,
      is_inactive_alerts_deletion_enabled: alertDeletionSettings.isInactiveAlertsDeletionEnabled,
      active_alerts_deletion_threshold: alertDeletionSettings.activeAlertsDeletionThreshold,
      inactive_alerts_deletion_threshold: alertDeletionSettings.inactiveAlertsDeletionThreshold,
    });
  } catch (e) {
    throw new Error(`Unable to parse alert deletion settings update params: ${e}`);
  }

  const response = await http.post<AsApiContract<RulesSettingsAlertDeletion>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_deletion`,
    {
      body,
    }
  );

  return rewriteBodyRes(response);
};
