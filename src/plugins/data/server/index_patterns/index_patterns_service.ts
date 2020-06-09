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

import { CoreSetup, CoreStart, Plugin, KibanaRequest } from 'kibana/server';
import { IUiSettingsClient, SavedObjectsClient } from 'kibana/public';
import { registerRoutes } from './routes';
import { indexPatternSavedObjectType } from '../saved_objects';
import { capabilitiesProvider } from './capabilities_provider';
import {
  IndexPatternsService as IndexPatternsCommonService,
  IndexPatternsApiClient,
} from '../../common/index_patterns';
import { FieldFormatsStart } from '../field_formats';

export interface IndexPatternsServiceStart {
  IndexPatternsServiceFactory: any;
}

export class IndexPatternsService implements Plugin<void, IndexPatternsServiceStart> {
  public setup(core: CoreSetup) {
    core.savedObjects.registerType(indexPatternSavedObjectType);
    core.capabilities.registerProvider(capabilitiesProvider);

    registerRoutes(core.http);
  }

  public start(core: CoreStart, fieldFormats: FieldFormatsStart) {
    // unsure what to do about http
    const { uiSettings, savedObjects } = core;
    // todo - how to set up uiSettings.getScopedClient()
    // todo - how to set up savedObjects.getScopedClient()

    return {
      IndexPatternsServiceFactory: async (kibanaRequest: KibanaRequest) => {
        const savedObjectsClient = savedObjects.getScopedClient(kibanaRequest);
        const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
        const formats = await fieldFormats.fieldFormatServiceFactory(uiSettingsClient);
        // todo - separate out client api, uiSettings compat

        return new IndexPatternsCommonService(
          (uiSettingsClient as unknown) as IUiSettingsClient,
          // (savedObjectsClient as unknown) as SavedObjectsClient,
          savedObjectsClient,
          {} as IndexPatternsApiClient, // hoooow
          formats,
          () => {},
          () => {},
          () => {}
        );
      },
    };
  }
}
