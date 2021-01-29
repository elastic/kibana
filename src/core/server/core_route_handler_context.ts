/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// eslint-disable-next-line max-classes-per-file
import { InternalCoreStart } from './internal_types';
import { KibanaRequest } from './http/router';
import { SavedObjectsClientContract } from './saved_objects/types';
import {
  InternalSavedObjectsServiceStart,
  ISavedObjectTypeRegistry,
  ISavedObjectsExporter,
  ISavedObjectsImporter,
} from './saved_objects';
import {
  InternalElasticsearchServiceStart,
  IScopedClusterClient,
  LegacyScopedClusterClient,
} from './elasticsearch';
import { InternalUiSettingsServiceStart, IUiSettingsClient } from './ui_settings';

class CoreElasticsearchRouteHandlerContext {
  #client?: IScopedClusterClient;
  #legacy?: {
    client: Pick<LegacyScopedClusterClient, 'callAsInternalUser' | 'callAsCurrentUser'>;
  };

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

  public get legacy() {
    if (this.#legacy == null) {
      this.#legacy = {
        client: this.elasticsearchStart.legacy.client.asScoped(this.request),
      };
    }
    return this.#legacy;
  }
}

class CoreSavedObjectsRouteHandlerContext {
  constructor(
    private readonly savedObjectsStart: InternalSavedObjectsServiceStart,
    private readonly request: KibanaRequest
  ) {}
  #scopedSavedObjectsClient?: SavedObjectsClientContract;
  #typeRegistry?: ISavedObjectTypeRegistry;
  #exporter?: ISavedObjectsExporter;
  #importer?: ISavedObjectsImporter;

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

  public get exporter() {
    if (this.#exporter == null) {
      this.#exporter = this.savedObjectsStart.createExporter(this.client);
    }
    return this.#exporter;
  }

  public get importer() {
    if (this.#importer == null) {
      this.#importer = this.savedObjectsStart.createImporter(this.client);
    }
    return this.#importer;
  }
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

export class CoreRouteHandlerContext {
  readonly elasticsearch: CoreElasticsearchRouteHandlerContext;
  readonly savedObjects: CoreSavedObjectsRouteHandlerContext;
  readonly uiSettings: CoreUiSettingsRouteHandlerContext;

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
  }
}
