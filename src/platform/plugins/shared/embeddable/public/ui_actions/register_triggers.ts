/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import {
  contextMenuTrigger,
  multiValueClickTrigger,
  panelBadgeTrigger,
  panelNotificationTrigger,
  selectRangeTrigger,
  valueClickTrigger,
  cellValueTrigger,
} from './triggers';

export const registerTriggers = (uiActions: UiActionsSetup) => {
  uiActions.registerTrigger(contextMenuTrigger);
  uiActions.registerTrigger(panelBadgeTrigger);
  uiActions.registerTrigger(panelNotificationTrigger);
  uiActions.registerTrigger(selectRangeTrigger);
  uiActions.registerTrigger(valueClickTrigger);
  uiActions.registerTrigger(multiValueClickTrigger);
  uiActions.registerTrigger(cellValueTrigger);
};
