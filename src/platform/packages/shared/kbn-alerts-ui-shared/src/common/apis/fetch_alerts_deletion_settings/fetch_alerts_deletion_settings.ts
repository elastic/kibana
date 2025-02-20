/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup } from '@kbn/core/public';
import type { AsApiContract } from '@kbn/actions-types';
import type { RulesSettingsAlertDeletion } from '@kbn/alerting-types';

const transformAlertsDeletionSettingsResponse = ({
  active_alerts_deletion_threshold: activeAlertsDeletionThreshold,
  is_active_alerts_deletion_enabled: isActiveAlertsDeletionEnabled,
  inactive_alerts_deletion_threshold: inactiveAlertsDeletionThreshold,
  is_inactive_alerts_deletion_enabled: isInactiveAlertsDeletionEnabled,
  created_at: createdAt,
  created_by: createdBy,
  updated_at: updatedAt,
  updated_by: updatedBy,
}: AsApiContract<RulesSettingsAlertDeletion>): RulesSettingsAlertDeletion => ({
  activeAlertsDeletionThreshold,
  isActiveAlertsDeletionEnabled,
  inactiveAlertsDeletionThreshold,
  isInactiveAlertsDeletionEnabled,
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
});

export const fetchAlertsDeletionSettings = async ({ http }: { http: HttpSetup }) => {
  // TODO: https://github.com/elastic/kibana/issues/209258

  const res = {
    is_active_alerts_deletion_enabled: false,
    is_inactive_alerts_deletion_enabled: false,
    active_alerts_deletion_threshold: 0,
    inactive_alerts_deletion_threshold: 90,
    created_at: String(new Date().valueOf),
    updated_at: String(new Date().valueOf),
    created_by: null,
    updated_by: null,
  };

  return transformAlertsDeletionSettingsResponse(res);
};
