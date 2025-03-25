/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuItem } from '@elastic/eui';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { AdditionalContext, AlertActionsProps } from '../types';
import { useBulkUntrackAlerts } from '../hooks/use_bulk_untrack_alerts';
import { typedMemo } from '../utils/react';

/**
 * Alerts table row action to mark the selected alert as untracked
 */
export const MarkAsUntrackedAlertAction = typedMemo(
  <AC extends AdditionalContext = AdditionalContext>({
    alert,
    refresh,
    onActionExecuted,
  }: Pick<AlertActionsProps<AC>, 'alert' | 'refresh' | 'onActionExecuted'>) => {
    const { http, notifications } = useKibana<{
      http: HttpStart;
      notifications: NotificationsStart;
    }>().services;
    const { mutateAsync: untrackAlerts } = useBulkUntrackAlerts({ http, notifications });
    const isAlertActive = useMemo(() => alert[ALERT_STATUS]?.[0] === ALERT_STATUS_ACTIVE, [alert]);

    const handleUntrackAlert = useCallback(async () => {
      await untrackAlerts({
        indices: [alert._index ?? ''],
        alertUuids: [alert._id],
      });
      onActionExecuted?.();
      refresh();
    }, [untrackAlerts, alert._index, alert._id, onActionExecuted, refresh]);

    if (!isAlertActive) {
      return null;
    }

    return (
      <EuiContextMenuItem
        data-test-subj="untrackAlert"
        key="untrackAlert"
        size="s"
        onClick={handleUntrackAlert}
      >
        {i18n.translate('xpack.triggersActionsUI.alertsTable.actions.untrack', {
          defaultMessage: 'Mark as untracked',
        })}
      </EuiContextMenuItem>
    );
  }
);
