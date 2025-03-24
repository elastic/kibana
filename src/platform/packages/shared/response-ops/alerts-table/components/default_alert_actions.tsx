/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useLoadRuleTypesQuery } from '@kbn/alerts-ui-shared/src/common/hooks';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { ViewRuleDetailsAlertAction } from './view_rule_details_alert_action';
import type { AdditionalContext, AlertActionsProps } from '../types';
import { ViewAlertDetailsAlertAction } from './view_alert_details_alert_action';
import { MuteAlertAction } from './mute_alert_action';
import { MarkAsUntrackedAlertAction } from './mark_as_untracked_alert_action';

/**
 * Common alerts table row actions
 */
export const DefaultAlertActions = <AC extends AdditionalContext = AdditionalContext>(
  props: Pick<
    AlertActionsProps<AC>,
    | 'alert'
    | 'openAlertInFlyout'
    | 'onActionExecuted'
    | 'isAlertDetailsEnabled'
    | 'resolveAlertPagePath'
    | 'tableId'
    | 'resolveRulePagePath'
    | 'refresh'
  >
) => {
  const { http, notifications } = useKibana<{
    http: HttpStart;
    notifications: NotificationsStart;
  }>().services;
  const { authorizedToCreateAnyRules } = useLoadRuleTypesQuery({
    filteredRuleTypes: [],
    http,
    toasts: notifications.toasts,
    context: AlertsQueryContext,
  });

  const {
    alert,
    resolveRulePagePath,
    refresh,
    onActionExecuted,
    tableId,
    openAlertInFlyout,
    isAlertDetailsEnabled,
    resolveAlertPagePath,
  } = props;

  return (
    <>
      <ViewRuleDetailsAlertAction
        alert={alert}
        resolveRulePagePath={resolveRulePagePath}
        tableId={tableId}
      />
      <ViewAlertDetailsAlertAction
        alert={alert}
        onActionExecuted={onActionExecuted}
        openAlertInFlyout={openAlertInFlyout}
        isAlertDetailsEnabled={isAlertDetailsEnabled}
        resolveAlertPagePath={resolveAlertPagePath}
        tableId={tableId}
      />
      {authorizedToCreateAnyRules && (
        <MarkAsUntrackedAlertAction
          alert={alert}
          refresh={refresh}
          onActionExecuted={onActionExecuted}
        />
      )}
      {authorizedToCreateAnyRules && (
        <MuteAlertAction alert={alert} refresh={refresh} onActionExecuted={onActionExecuted} />
      )}
    </>
  );
};
