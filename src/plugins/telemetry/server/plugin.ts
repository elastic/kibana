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

import { URL } from 'url';
import { Observable } from 'rxjs';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import {
  TelemetryCollectionManagerPluginSetup,
  TelemetryCollectionManagerPluginStart,
} from 'src/plugins/telemetry_collection_manager/server';
import { take } from 'rxjs/operators';
import {
  CoreSetup,
  PluginInitializerContext,
  ISavedObjectsRepository,
  CoreStart,
  IUiSettingsClient,
  SavedObjectsClient,
  Plugin,
  Logger,
  IClusterClient,
} from '../../../core/server';
import { registerRoutes } from './routes';
import { registerCollection } from './telemetry_collection';
import {
  registerTelemetryUsageCollector,
  registerTelemetryPluginUsageCollector,
} from './collectors';
import { TelemetryConfigType } from './config';
import { FetcherTask } from './fetcher';
import { handleOldSettings } from './handle_old_settings';
import { getTelemetrySavedObject } from './telemetry_repository';
import { getTelemetryOptIn } from '../common/telemetry_config';

interface TelemetryPluginsDepsSetup {
  usageCollection: UsageCollectionSetup;
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup;
}

interface TelemetryPluginsDepsStart {
  telemetryCollectionManager: TelemetryCollectionManagerPluginStart;
}

export interface TelemetryPluginSetup {
  /**
   * Resolves into the telemetry Url used to send telemetry.
   * The url is wrapped with node's [URL constructor](https://nodejs.org/api/url.html).
   */
  getTelemetryUrl: () => Promise<URL>;
}

export interface TelemetryPluginStart {
  /**
   * Resolves `true` if the user has opted into send Elastic usage data.
   * Resolves `false` if the user explicitly opted out of sending usage data to Elastic
   * or did not choose to opt-in or out -yet- after a minor or major upgrade (only when previously opted-out).
   */
  getIsOptedIn: () => Promise<boolean>;
}

type SavedObjectsRegisterType = CoreSetup['savedObjects']['registerType'];

export class TelemetryPlugin implements Plugin<TelemetryPluginSetup, TelemetryPluginStart> {
  private readonly logger: Logger;
  private readonly currentKibanaVersion: string;
  private readonly config$: Observable<TelemetryConfigType>;
  private readonly isDev: boolean;
  private readonly fetcherTask: FetcherTask;
  private savedObjectsClient?: ISavedObjectsRepository;
  private uiSettingsClient?: IUiSettingsClient;
  private elasticsearchClient?: IClusterClient;

  constructor(initializerContext: PluginInitializerContext<TelemetryConfigType>) {
    this.logger = initializerContext.logger.get();
    this.isDev = initializerContext.env.mode.dev;
    this.currentKibanaVersion = initializerContext.env.packageInfo.version;
    this.config$ = initializerContext.config.create();
    this.fetcherTask = new FetcherTask({
      ...initializerContext,
      logger: this.logger,
    });
  }

  public async setup(
    { elasticsearch, http, savedObjects }: CoreSetup,
    { usageCollection, telemetryCollectionManager }: TelemetryPluginsDepsSetup
  ): Promise<TelemetryPluginSetup> {
    const currentKibanaVersion = this.currentKibanaVersion;
    const config$ = this.config$;
    const isDev = this.isDev;
    registerCollection(
      telemetryCollectionManager,
      elasticsearch.legacy.client,
      () => this.elasticsearchClient
    );
    const router = http.createRouter();

    registerRoutes({
      config$,
      currentKibanaVersion,
      isDev,
      logger: this.logger,
      router,
      telemetryCollectionManager,
    });

    this.registerMappings((opts) => savedObjects.registerType(opts));
    this.registerUsageCollectors(usageCollection);

    return {
      getTelemetryUrl: async () => {
        const config = await config$.pipe(take(1)).toPromise();
        return new URL(config.url);
      },
    };
  }

  public async start(core: CoreStart, { telemetryCollectionManager }: TelemetryPluginsDepsStart) {
    const { savedObjects, uiSettings, elasticsearch } = core;
    this.savedObjectsClient = savedObjects.createInternalRepository();
    const savedObjectsClient = new SavedObjectsClient(this.savedObjectsClient);
    this.uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
    this.elasticsearchClient = elasticsearch.client;

    try {
      await handleOldSettings(savedObjectsClient, this.uiSettingsClient);
    } catch (error) {
      this.logger.warn('Unable to update legacy telemetry configs.');
    }

    this.fetcherTask.start(core, { telemetryCollectionManager });

    return {
      getIsOptedIn: async () => {
        const internalRepository = new SavedObjectsClient(savedObjects.createInternalRepository());
        const telemetrySavedObject = await getTelemetrySavedObject(internalRepository!);
        const config = await this.config$.pipe(take(1)).toPromise();
        const allowChangingOptInStatus = config.allowChangingOptInStatus;
        const configTelemetryOptIn = typeof config.optIn === 'undefined' ? null : config.optIn;
        const currentKibanaVersion = this.currentKibanaVersion;
        const isOptedIn = getTelemetryOptIn({
          currentKibanaVersion,
          telemetrySavedObject,
          allowChangingOptInStatus,
          configTelemetryOptIn,
        });

        return isOptedIn === true;
      },
    };
  }

  private registerMappings(registerType: SavedObjectsRegisterType) {
    registerType({
      name: 'telemetry',
      hidden: false,
      namespaceType: 'agnostic',
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
          allowChangingOptInStatus: {
            type: 'boolean',
          },
        },
      },
    });
  }

  private registerUsageCollectors(usageCollection: UsageCollectionSetup) {
    const getSavedObjectsClient = () => this.savedObjectsClient;

    registerTelemetryPluginUsageCollector(usageCollection, {
      currentKibanaVersion: this.currentKibanaVersion,
      config$: this.config$,
      getSavedObjectsClient,
    });
    registerTelemetryUsageCollector(usageCollection, this.config$);
  }
}
