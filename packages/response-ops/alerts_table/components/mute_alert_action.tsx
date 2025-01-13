/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import { useMuteAlertInstance } from '@kbn/response-ops-alerts-apis/hooks/use_mute_alert_instance';
import { useUnmuteAlertInstance } from '@kbn/response-ops-alerts-apis/hooks/use_unmute_alert_instance';
import type { AdditionalContext, AlertActionsProps } from '../types';
import { MUTE, UNMUTE } from '../translations';
import { useAlertMutedState } from '../hooks/use_alert_muted_state';
import { typedMemo } from '../utils/react';
import { useAlertsTableContext } from '../contexts/alerts_table_context';

/**
 * Alerts table row action to mute/unmute the selected alert
 */
export const MuteAlertAction = typedMemo(
  <AC extends AdditionalContext = AdditionalContext>({
    alert,
    refresh,
    onActionExecuted,
  }: AlertActionsProps<AC>) => {
    const {
      services: { http, notifications },
    } = useAlertsTableContext();
    const { isMuted, ruleId, rule, alertInstanceId } = useAlertMutedState(alert);
    const { mutateAsync: muteAlert } = useMuteAlertInstance({ http, notifications });
    const { mutateAsync: unmuteAlert } = useUnmuteAlertInstance({ http, notifications });
    const isAlertActive = useMemo(() => alert[ALERT_STATUS]?.[0] === ALERT_STATUS_ACTIVE, [alert]);

    const toggleAlert = useCallback(async () => {
      if (ruleId == null || alertInstanceId == null) {
        return;
      }
      if (isMuted) {
        await unmuteAlert({ ruleId, alertInstanceId });
      } else {
        await muteAlert({ ruleId, alertInstanceId });
      }
      onActionExecuted?.();
      refresh();
    }, [alertInstanceId, isMuted, muteAlert, onActionExecuted, refresh, ruleId, unmuteAlert]);

    if ((!isAlertActive && !isMuted) || ruleId == null || alertInstanceId == null) {
      return null;
    }

    return (
      <EuiContextMenuItem
        data-test-subj="toggle-alert"
        onClick={toggleAlert}
        size="s"
        disabled={!rule}
      >
        {!rule
          ? i18n.translate('xpack.triggersActionsUI.alertsTable.loadingMutedState', {
              defaultMessage: 'Loading muted state',
            })
          : isMuted
          ? UNMUTE
          : MUTE}
      </EuiContextMenuItem>
    );
  }
);
