/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { UiActionsPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new UiActionsPlugin(initializerContext);
}

export type {
  UiActionsPublicSetup as UiActionsSetup,
  UiActionsPublicStart as UiActionsStart,
} from './plugin';
export type { Action, ActionDefinition as UiActionsActionDefinition } from './actions';
export { ActionInternal, createAction, IncompatibleActionError } from './actions';
export { buildContextMenuForActions } from './context_menu';
export type {
  Presentable as UiActionsPresentable,
  PresentableGroup as UiActionsPresentableGroup,
  PresentableGrouping as UiActionsPresentableGrouping,
} from '@kbn/ui-actions-browser/src/types';
export type { Trigger, RowClickContext, VisualizeFieldContext } from './types';
export {
  ACTION_VISUALIZE_FIELD,
  ACTION_VISUALIZE_GEO_FIELD,
  ACTION_VISUALIZE_LENS_FIELD,
} from './types';
export type {
  ActionExecutionContext,
  ActionExecutionMeta,
  ActionMenuItemProps,
  FrequentCompatibilityChangeAction,
} from './actions';
export { triggers } from './triggers';
