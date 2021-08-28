/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CapabilitiesSetup, CapabilitiesStart } from './capabilities/capabilities_service';
import type { ContextSetup } from './context/context_service';
import type { CoreUsageDataStart } from './core_usage_data/types';
import type {
  DeprecationsClient,
  DeprecationsServiceSetup,
} from './deprecations/deprecations_service';
import type { IScopedClusterClient } from './elasticsearch/client/scoped_cluster_client';
import type {
  ElasticsearchServicePreboot,
  ElasticsearchServiceSetup,
  ElasticsearchServiceStart,
} from './elasticsearch/types';
import type {
  ExecutionContextSetup,
  ExecutionContextStart,
} from './execution_context/execution_context_service';
import type { HttpServicePreboot, HttpServiceSetup, HttpServiceStart } from './http/types';
import type { HttpResources } from './http_resources/types';
import type { I18nServiceSetup } from './i18n/i18n_service';
import type { LoggingServiceSetup } from './logging/logging_service';
import type { MetricsServiceSetup, MetricsServiceStart } from './metrics/types';
import type { PrebootServicePreboot } from './preboot/types';
import type { ISavedObjectsExporter } from './saved_objects/export/saved_objects_exporter';
import type { ISavedObjectsImporter } from './saved_objects/import/saved_objects_importer';
import type {
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
} from './saved_objects/saved_objects_service';
import type { ISavedObjectTypeRegistry } from './saved_objects/saved_objects_type_registry';
import type { SavedObjectsClientProviderOptions } from './saved_objects/service/lib/scoped_client_provider';
import type { SavedObjectsClientContract } from './saved_objects/types';
import type { StatusServiceSetup } from './status/types';
import type {
  IUiSettingsClient,
  UiSettingsServiceSetup,
  UiSettingsServiceStart,
} from './ui_settings/types';

/**
 * Plugin specific context passed to a route handler.
 *
 * Provides the following clients and services:
 *    - {@link SavedObjectsClient | savedObjects.client} - Saved Objects client
 *      which uses the credentials of the incoming request
 *    - {@link ISavedObjectTypeRegistry | savedObjects.typeRegistry} - Type registry containing
 *      all the registered types.
 *    - {@link IScopedClusterClient | elasticsearch.client} - Elasticsearch
 *      data client which uses the credentials of the incoming request
 *    - {@link IUiSettingsClient | uiSettings.client} - uiSettings client
 *      which uses the credentials of the incoming request
 *
 * @public
 */
export interface RequestHandlerContext {
  core: {
    savedObjects: {
      client: SavedObjectsClientContract;
      typeRegistry: ISavedObjectTypeRegistry;
      getClient: (options?: SavedObjectsClientProviderOptions) => SavedObjectsClientContract;
      getExporter: (client: SavedObjectsClientContract) => ISavedObjectsExporter;
      getImporter: (client: SavedObjectsClientContract) => ISavedObjectsImporter;
    };
    elasticsearch: {
      client: IScopedClusterClient;
    };
    uiSettings: {
      client: IUiSettingsClient;
    };
    deprecations: {
      client: DeprecationsClient;
    };
  };
}

/**
 * Context passed to the `setup` method of `preboot` plugins.
 * @public
 */
export interface CorePreboot {
  /** {@link ElasticsearchServicePreboot} */
  elasticsearch: ElasticsearchServicePreboot;
  /** {@link HttpServicePreboot} */
  http: HttpServicePreboot;
  /** {@link PrebootServicePreboot} */
  preboot: PrebootServicePreboot;
}

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
