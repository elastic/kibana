/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import { UiActionsPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new UiActionsPlugin(initializerContext);
}

export {
  Action,
  ActionDefinition as UiActionsActionDefinition,
  ActionExecutionContext,
  ActionExecutionMeta,
  createAction,
  IncompatibleActionError,
} from './actions';
export { buildContextMenuForActions } from './context_menu';
export { UiActionsSetup, UiActionsStart } from './plugin';
export { UiActionsService, UiActionsServiceParams } from './service';
export {
  RowClickContext,
  rowClickTrigger,
  ROW_CLICK_TRIGGER,
  Trigger,
  visualizeFieldTrigger,
  visualizeGeoFieldTrigger,
  VISUALIZE_FIELD_TRIGGER,
  VISUALIZE_GEO_FIELD_TRIGGER,
} from './triggers';
export {
  ACTION_VISUALIZE_FIELD,
  ACTION_VISUALIZE_GEO_FIELD,
  ACTION_VISUALIZE_LENS_FIELD,
  VisualizeFieldContext,
} from './types';
export {
  Presentable as UiActionsPresentable,
  PresentableGrouping as UiActionsPresentableGrouping,
} from './util';
