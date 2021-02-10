/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiActionsSetup } from '../../ui_actions/public';
import {
  contextMenuTrigger,
  panelBadgeTrigger,
  EmbeddableContext,
  CONTEXT_MENU_TRIGGER,
  PANEL_BADGE_TRIGGER,
  ACTION_ADD_PANEL,
  ACTION_CUSTOMIZE_PANEL,
  ACTION_INSPECT_PANEL,
  REMOVE_PANEL_ACTION,
  ACTION_EDIT_PANEL,
  panelNotificationTrigger,
  PANEL_NOTIFICATION_TRIGGER,
} from './lib';

declare module '../../ui_actions/public' {
  export interface TriggerContextMapping {
    [CONTEXT_MENU_TRIGGER]: EmbeddableContext;
    [PANEL_BADGE_TRIGGER]: EmbeddableContext;
    [PANEL_NOTIFICATION_TRIGGER]: EmbeddableContext;
  }

  export interface ActionContextMapping {
    [ACTION_CUSTOMIZE_PANEL]: EmbeddableContext;
    [ACTION_ADD_PANEL]: EmbeddableContext;
    [ACTION_INSPECT_PANEL]: EmbeddableContext;
    [REMOVE_PANEL_ACTION]: EmbeddableContext;
    [ACTION_EDIT_PANEL]: EmbeddableContext;
  }
}

/**
 * This method initializes Embeddable plugin with initial set of
 * triggers and actions.
 */
export const bootstrap = (uiActions: UiActionsSetup) => {
  uiActions.registerTrigger(contextMenuTrigger);
  uiActions.registerTrigger(panelBadgeTrigger);
  uiActions.registerTrigger(panelNotificationTrigger);
};
