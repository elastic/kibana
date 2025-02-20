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

const rewriteBodyRes: RewriteRequestCase<RulesSettingsAlertDeletion> = ({ ...rest }: any) => ({
  ...rest,
});

export const updateAlertsDeletionSettings = async ({
  http,
  alertsDeletionSettings,
}: {
  http: HttpSetup;
  alertsDeletionSettings: RulesSettingsAlertDeletionProperties;
}) => {
  // TODO: https://github.com/elastic/kibana/issues/209258

  const response: AsApiContract<RulesSettingsAlertDeletion> = await new Promise((resolve) => {
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
