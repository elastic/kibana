/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CapabilitiesSetup, CapabilitiesStart } from './capabilities/capabilities_service';
import type { ContextSetup } from './context/context_service';
import type {
  CoreUsageDataStart,
} from './core_usage_data/types';
import type {
  DeprecationsServiceSetup,
} from './deprecations/deprecations_service';
import type {
  ElasticsearchServiceSetup,
  ElasticsearchServiceStart,
} from './elasticsearch/types';
import type {
  ExecutionContextSetup,
  ExecutionContextStart,
} from './execution_context/execution_context_service';
import type {  HttpServiceSetup, HttpServiceStart } from './http/types';
import type { HttpResources } from './http_resources/types';
import type { I18nServiceSetup } from './i18n/i18n_service';
import type { LoggingServiceSetup } from './logging/logging_service';
import type { MetricsServiceSetup, MetricsServiceStart } from './metrics/types';
import type {
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
} from './saved_objects/saved_objects_service';
import type { StatusServiceSetup } from './status/types';
import type {
  UiSettingsServiceSetup,
  UiSettingsServiceStart,
} from './ui_settings/types';

/**
 * Context passed to the `setup` method of `standard` plugins.
 *
 * @typeParam TPluginsStart - the type of the consuming plugin's start dependencies. Should be the same
 *                            as the consuming {@link Plugin}'s `TPluginsStart` type. Used by `getStartServices`.
 * @typeParam TStart - the type of the consuming plugin's start contract. Should be the same as the
 *                     consuming {@link Plugin}'s `TStart` type. Used by `getStartServices`.
 * @public
 */
 export interface CoreSetup<TPluginsStart extends object = object, TStart = unknown> {
  /** {@link CapabilitiesSetup} */
  capabilities: CapabilitiesSetup;
  /** {@link ContextSetup} */
  context: ContextSetup;
  /** {@link ElasticsearchServiceSetup} */
  elasticsearch: ElasticsearchServiceSetup;
  /** {@link ExecutionContextSetup} */
  executionContext: ExecutionContextSetup;
  /** {@link HttpServiceSetup} */
  http: HttpServiceSetup & {
    /** {@link HttpResources} */
    resources: HttpResources;
  };
  /** {@link I18nServiceSetup} */
  i18n: I18nServiceSetup;
  /** {@link LoggingServiceSetup} */
  logging: LoggingServiceSetup;
  /** {@link MetricsServiceSetup} */
  metrics: MetricsServiceSetup;
  /** {@link SavedObjectsServiceSetup} */
  savedObjects: SavedObjectsServiceSetup;
  /** {@link StatusServiceSetup} */
  status: StatusServiceSetup;
  /** {@link UiSettingsServiceSetup} */
  uiSettings: UiSettingsServiceSetup;
  /** {@link DeprecationsServiceSetup} */
  deprecations: DeprecationsServiceSetup;
  /** {@link StartServicesAccessor} */
  getStartServices: StartServicesAccessor<TPluginsStart, TStart>;
}

/**
 * Allows plugins to get access to APIs available in start inside async handlers.
 * Promise will not resolve until Core and plugin dependencies have completed `start`.
 * This should only be used inside handlers registered during `setup` that will only be executed
 * after `start` lifecycle.
 *
 * @public
 */
export type StartServicesAccessor<
  TPluginsStart extends object = object,
  TStart = unknown
> = () => Promise<[CoreStart, TPluginsStart, TStart]>;

/**
 * Context passed to the plugins `start` method.
 *
 * @public
 */
export interface CoreStart {
  /** {@link CapabilitiesStart} */
  capabilities: CapabilitiesStart;
  /** {@link ElasticsearchServiceStart} */
  elasticsearch: ElasticsearchServiceStart;
  /** {@link ExecutionContextStart} */
  executionContext: ExecutionContextStart;
  /** {@link HttpServiceStart} */
  http: HttpServiceStart;
  /** {@link MetricsServiceStart} */
  metrics: MetricsServiceStart;
  /** {@link SavedObjectsServiceStart} */
  savedObjects: SavedObjectsServiceStart;
  /** {@link UiSettingsServiceStart} */
  uiSettings: UiSettingsServiceStart;
  /** @internal {@link CoreUsageDataStart} */
  coreUsageData: CoreUsageDataStart;
}
