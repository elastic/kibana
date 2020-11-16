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

import {
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  SavedObjectsClientContract,
  ElasticsearchClient,
} from 'kibana/server';
import { registerRoutes } from './routes';
import { indexPatternSavedObjectType } from '../saved_objects';
import { capabilitiesProvider } from './capabilities_provider';
import { IndexPatternsService as IndexPatternsCommonService } from '../../common/index_patterns';
import { FieldFormatsStart } from '../field_formats';
import { UiSettingsServerToCommon } from './ui_settings_wrapper';
import { IndexPatternsApiServer } from './index_patterns_api_client';
import { SavedObjectsClientServerToCommon } from './saved_objects_client_wrapper';

export interface IndexPatternsServiceStart {
  indexPatternsServiceFactory: (
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient
  ) => Promise<IndexPatternsCommonService>;
}

export interface IndexPatternsServiceStartDeps {
  fieldFormats: FieldFormatsStart;
  logger: Logger;
}

export class IndexPatternsService implements Plugin<void, IndexPatternsServiceStart> {
  #uiSettings?: CoreStart['uiSettings'];
  #fieldFormats?: FieldFormatsStart;
  #logger?: Logger;

  public setup(core: CoreSetup) {
    core.savedObjects.registerType(indexPatternSavedObjectType);
    core.capabilities.registerProvider(capabilitiesProvider);

    registerRoutes(core.http);
  }

  public start(core: CoreStart, { fieldFormats, logger }: IndexPatternsServiceStartDeps) {
    this.#uiSettings = core.uiSettings;
    this.#fieldFormats = fieldFormats;
    this.#logger = logger;

    return {
      indexPatternsServiceFactory: this.createIndexPatternsService.bind(this),
    };
  }

  public async createIndexPatternsService(
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient
  ) {
    if (!this.#uiSettings) throw new Error('UI Settings not set in IndexPatternsService.');
    if (!this.#fieldFormats) throw new Error('Field formats not set in IndexPatternsService.');
    if (!this.#logger) throw new Error('Logger not set in IndexPatternsService.');

    const uiSettingsClient = this.#uiSettings.asScopedToClient(savedObjectsClient);
    const formats = await this.#fieldFormats.fieldFormatServiceFactory(uiSettingsClient);

    return new IndexPatternsCommonService({
      uiSettings: new UiSettingsServerToCommon(uiSettingsClient),
      savedObjectsClient: new SavedObjectsClientServerToCommon(savedObjectsClient),
      apiClient: new IndexPatternsApiServer(elasticsearchClient),
      fieldFormats: formats,
      onError: (error) => {
        this.#logger!.error(error);
      },
      onNotification: ({ title, text }) => {
        this.#logger!.warn(`${title} : ${text}`);
      },
    });
  }
}
