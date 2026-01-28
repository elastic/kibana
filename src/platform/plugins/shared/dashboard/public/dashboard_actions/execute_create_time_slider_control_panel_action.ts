/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { addPanelMenuTrigger } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import { ACTION_CREATE_TIME_SLIDER, TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import { coreServices, uiActionsService } from '../services/kibana_services';
import type { DashboardApi } from '../dashboard_api/types';

export async function executeCreateTimeSliderControlPanelAction(dashboardApi: DashboardApi) {
  try {
    const createControlPanelAction = await uiActionsService.getAction(ACTION_CREATE_TIME_SLIDER);
    createControlPanelAction.execute({
      embeddable: dashboardApi,
      trigger: addPanelMenuTrigger,
    } as ActionExecutionContext);
  } catch (error) {
    coreServices.notifications.toasts.addWarning(
      i18n.translate('dashboard.createNewTimeSliderControlError', {
        defaultMessage: 'Unable to create new time slider control',
      })
    );
  }
}

export async function isTimeSliderControlCreationCompatible(
  dashboardApi: DashboardApi
): Promise<boolean> {
  try {
    const createControlPanelAction = await uiActionsService.getAction(ACTION_CREATE_TIME_SLIDER);
    return await createControlPanelAction.isCompatible({
      embeddable: {
        ...dashboardApi,
        hasTimeSliderControl: Object.values(dashboardApi.layout$.getValue().pinnedPanels).some(
          (control) => control.type === TIME_SLIDER_CONTROL
        ),
      },
      trigger: addPanelMenuTrigger,
    } as ActionExecutionContext);
  } catch (error) {
    return false;
  }
}
