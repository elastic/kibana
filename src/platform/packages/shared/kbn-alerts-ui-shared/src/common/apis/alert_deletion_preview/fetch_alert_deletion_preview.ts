/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { AsApiContract } from '@kbn/actions-types';
import type {
  AlertDeletionPreview,
  RulesSettingsAlertDeletionProperties,
} from '@kbn/alerting-types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

const transformAlertDeletionPreviewRequest = ({
  settings,
}: {
  settings: RulesSettingsAlertDeletionProperties;
}) => {
  return {
    is_active_alerts_deletion_enabled: settings.isActiveAlertsDeletionEnabled,
    is_inactive_alerts_deletion_enabled: settings.isInactiveAlertsDeletionEnabled,
    active_alerts_deletion_threshold: settings.activeAlertsDeletionThreshold,
    inactive_alerts_deletion_threshold: settings.inactiveAlertsDeletionThreshold,
  };
};

const transformAlertDeletionPreviewResponse = ({
  affected_alert_count: affectedAlertCount,
}: AsApiContract<AlertDeletionPreview>): AlertDeletionPreview => {
  return {
    affectedAlertCount,
  };
};

interface Props {
  http: HttpStart;
  settings: RulesSettingsAlertDeletionProperties;
}
export const fetchAlertDeletionPreview = async ({ http, settings }: Props) => {
  const response = await http.get<AsApiContract<AlertDeletionPreview>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/alert_deletion/preview`,
    {
      query: transformAlertDeletionPreviewRequest({ settings }),
    }
  );

  return transformAlertDeletionPreviewResponse(response);
};
