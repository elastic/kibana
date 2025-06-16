/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ActionExecutionContext, addPanelMenuTrigger } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import { coreServices, uiActionsService } from '../services/kibana_services';
import { DashboardApi } from '../dashboard_api/types';

export async function executeAddLensPanelAction(dashboardApi: DashboardApi) {
  try {
    const addLensPanelAction = await uiActionsService.getAction('addLensPanelAction');
    addLensPanelAction.execute({
      embeddable: dashboardApi,
      trigger: addPanelMenuTrigger,
    } as ActionExecutionContext);
  } catch (error) {
    coreServices.notifications.toasts.addWarning(
      i18n.translate('dashboard.addNewPanelError', {
        defaultMessage: 'Unable to add new panel',
      })
    );
  }
}
