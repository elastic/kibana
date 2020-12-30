/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { UiActionsSetup } from '../../ui_actions/public';
import {
  ACTION_ADD_PANEL,
  ACTION_CUSTOMIZE_PANEL,
  ACTION_EDIT_PANEL,
  ACTION_INSPECT_PANEL,
  CONTEXT_MENU_TRIGGER,
  contextMenuTrigger,
  EmbeddableContext,
  PANEL_BADGE_TRIGGER,
  PANEL_NOTIFICATION_TRIGGER,
  panelBadgeTrigger,
  panelNotificationTrigger,
  RangeSelectContext,
  REMOVE_PANEL_ACTION,
  SELECT_RANGE_TRIGGER,
  selectRangeTrigger,
  ValueClickContext,
  VALUE_CLICK_TRIGGER,
  valueClickTrigger,
} from './lib';

declare module '../../ui_actions/public' {
  export interface TriggerContextMapping {
    [CONTEXT_MENU_TRIGGER]: EmbeddableContext;
    [PANEL_BADGE_TRIGGER]: EmbeddableContext;
    [PANEL_NOTIFICATION_TRIGGER]: EmbeddableContext;
    [SELECT_RANGE_TRIGGER]: RangeSelectContext;
    [VALUE_CLICK_TRIGGER]: ValueClickContext;
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
  uiActions.registerTrigger(selectRangeTrigger);
  uiActions.registerTrigger(valueClickTrigger);
};
