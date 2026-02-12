/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { triggers, type ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { i18n } from '@kbn/i18n';
import { ACTION_CREATE_CONTROL } from '@kbn/controls-constants';
import { coreServices, uiActionsService } from '../services/kibana_services';
import type { DashboardApi } from '../dashboard_api/types';

export async function executeCreateControlPanelAction(dashboardApi: DashboardApi) {
  try {
    const createControlPanelAction = await uiActionsService.getAction(ACTION_CREATE_CONTROL);
    createControlPanelAction.execute({
      embeddable: dashboardApi,
      trigger: triggers[ADD_PANEL_TRIGGER],
      isPinned: true,
    } as ActionExecutionContext);
  } catch (error) {
    coreServices.notifications.toasts.addWarning(
      i18n.translate('dashboard.addNewControlPanelError', {
        defaultMessage: 'Unable to create new control',
      })
    );
  }
}
