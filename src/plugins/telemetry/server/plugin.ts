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
  PluginInitializerContext,
  ISavedObjectsRepository,
  CoreStart,
  IUiSettingsClient,
  SavedObjectsClient,
  Plugin,
} from 'kibana/server';
import { Observable } from 'rxjs';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import {
  TelemetryCollectionManagerPluginSetup,
  TelemetryCollectionManagerPluginStart,
} from 'src/plugins/telemetry_collection_manager/server';
import { registerRoutes } from './routes';
import { registerCollection } from './telemetry_collection';
import {
  registerUiMetricUsageCollector,
  registerTelemetryUsageCollector,
  registerTelemetryPluginUsageCollector,
  registerManagementUsageCollector,
  registerApplicationUsageCollector,
} from './collectors';
import { TelemetryConfigType } from './config';
import { FetcherTask } from './fetcher';

export interface TelemetryPluginsSetup {
  usageCollection: UsageCollectionSetup;
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup;
}

export interface TelemetryPluginsStart {
  telemetryCollectionManager: TelemetryCollectionManagerPluginStart;
}

type SavedObjectsRegisterType = CoreSetup['savedObjects']['registerType'];

export class TelemetryPlugin implements Plugin {
  private readonly currentKibanaVersion: string;
  private readonly config$: Observable<TelemetryConfigType>;
  private readonly isDev: boolean;
  private readonly fetcherTask: FetcherTask;
  private savedObjectsClient?: ISavedObjectsRepository;
  private uiSettingsClient?: IUiSettingsClient;

  constructor(initializerContext: PluginInitializerContext<TelemetryConfigType>) {
    this.isDev = initializerContext.env.mode.dev;
    this.currentKibanaVersion = initializerContext.env.packageInfo.version;
    this.config$ = initializerContext.config.create();
    this.fetcherTask = new FetcherTask({
      ...initializerContext,
      logger: initializerContext.logger.get('telemetry'),
    });
  }

  public setup(
    core: CoreSetup,
    { usageCollection, telemetryCollectionManager }: TelemetryPluginsSetup
  ) {
    const currentKibanaVersion = this.currentKibanaVersion;
    const config$ = this.config$;
    const isDev = this.isDev;

    // TODO: core.uiSettings.register

    registerCollection(telemetryCollectionManager);
    const router = core.http.createRouter();

    registerRoutes({
      config$,
      currentKibanaVersion,
      isDev,
      router,
      telemetryCollectionManager,
    });

    this.registerMappings(opts => core.savedObjects.registerType(opts));
    this.registerUsageCollectors(usageCollection, opts => core.savedObjects.registerType(opts));
  }

  public start(core: CoreStart, { telemetryCollectionManager }: TelemetryPluginsStart) {
    const { savedObjects, uiSettings } = core;
    this.savedObjectsClient = savedObjects.createInternalRepository();
    this.uiSettingsClient = uiSettings.asScopedToClient(
      new SavedObjectsClient(this.savedObjectsClient)
    );

    this.fetcherTask.start(core, { telemetryCollectionManager });
  }

  private registerMappings(registerType: SavedObjectsRegisterType) {
    registerType({
      name: 'telemetry',
      hidden: false,
      namespaceAgnostic: true,
      mappings: {
        properties: {
          enabled: {
            type: 'boolean',
          },
          sendUsageFrom: {
            type: 'keyword',
          },
          lastReported: {
            type: 'date',
          },
          lastVersionChecked: {
            type: 'keyword',
          },
          userHasSeenNotice: {
            type: 'boolean',
          },
          reportFailureCount: {
            type: 'integer',
          },
          reportFailureVersion: {
            type: 'keyword',
          },
        },
      },
    });
  }

  private registerUsageCollectors(
    usageCollection: UsageCollectionSetup,
    registerType: SavedObjectsRegisterType
  ) {
    const getSavedObjectsClient = () => this.savedObjectsClient;
    const getUiSettingsClient = () => this.uiSettingsClient;

    registerTelemetryPluginUsageCollector(usageCollection, {
      currentKibanaVersion: this.currentKibanaVersion,
      config$: this.config$,
      getSavedObjectsClient,
    });
    registerTelemetryUsageCollector(usageCollection);
    registerManagementUsageCollector(usageCollection, getUiSettingsClient);
    registerUiMetricUsageCollector(usageCollection, getSavedObjectsClient);
    registerApplicationUsageCollector(usageCollection, registerType, getSavedObjectsClient);
  }
}
