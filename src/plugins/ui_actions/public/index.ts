/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
export {
  Presentable as UiActionsPresentable,
  PresentableGrouping as UiActionsPresentableGrouping,
} from './util';
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
  ROW_CLICK_TRIGGER,
  rowClickTrigger,
  RowClickContext,
} from './triggers';
export {
  TriggerContextMapping,
  TriggerId,
  ActionContextMapping,
  ActionType,
  VisualizeFieldContext,
  ACTION_VISUALIZE_FIELD,
  ACTION_VISUALIZE_GEO_FIELD,
  ACTION_VISUALIZE_LENS_FIELD,
} from './types';
export {
  ActionByType,
  ActionDefinitionByType,
  ActionExecutionContext,
  ActionExecutionMeta,
} from './actions';
