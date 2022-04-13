/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { URL } from 'url';
import type { Observable } from 'rxjs';
import { firstValueFrom, ReplaySubject } from 'rxjs';
import type { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import type {
  TelemetryCollectionManagerPluginSetup,
  TelemetryCollectionManagerPluginStart,
} from 'src/plugins/telemetry_collection_manager/server';
import type {
  CoreSetup,
  PluginInitializerContext,
  ISavedObjectsRepository,
  CoreStart,
  Plugin,
  Logger,
} from 'src/core/server';
import type { SecurityPluginStart } from '../../../../x-pack/plugins/security/server';
import { SavedObjectsClient } from '../../../core/server';
import { registerRoutes } from './routes';
import { registerCollection } from './telemetry_collection';
import {
  registerTelemetryUsageCollector,
  registerTelemetryPluginUsageCollector,
} from './collectors';
import type { TelemetryConfigType } from './config';
import { FetcherTask } from './fetcher';
import { getTelemetrySavedObject, TelemetrySavedObject } from './telemetry_repository';
import { getTelemetryOptIn, getTelemetryChannelEndpoint } from '../common/telemetry_config';

interface TelemetryPluginsDepsSetup {
  usageCollection: UsageCollectionSetup;
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup;
}

interface TelemetryPluginsDepsStart {
  telemetryCollectionManager: TelemetryCollectionManagerPluginStart;
  security?: SecurityPluginStart;
}

/**
 * Server's setup exposed APIs by the telemetry plugin
 */
export interface TelemetryPluginSetup {
  /**
   * Resolves into the telemetry Url used to send telemetry.
   * The url is wrapped with node's [URL constructor](https://nodejs.org/api/url.html).
   */
  getTelemetryUrl: () => Promise<URL>;
}

/**
 * Server's start exposed APIs by the telemetry plugin
 */
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
  private savedObjectsInternalRepository?: ISavedObjectsRepository;

  /**
   * @private
   * Used to interact with the Telemetry Saved Object.
   * Some users may not have access to the document but some queries
   * are still relevant to them like fetching when was the last time it was reported.
   *
   * Using the internal client in all cases ensures the permissions to interact the document.
   */
  private savedObjectsInternalClient$ = new ReplaySubject<SavedObjectsClient>(1);

  private security?: SecurityPluginStart;

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
      savedObjectsInternalClient$: this.savedObjectsInternalClient$,
      getSecurity: () => this.security,
    });

    this.registerMappings((opts) => savedObjects.registerType(opts));
    this.registerUsageCollectors(usageCollection);

    return {
      getTelemetryUrl: async () => {
        const { sendUsageTo } = await firstValueFrom(config$);
        const telemetryUrl = getTelemetryChannelEndpoint({
          env: sendUsageTo,
          channelName: 'snapshot',
        });

        return new URL(telemetryUrl);
      },
    };
  }

  public start(
    core: CoreStart,
    { telemetryCollectionManager, security }: TelemetryPluginsDepsStart
  ) {
    const { savedObjects } = core;
    const savedObjectsInternalRepository = savedObjects.createInternalRepository();
    this.savedObjectsInternalRepository = savedObjectsInternalRepository;
    this.savedObjectsInternalClient$.next(new SavedObjectsClient(savedObjectsInternalRepository));

    this.security = security;

    this.startFetcher(core, telemetryCollectionManager);

    return {
      getIsOptedIn: async () => {
        const internalRepositoryClient = await firstValueFrom(this.savedObjectsInternalClient$);
        let telemetrySavedObject: TelemetrySavedObject = false; // if an error occurs while fetching opt-in status, a `false` result indicates that Kibana cannot opt-in
        try {
          telemetrySavedObject = await getTelemetrySavedObject(internalRepositoryClient);
        } catch (err) {
          this.logger.debug('Failed to check telemetry opt-in status: ' + err.message);
        }

        const config = await firstValueFrom(this.config$);
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

  private startFetcher(
    core: CoreStart,
    telemetryCollectionManager: TelemetryCollectionManagerPluginStart
  ) {
    // We start the fetcher having updated everything we need to using the config settings
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
    const getSavedObjectsClient = () => this.savedObjectsInternalRepository;

    registerTelemetryPluginUsageCollector(usageCollection, {
      currentKibanaVersion: this.currentKibanaVersion,
      config$: this.config$,
      getSavedObjectsClient,
    });
    registerTelemetryUsageCollector(usageCollection, this.config$);
  }
}
