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
import { UiActionsSetup } from 'src/plugins/ui_actions/public';
import { Filter } from '../../data/public';
import {
  applyFilterTrigger,
  contextMenuTrigger,
  createFilterAction,
  panelBadgeTrigger,
  selectRangeTrigger,
  valueClickTrigger,
  EmbeddableVisTriggerContext,
  IEmbeddable,
  APPLY_FILTER_TRIGGER,
  VALUE_CLICK_TRIGGER,
  SELECT_RANGE_TRIGGER,
  CONTEXT_MENU_TRIGGER,
  PANEL_BADGE_TRIGGER,
} from './lib';

declare module '../../ui_actions/public' {
  export interface TriggerContextMapping {
    [SELECT_RANGE_TRIGGER]: EmbeddableVisTriggerContext;
    [VALUE_CLICK_TRIGGER]: EmbeddableVisTriggerContext;
    [APPLY_FILTER_TRIGGER]: {
      embeddable: IEmbeddable;
      filters: Filter[];
    };
    [CONTEXT_MENU_TRIGGER]: object;
    [PANEL_BADGE_TRIGGER]: object;
  }
}

/**
 * This method initializes Embeddable plugin with initial set of
 * triggers and actions.
 */
export const bootstrap = (uiActions: UiActionsSetup) => {
  uiActions.registerTrigger(contextMenuTrigger);
  uiActions.registerTrigger(applyFilterTrigger);
  uiActions.registerTrigger(panelBadgeTrigger);
  uiActions.registerTrigger(selectRangeTrigger);
  uiActions.registerTrigger(valueClickTrigger);

  const actionApplyFilter = createFilterAction();

  uiActions.registerAction(actionApplyFilter);
};
