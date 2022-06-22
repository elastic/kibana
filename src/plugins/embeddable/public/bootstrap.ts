/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import {
  contextMenuTrigger,
  panelBadgeTrigger,
  panelNotificationTrigger,
  selectRangeTrigger,
  valueClickTrigger,
} from './lib';

/**
 * This method initializes Embeddable plugin with initial set of
 * triggers and actions.
 */
export const bootstrap = (uiActions: UiActionsSetup) => {
  uiActions.registerTrigger(contextMenuTrigger);
  uiActions.registerTrigger(panelBadgeTrigger);
  uiActions.registerTrigger(panelNotificationTrigger);
  uiActions.registerTrigger(selectRangeTrigger);
  uiActions.registerTrigger(valueClickTrigger);
};
