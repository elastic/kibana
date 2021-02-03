/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { URL } from 'url';
import { AsyncSubject, Observable } from 'rxjs';
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
  SavedObjectsClient,
  Plugin,
  Logger,
  UiSettingsServiceStart,
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
  /**
   * @private Used to mark the completion of the old UI Settings migration
   */
  private readonly oldUiSettingsHandled$ = new AsyncSubject();
  private savedObjectsClient?: ISavedObjectsRepository;

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

  public setup(
    { http, savedObjects }: CoreSetup,
    { usageCollection, telemetryCollectionManager }: TelemetryPluginsDepsSetup
  ): TelemetryPluginSetup {
    const currentKibanaVersion = this.currentKibanaVersion;
    const config$ = this.config$;
    const isDev = this.isDev;
    registerCollection(telemetryCollectionManager);
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

  public start(core: CoreStart, { telemetryCollectionManager }: TelemetryPluginsDepsStart) {
    const { savedObjects, uiSettings } = core;
    const savedObjectsInternalRepository = savedObjects.createInternalRepository();
    this.savedObjectsClient = savedObjectsInternalRepository;

    // Not catching nor awaiting these promises because they should never reject
    this.handleOldUiSettings(uiSettings);
    this.startFetcherWhenOldSettingsAreHandled(core, telemetryCollectionManager);

    return {
      getIsOptedIn: async () => {
        await this.oldUiSettingsHandled$.pipe(take(1)).toPromise(); // Wait for the old settings to be handled
        const internalRepository = new SavedObjectsClient(savedObjectsInternalRepository);
        const telemetrySavedObject = await getTelemetrySavedObject(internalRepository);
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

  private async handleOldUiSettings(uiSettings: UiSettingsServiceStart) {
    const savedObjectsClient = new SavedObjectsClient(this.savedObjectsClient!);
    const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);

    try {
      await handleOldSettings(savedObjectsClient, uiSettingsClient);
    } catch (error) {
      this.logger.warn('Unable to update legacy telemetry configs.');
    }
    // Set the mark in the AsyncSubject as complete so all the methods that require this method to be completed before working, can move on
    this.oldUiSettingsHandled$.complete();
  }

  private async startFetcherWhenOldSettingsAreHandled(
    core: CoreStart,
    telemetryCollectionManager: TelemetryCollectionManagerPluginStart
  ) {
    await this.oldUiSettingsHandled$.pipe(take(1)).toPromise(); // Wait for the old settings to be handled
    this.fetcherTask.start(core, { telemetryCollectionManager });
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
