/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type {
  DeprecationsClient,
  InternalDeprecationsServiceStart,
} from './deprecations/deprecations_service';
import type { IScopedClusterClient } from './elasticsearch/client/scoped_cluster_client';
import type { InternalElasticsearchServiceStart } from './elasticsearch/types';
import { KibanaRequest } from './http/router/request';
import type { InternalCoreStart } from './internal_types';
import type { InternalSavedObjectsServiceStart } from './saved_objects/saved_objects_service';
import type { ISavedObjectTypeRegistry } from './saved_objects/saved_objects_type_registry';
import type { SavedObjectsClientProviderOptions } from './saved_objects/service/lib/scoped_client_provider';
import type { SavedObjectsClientContract } from './saved_objects/types';
import type { InternalUiSettingsServiceStart, IUiSettingsClient } from './ui_settings/types';

// eslint-disable-next-line max-classes-per-file

class CoreElasticsearchRouteHandlerContext {
  #client?: IScopedClusterClient;

  constructor(
    private readonly elasticsearchStart: InternalElasticsearchServiceStart,
    private readonly request: KibanaRequest
  ) {}

  public get client() {
    if (this.#client == null) {
      this.#client = this.elasticsearchStart.client.asScoped(this.request);
    }
    return this.#client;
  }
}

class CoreSavedObjectsRouteHandlerContext {
  constructor(
    private readonly savedObjectsStart: InternalSavedObjectsServiceStart,
    private readonly request: KibanaRequest
  ) {}
  #scopedSavedObjectsClient?: SavedObjectsClientContract;
  #typeRegistry?: ISavedObjectTypeRegistry;

  public get client() {
    if (this.#scopedSavedObjectsClient == null) {
      this.#scopedSavedObjectsClient = this.savedObjectsStart.getScopedClient(this.request);
    }
    return this.#scopedSavedObjectsClient;
  }

  public get typeRegistry() {
    if (this.#typeRegistry == null) {
      this.#typeRegistry = this.savedObjectsStart.getTypeRegistry();
    }
    return this.#typeRegistry;
  }

  public getClient = (options?: SavedObjectsClientProviderOptions) => {
    if (!options) return this.client;
    return this.savedObjectsStart.getScopedClient(this.request, options);
  };

  public getExporter = (client: SavedObjectsClientContract) => {
    return this.savedObjectsStart.createExporter(client);
  };

  public getImporter = (client: SavedObjectsClientContract) => {
    return this.savedObjectsStart.createImporter(client);
  };
}

class CoreUiSettingsRouteHandlerContext {
  #client?: IUiSettingsClient;
  constructor(
    private readonly uiSettingsStart: InternalUiSettingsServiceStart,
    private readonly savedObjectsRouterHandlerContext: CoreSavedObjectsRouteHandlerContext
  ) {}

  public get client() {
    if (this.#client == null) {
      this.#client = this.uiSettingsStart.asScopedToClient(
        this.savedObjectsRouterHandlerContext.client
      );
    }
    return this.#client;
  }
}

class CoreDeprecationsRouteHandlerContext {
  #client?: DeprecationsClient;
  constructor(
    private readonly deprecationsStart: InternalDeprecationsServiceStart,
    private readonly elasticsearchRouterHandlerContext: CoreElasticsearchRouteHandlerContext,
    private readonly savedObjectsRouterHandlerContext: CoreSavedObjectsRouteHandlerContext
  ) {}

  public get client() {
    if (this.#client == null) {
      this.#client = this.deprecationsStart.asScopedToClient(
        this.elasticsearchRouterHandlerContext.client,
        this.savedObjectsRouterHandlerContext.client
      );
    }
    return this.#client;
  }
}

export class CoreRouteHandlerContext {
  readonly elasticsearch: CoreElasticsearchRouteHandlerContext;
  readonly savedObjects: CoreSavedObjectsRouteHandlerContext;
  readonly uiSettings: CoreUiSettingsRouteHandlerContext;
  readonly deprecations: CoreDeprecationsRouteHandlerContext;

  constructor(
    private readonly coreStart: InternalCoreStart,
    private readonly request: KibanaRequest
  ) {
    this.elasticsearch = new CoreElasticsearchRouteHandlerContext(
      this.coreStart.elasticsearch,
      this.request
    );
    this.savedObjects = new CoreSavedObjectsRouteHandlerContext(
      this.coreStart.savedObjects,
      this.request
    );
    this.uiSettings = new CoreUiSettingsRouteHandlerContext(
      this.coreStart.uiSettings,
      this.savedObjects
    );
    this.deprecations = new CoreDeprecationsRouteHandlerContext(
      this.coreStart.deprecations,
      this.elasticsearch,
      this.savedObjects
    );
  }
}
