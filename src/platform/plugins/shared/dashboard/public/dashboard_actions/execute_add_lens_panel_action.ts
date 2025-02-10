/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { addPanelMenuTrigger } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import { coreServices, uiActionsService } from '../services/kibana_services';

export async function executeAddLensPanelAction() {
  try {
    const addLensPanelAction = await uiActionsService.getAction('addLensPanelAction');
    addLensPanelAction.execute({
      trigger: addPanelMenuTrigger,
    });
  } catch (error) {
    coreServices.notifications.toasts.addWarning(
      i18n.translate('dashboard.addNewPanelError', {
        defaultMessage: 'Unable to add new panel',
      })
    );
  }
}
