/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export async function plugin() {
  const { AdvancedUiActionsServerPlugin } = await import('./plugin');
  return new AdvancedUiActionsServerPlugin();
}

export type {
  AdvancedUiActionsServerPlugin as Plugin,
  SetupContract as AdvancedUiActionsSetup,
  StartContract as AdvancedUiActionsStart,
} from './plugin';

export type {
  ActionFactoryDefinition as UiActionsEnhancedActionFactoryDefinition,
  ActionFactory as UiActionsEnhancedActionFactory,
} from './types';

export type {
  DynamicActionsState,
  BaseActionConfig as UiActionsEnhancedBaseActionConfig,
  SerializedAction as UiActionsEnhancedSerializedAction,
  SerializedEvent as UiActionsEnhancedSerializedEvent,
} from '../common/types';
