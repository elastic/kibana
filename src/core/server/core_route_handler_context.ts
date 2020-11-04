/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// eslint-disable-next-line max-classes-per-file
import { InternalCoreStart } from './internal_types';
import { KibanaRequest } from './http/router';
import { SavedObjectsClientContract } from './saved_objects/types';
import { InternalSavedObjectsServiceStart, ISavedObjectTypeRegistry } from './saved_objects';
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
