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
export type { UiActionsServiceParams } from '@kbn/ui-actions-browser/src/service';
export type {
  Action,
  ActionDefinition as UiActionsActionDefinition,
  ActionDefinitionContext,
  ActionExecutionContext,
  ActionExecutionMeta,
  ActionMenuItemProps,
  FrequentCompatibilityChangeAction,
} from '@kbn/ui-actions-browser/src/actions';
export type {
  Presentable as UiActionsPresentable,
  PresentableGroup as UiActionsPresentableGroup,
  PresentableGrouping as UiActionsPresentableGrouping,
} from '@kbn/ui-actions-browser/src/types';
export type { Trigger, RowClickContext } from '@kbn/ui-actions-browser/src/triggers';
export type { VisualizeFieldContext } from '@kbn/ui-actions-browser/src/types';
