/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { AdvancedUiActionsPublicPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new AdvancedUiActionsPublicPlugin(initializerContext);
}

export { AdvancedUiActionsPublicPlugin as Plugin };
export type {
  SetupContract as AdvancedUiActionsSetup,
  StartContract as AdvancedUiActionsStart,
} from './plugin';

export type {
  ActionFactoryDefinition as UiActionsEnhancedActionFactoryDefinition,
  SerializedAction as UiActionsEnhancedSerializedAction,
  SerializedEvent as UiActionsEnhancedSerializedEvent,
  DynamicActionManagerParams as UiActionsEnhancedDynamicActionManagerParams,
  DynamicActionManagerState as UiActionsEnhancedDynamicActionManagerState,
  BaseActionFactoryContext as UiActionsEnhancedBaseActionFactoryContext,
  BaseActionConfig as UiActionsEnhancedBaseActionConfig,
} from './dynamic_actions';
export {
  ActionFactory as UiActionsEnhancedActionFactory,
  AbstractActionStorage as UiActionsEnhancedAbstractActionStorage,
  DynamicActionManager as UiActionsEnhancedDynamicActionManager,
  MemoryActionStorage as UiActionsEnhancedMemoryActionStorage,
} from './dynamic_actions';

export type { DynamicActionsState } from './services/ui_actions_service_enhancements';

export type {
  DrilldownDefinition as UiActionsEnhancedDrilldownDefinition,
  DrilldownTemplate as UiActionsEnhancedDrilldownTemplate,
} from './drilldowns';
export type {
  UrlDrilldownConfig,
  UrlDrilldownGlobalScope,
  UrlDrilldownScope,
  UrlDrilldownOptions,
} from './drilldowns/url_drilldown';
export {
  urlDrilldownCompileUrl,
  UrlDrilldownCollectConfig,
  UrlDrilldownOptionsComponent,
  urlDrilldownGlobalScopeProvider,
  urlDrilldownValidateUrl,
  urlDrilldownValidateUrlTemplate,
  DEFAULT_URL_DRILLDOWN_OPTIONS,
} from './drilldowns/url_drilldown';
