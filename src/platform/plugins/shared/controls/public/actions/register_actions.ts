/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ADD_PANEL_TRIGGER, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  ACTION_CLEAR_CONTROL,
  ACTION_DELETE_CONTROL,
  ACTION_EDIT_CONTROL,
  ADD_OPTIONS_LIST_ACTION_ID,
} from './constants';
import { CONTROL_HOVER_TRIGGER, controlHoverTrigger } from './controls_hover_trigger';

export function registerActions(uiActions: UiActionsStart) {
  uiActions.registerTrigger(controlHoverTrigger);

  uiActions.registerActionAsync(ACTION_DELETE_CONTROL, async () => {
    const { DeleteControlAction } = await import('../controls_module');
    return new DeleteControlAction();
  });
  uiActions.attachAction(CONTROL_HOVER_TRIGGER, ACTION_DELETE_CONTROL);

  uiActions.registerActionAsync(ACTION_EDIT_CONTROL, async () => {
    const { EditControlAction } = await import('../controls_module');
    return new EditControlAction();
  });
  uiActions.attachAction(CONTROL_HOVER_TRIGGER, ACTION_EDIT_CONTROL);

  uiActions.registerActionAsync(ACTION_CLEAR_CONTROL, async () => {
    const { ClearControlAction } = await import('../controls_module');
    return new ClearControlAction();
  });
  uiActions.attachAction(CONTROL_HOVER_TRIGGER, ACTION_CLEAR_CONTROL);

  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ADD_OPTIONS_LIST_ACTION_ID, async () => {
    const { createOptionsListAction } = await import('../controls_module');
    return createOptionsListAction();
  });
}
