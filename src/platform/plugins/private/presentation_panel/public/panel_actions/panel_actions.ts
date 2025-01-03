/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uiActions } from '../kibana_services';
import { CustomizePanelAction, CustomTimeRangeBadge } from './customize_panel_action';
import { EditPanelAction } from './edit_panel_action/edit_panel_action';
import { InspectPanelAction } from './inspect_panel_action/inspect_panel_action';
import { RemovePanelAction } from './remove_panel_action/remove_panel_action';
import { CONTEXT_MENU_TRIGGER, PANEL_BADGE_TRIGGER } from './triggers';

// export these actions to make them accessible in this plugin.
export let customizePanelAction: CustomizePanelAction;
export let editPanelAction: EditPanelAction;

export const getEditPanelAction = () => editPanelAction;

export const registerActions = () => {
  editPanelAction = new EditPanelAction();
  customizePanelAction = new CustomizePanelAction();

  const removePanel = new RemovePanelAction();
  const inspectPanel = new InspectPanelAction();
  const timeRangeBadge = new CustomTimeRangeBadge();

  uiActions.registerAction(removePanel);
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, removePanel.id);

  uiActions.registerAction(timeRangeBadge);
  uiActions.attachAction(PANEL_BADGE_TRIGGER, timeRangeBadge.id);

  uiActions.registerAction(inspectPanel);
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, inspectPanel.id);

  uiActions.registerAction(editPanelAction);
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, editPanelAction.id);

  uiActions.registerAction(customizePanelAction);
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, customizePanelAction.id);
};
