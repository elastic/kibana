/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

export { UiActionsServiceEnhancements } from './services';

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
