/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuItem } from '@elastic/eui';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import { typedMemo } from '../utils/react';
import type { AdditionalContext, AlertActionsProps } from '../types';

/**
 * Alerts table row action to open the selected alert detail page
 */
export const ViewAlertDetailsAlertAction = typedMemo(
  <AC extends AdditionalContext = AdditionalContext>({
    alert,
    openAlertInFlyout,
    onActionExecuted,
    isAlertDetailsEnabled,
    resolveAlertPagePath,
    tableId,
  }: Pick<
    AlertActionsProps<AC>,
    | 'alert'
    | 'openAlertInFlyout'
    | 'onActionExecuted'
    | 'isAlertDetailsEnabled'
    | 'resolveAlertPagePath'
    | 'tableId'
  >) => {
    const { http } = useKibana<{
      http: HttpStart;
    }>().services;
    const alertId = (alert[ALERT_UUID]?.[0] as string) ?? null;
    const pagePath = alertId && tableId && resolveAlertPagePath?.(alertId, tableId);
    const linkToAlert = pagePath ? http.basePath.prepend(pagePath) : null;

    if (isAlertDetailsEnabled && linkToAlert) {
      return (
        <EuiContextMenuItem
          data-test-subj="viewAlertDetailsPage"
          key="viewAlertDetailsPage"
          size="s"
          href={linkToAlert}
        >
          {i18n.translate('xpack.triggersActionsUI.alertsTable.viewAlertDetails', {
            defaultMessage: 'View alert details',
          })}
        </EuiContextMenuItem>
      );
    }

    return (
      <EuiContextMenuItem
        data-test-subj="viewAlertDetailsFlyout"
        key="viewAlertDetailsFlyout"
        size="s"
        onClick={() => {
          onActionExecuted?.();
          openAlertInFlyout(alert._id);
        }}
      >
        {i18n.translate('xpack.triggersActionsUI.alertsTable.viewAlertDetails', {
          defaultMessage: 'View alert details',
        })}
      </EuiContextMenuItem>
    );
  }
);
