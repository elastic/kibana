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

import { CoreSetup, CoreStart, Plugin, KibanaRequest, Logger } from 'kibana/server';
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
    kibanaRequest: KibanaRequest
  ) => Promise<IndexPatternsCommonService>;
}

export interface IndexPatternsServiceStartDeps {
  fieldFormats: FieldFormatsStart;
  logger: Logger;
}

export class IndexPatternsService implements Plugin<void, IndexPatternsServiceStart> {
  public setup(core: CoreSetup) {
    core.savedObjects.registerType(indexPatternSavedObjectType);
    core.capabilities.registerProvider(capabilitiesProvider);

    registerRoutes(core.http);
  }

  public start(core: CoreStart, { fieldFormats, logger }: IndexPatternsServiceStartDeps) {
    const { uiSettings, savedObjects } = core;

    return {
      indexPatternsServiceFactory: async (kibanaRequest: KibanaRequest) => {
        const savedObjectsClient = savedObjects.getScopedClient(kibanaRequest);
        const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
        const formats = await fieldFormats.fieldFormatServiceFactory(uiSettingsClient);

        return new IndexPatternsCommonService({
          uiSettings: new UiSettingsServerToCommon(uiSettingsClient),
          savedObjectsClient: new SavedObjectsClientServerToCommon(savedObjectsClient),
          apiClient: new IndexPatternsApiServer(),
          fieldFormats: formats,
          onError: (error) => {
            logger.error(error);
          },
          onNotification: ({ title, text }) => {
            logger.warn(`${title} : ${text}`);
          },
        });
      },
    };
  }
}
