/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';
import { INTERNAL_BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';

export interface UseBulkUntrackAlertsParams {
  http: HttpStart;
  notifications: NotificationsStart;
}

export const useBulkUntrackAlerts = ({
  http,
  notifications: { toasts },
}: UseBulkUntrackAlertsParams) => {
  return useMutation<string, string, { indices: string[]; alertUuids: string[] }>(
    ['untrackAlerts'],
    ({ indices, alertUuids }) => {
      try {
        const body = JSON.stringify({
          ...(indices?.length ? { indices } : {}),
          ...(alertUuids ? { alert_uuids: alertUuids } : {}),
        });
        return http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/alerts/_bulk_untrack`, { body });
      } catch (e) {
        throw new Error(`Unable to parse bulk untrack params: ${e}`);
      }
    },
    {
      context: AlertsQueryContext,
      onError: (_err, params) => {
        toasts.addDanger(
          i18n.translate(
            'xpack.triggersActionsUI.rules.deleteConfirmationModal.errorNotification.descriptionText',
            {
              defaultMessage: 'Failed to untrack {uuidsCount, plural, one {alert} other {alerts}}',
              values: { uuidsCount: params.alertUuids.length },
            }
          )
        );
      },

      onSuccess: (_, params) => {
        toasts.addSuccess(
          i18n.translate(
            'xpack.triggersActionsUI.rules.deleteConfirmationModal.successNotification.descriptionText',
            {
              defaultMessage: 'Untracked {uuidsCount, plural, one {alert} other {alerts}}',
              values: { uuidsCount: params.alertUuids.length },
            }
          )
        );
      },
    }
  );
};
