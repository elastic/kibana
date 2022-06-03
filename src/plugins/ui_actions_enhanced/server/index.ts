/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AdvancedUiActionsServerPlugin } from './plugin';

export function plugin() {
  return new AdvancedUiActionsServerPlugin();
}

export { AdvancedUiActionsServerPlugin as Plugin };
export type {
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
