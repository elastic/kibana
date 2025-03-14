/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AlertStatus, ALERT_FLAPPING, ALERT_STATUS } from '@kbn/rule-data-utils';
import React, { memo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { AlertLifecycleStatusBadge } from '@kbn/alerts-ui-shared';
import { DefaultCell } from './default_cell';
import { useAlertMutedState } from '../hooks/use_alert_muted_state';
import type { CellComponent } from '../types';

export const AlertLifecycleStatusCell: CellComponent = memo((props) => {
  const { euiTheme } = useEuiTheme();
  const { alert, showAlertStatusWithFlapping } = props;
  const { isMuted } = useAlertMutedState(alert);

  if (!showAlertStatusWithFlapping) {
    return null;
  }

  const alertStatus = (alert?.[ALERT_STATUS] ?? []) as string[] | undefined;

  if (Array.isArray(alertStatus) && alertStatus.length) {
    const flapping = alert?.[ALERT_FLAPPING]?.[0] as boolean | undefined;

    return (
      <EuiFlexGroup gutterSize="s">
        <AlertLifecycleStatusBadge
          alertStatus={alertStatus.join() as AlertStatus}
          flapping={flapping}
        />
        {isMuted && (
          <EuiToolTip
            content={i18n.translate('xpack.triggersActionsUI.sections.alertsTable.alertMuted', {
              defaultMessage: 'Alert muted',
            })}
          >
            <EuiBadge
              iconType="bellSlash"
              css={css`
                padding-inline: ${euiTheme.size.xs};
              `}
            />
          </EuiToolTip>
        )}
      </EuiFlexGroup>
    );
  }

  return <DefaultCell {...props} />;
});
