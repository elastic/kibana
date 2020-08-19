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

import { PluginInitializerContext } from '../../../core/public';
import { UiActionsPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new UiActionsPlugin(initializerContext);
}

export { UiActionsSetup, UiActionsStart } from './plugin';
export { UiActionsServiceParams, UiActionsService } from './service';
export {
  Action,
  ActionDefinition as UiActionsActionDefinition,
  createAction,
  IncompatibleActionError,
} from './actions';
export { buildContextMenuForActions } from './context_menu';
export { Presentable as UiActionsPresentable } from './util';
export {
  Trigger,
  TriggerContext,
  SELECT_RANGE_TRIGGER,
  selectRangeTrigger,
  VALUE_CLICK_TRIGGER,
  valueClickTrigger,
  APPLY_FILTER_TRIGGER,
  applyFilterTrigger,
  VISUALIZE_FIELD_TRIGGER,
  visualizeFieldTrigger,
  VISUALIZE_GEO_FIELD_TRIGGER,
  visualizeGeoFieldTrigger,
} from './triggers';
export {
  TriggerContextMapping,
  TriggerId,
  ActionContextMapping,
  ActionType,
  VisualizeFieldContext,
  ACTION_VISUALIZE_FIELD,
  ACTION_VISUALIZE_GEO_FIELD,
} from './types';
export {
  ActionByType,
  ActionDefinitionByType,
  ActionExecutionContext,
  ActionExecutionMeta,
} from './actions';
