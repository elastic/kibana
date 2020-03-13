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
import { Filter } from '../../data/public';
import {
  applyFilterTrigger,
  contextMenuTrigger,
  contextMenuDrilldownsTrigger,
  createFilterAction,
  panelBadgeTrigger,
  valueClickTrigger,
  EmbeddableVisTriggerContext,
  IEmbeddable,
  EmbeddableContext,
  APPLY_FILTER_TRIGGER,
  VALUE_CLICK_TRIGGER,
  CONTEXT_MENU_TRIGGER,
  CONTEXT_MENU_DRILLDOWNS_TRIGGER,
  PANEL_BADGE_TRIGGER,
  ACTION_ADD_PANEL,
  ACTION_CUSTOMIZE_PANEL,
  ACTION_INSPECT_PANEL,
  REMOVE_PANEL_ACTION,
  ACTION_EDIT_PANEL,
  FilterActionContext,
  ACTION_APPLY_FILTER,
} from './lib';

declare module '../../ui_actions/public' {
  export interface TriggerContextMapping {
    [VALUE_CLICK_TRIGGER]: EmbeddableVisTriggerContext;
    [APPLY_FILTER_TRIGGER]: {
      embeddable: IEmbeddable;
      filters: Filter[];
    };
    [CONTEXT_MENU_TRIGGER]: EmbeddableContext;
    [CONTEXT_MENU_DRILLDOWNS_TRIGGER]: EmbeddableContext;
    [PANEL_BADGE_TRIGGER]: EmbeddableContext;
  }

  export interface ActionContextMapping {
    [ACTION_CUSTOMIZE_PANEL]: EmbeddableContext;
    [ACTION_ADD_PANEL]: EmbeddableContext;
    [ACTION_INSPECT_PANEL]: EmbeddableContext;
    [REMOVE_PANEL_ACTION]: EmbeddableContext;
    [ACTION_EDIT_PANEL]: EmbeddableContext;
    [ACTION_APPLY_FILTER]: FilterActionContext;
  }
}

/**
 * This method initializes Embeddable plugin with initial set of
 * triggers and actions.
 */
export const bootstrap = (uiActions: UiActionsSetup) => {
  uiActions.registerTrigger(contextMenuTrigger);
  uiActions.registerTrigger(contextMenuDrilldownsTrigger);
  uiActions.registerTrigger(applyFilterTrigger);
  uiActions.registerTrigger(panelBadgeTrigger);
  uiActions.registerTrigger(valueClickTrigger);

  const actionApplyFilter = createFilterAction();

  uiActions.registerAction(actionApplyFilter);
};
