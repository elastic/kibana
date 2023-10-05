/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { URL } from 'url';
import {
  type Observable,
  startWith,
  firstValueFrom,
  ReplaySubject,
  exhaustMap,
  timer,
  distinctUntilChanged,
  filter,
  takeUntil,
  tap,
  shareReplay,
  map,
} from 'rxjs';

import { ElasticV3ServerShipper } from '@kbn/analytics-shippers-elastic-v3-server';

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type {
  TelemetryCollectionManagerPluginSetup,
  TelemetryCollectionManagerPluginStart,
} from '@kbn/telemetry-collection-manager-plugin/server';
import type {
  CoreSetup,
  PluginInitializerContext,
  ISavedObjectsRepository,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { SavedObjectsClient } from '@kbn/core/server';

import apm from 'elastic-apm-node';
import {
  type TelemetrySavedObject,
  getTelemetrySavedObject,
  registerTelemetrySavedObject,
  TELEMETRY_SAVED_OBJECT_TYPE,
} from './saved_objects';
import { registerRoutes } from './routes';
import { registerCollection } from './telemetry_collection';
import {
  registerTelemetryUsageCollector,
  registerTelemetryPluginUsageCollector,
} from './collectors';
import type { TelemetryConfigLabels, TelemetryConfigType } from './config';
import { FetcherTask } from './fetcher';
import { OPT_IN_POLL_INTERVAL_MS } from '../common/constants';
import { getTelemetryChannelEndpoint } from '../common/telemetry_config';
import { getTelemetryOptIn } from './telemetry_config';

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
   * Resolves `true` if sending usage to Elastic is enabled.
   * Resolves `false` if the user explicitly opted out of sending usage data to Elastic
   * or did not choose to opt-in or out -yet- after a minor or major upgrade (only when previously opted-out).
   *
   * @track-adoption
   */
  getIsOptedIn: () => Promise<boolean>;
}

export class TelemetryPlugin implements Plugin<TelemetryPluginSetup, TelemetryPluginStart> {
  private readonly logger: Logger;
  private readonly currentKibanaVersion: string;
  private readonly initialConfig: TelemetryConfigType;
  private readonly config$: Observable<TelemetryConfigType>;
  private readonly isOptedIn$: Observable<boolean>;
  private isOptedIn?: boolean;
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
  private readonly savedObjectsInternalClient$ = new ReplaySubject<SavedObjectsClient>(1);

  private readonly pluginStop$ = new ReplaySubject<void>(1);

  private security?: SecurityPluginStart;

  constructor(initializerContext: PluginInitializerContext<TelemetryConfigType>) {
    this.logger = initializerContext.logger.get();
    this.isDev = initializerContext.env.mode.dev;
    this.currentKibanaVersion = initializerContext.env.packageInfo.version;
    this.config$ = initializerContext.config.create();
    this.initialConfig = initializerContext.config.get();
    this.fetcherTask = new FetcherTask({
      ...initializerContext,
      logger: this.logger,
    });

    // If the opt-in selection cannot be changed, set it as early as possible.
    const { optIn, allowChangingOptInStatus } = this.initialConfig;
    this.isOptedIn = allowChangingOptInStatus === false ? optIn : undefined;

    // Poll for the opt-in status
    this.isOptedIn$ = timer(0, OPT_IN_POLL_INTERVAL_MS).pipe(
      exhaustMap(() => this.getOptInStatus()),
      takeUntil(this.pluginStop$),
      startWith(this.isOptedIn),
      filter((isOptedIn): isOptedIn is boolean => typeof isOptedIn === 'boolean'),
      distinctUntilChanged(),
      tap((optedIn) => (this.isOptedIn = optedIn)),
      shareReplay(1)
    );
  }

  public setup(
    { analytics, docLinks, http, savedObjects }: CoreSetup,
    { usageCollection, telemetryCollectionManager }: TelemetryPluginsDepsSetup
  ): TelemetryPluginSetup {
    this.isOptedIn$.subscribe((optedIn) => {
      const optInStatusMsg = optedIn ? 'enabled' : 'disabled';
      this.logger.info(
        `Telemetry collection is ${optInStatusMsg}. For more information on telemetry settings, refer to ${docLinks.links.telemetry.settings}.`
      );
    });

    if (this.isOptedIn !== undefined) {
      analytics.optIn({ global: { enabled: this.isOptedIn } });
    }

    const currentKibanaVersion = this.currentKibanaVersion;

    analytics.registerShipper(ElasticV3ServerShipper, {
      channelName: 'kibana-server',
      version: currentKibanaVersion,
      sendTo: this.initialConfig.sendUsageTo === 'prod' ? 'production' : 'staging',
    });

    analytics.registerContextProvider<{ labels: TelemetryConfigLabels }>({
      name: 'telemetry labels',
      context$: this.config$.pipe(
        map(({ labels }) => ({ labels })),
        tap(({ labels }) =>
          Object.entries(labels).forEach(([key, value]) => apm.setGlobalLabel(key, value))
        )
      ),
      schema: {
        labels: {
          type: 'pass_through',
          _meta: {
            description:
              'Custom labels added to the telemetry.labels config in the kibana.yml. Validated and limited to a known set of labels.',
          },
        },
      },
    });

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

    registerTelemetrySavedObject((opts) => savedObjects.registerType(opts));
    this.registerUsageCollectors(usageCollection);

    return {
      getTelemetryUrl: async () => {
        const { appendServerlessChannelsSuffix, sendUsageTo } = await firstValueFrom(config$);
        const telemetryUrl = getTelemetryChannelEndpoint({
          appendServerlessChannelsSuffix,
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
    const { analytics, savedObjects } = core;

    this.isOptedIn$.subscribe((enabled) => analytics.optIn({ global: { enabled } }));

    const savedObjectsInternalRepository = savedObjects.createInternalRepository([
      TELEMETRY_SAVED_OBJECT_TYPE,
    ]);
    this.savedObjectsInternalRepository = savedObjectsInternalRepository;
    this.savedObjectsInternalClient$.next(new SavedObjectsClient(savedObjectsInternalRepository));

    this.security = security;

    this.startFetcher(core, telemetryCollectionManager);

    return {
      getIsOptedIn: async () => this.isOptedIn === true,
    };
  }

  public stop() {
    this.pluginStop$.next();
    this.pluginStop$.complete();
    this.savedObjectsInternalClient$.complete();
    this.fetcherTask.stop();
  }

  private async getOptInStatus(): Promise<boolean | undefined> {
    const internalRepositoryClient = await firstValueFrom(this.savedObjectsInternalClient$, {
      defaultValue: undefined,
    });
    if (!internalRepositoryClient) return;

    let telemetrySavedObject: TelemetrySavedObject | undefined;
    try {
      telemetrySavedObject = await getTelemetrySavedObject(internalRepositoryClient);
    } catch (err) {
      this.logger.debug('Failed to check telemetry opt-in status: ' + err.message);
      // If we can't get the saved object due to any error other than 404, skip this round.
      return;
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

    if (typeof isOptedIn === 'boolean') {
      return isOptedIn;
    }
  }

  private startFetcher(
    core: CoreStart,
    telemetryCollectionManager: TelemetryCollectionManagerPluginStart
  ) {
    // We start the fetcher having updated everything we need to use the config settings
    this.fetcherTask.start(core, { telemetryCollectionManager });
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
