/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  PluginInitializerContext,
  Logger,
  CoreSetup,
  CoreStart,
  ISavedObjectsRepository,
  Plugin,
} from '@kbn/core/server';
import { setupRoutes } from './routes';
import type { ConfigType } from './config';
import type { ICollectorSet } from './collector/types';
import type { UsageCountersServiceSetup, UsageCountersServiceStart } from './usage_counters/types';
import { CollectorSet } from './collector';
import { UsageCountersService } from './usage_counters';

/** Plugin's setup API **/
export type UsageCollectionSetup = ICollectorSet & UsageCountersServiceSetup;

/** Plugin's start API **/
export type UsageCollectionStart = UsageCountersServiceStart;

export class UsageCollectionPlugin implements Plugin<UsageCollectionSetup, UsageCollectionStart> {
  private readonly logger: Logger;
  private savedObjects?: ISavedObjectsRepository;
  private usageCountersService?: UsageCountersService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public setup(core: CoreSetup): UsageCollectionSetup {
    const config = this.initializerContext.config.get<ConfigType>();
    const kibanaIndex = core.savedObjects.getDefaultIndex();

    const collectorSet = new CollectorSet({
      logger: this.logger.get('usage-collection', 'collector-set'),
      executionContext: core.executionContext,
      maximumWaitTimeForAllCollectorsInS: config.maximumWaitTimeForAllCollectorsInS,
    });

    this.usageCountersService = new UsageCountersService({
      logger: this.logger.get('usage-collection', 'usage-counters-service'),
      retryCount: config.usageCounters.retryCount,
      bufferDurationMs: config.usageCounters.bufferDuration.asMilliseconds(),
    });

    const usageCountersSetup = this.usageCountersService.setup(core);

    const router = core.http.createRouter();
    setupRoutes({
      router,
      usageCounters: usageCountersSetup,
      getSavedObjects: () => this.savedObjects,
      collectorSet,
      config: {
        allowAnonymous: core.status.isStatusPageAnonymous(),
        kibanaIndex,
        kibanaVersion: this.initializerContext.env.packageInfo.version,
        server: core.http.getServerInfo(),
        uuid: this.initializerContext.env.instanceUuid,
      },
      metrics: core.metrics,
      overallStatus$: core.status.overall$,
    });

    return {
      // usage counters methods
      createUsageCounter: usageCountersSetup.createUsageCounter,
      getUsageCounterByDomainId: usageCountersSetup.getUsageCounterByDomainId,
      // collector set methods
      bulkFetch: collectorSet.bulkFetch,
      getCollectorByType: collectorSet.getCollectorByType,
      makeStatsCollector: collectorSet.makeStatsCollector,
      makeUsageCollector: collectorSet.makeUsageCollector,
      registerCollector: collectorSet.registerCollector,
      toApiFieldNames: collectorSet.toApiFieldNames,
      toObject: collectorSet.toObject,
    };
  }

  public start({ savedObjects }: CoreStart): UsageCollectionStart {
    this.logger.debug('Starting plugin');
    const config = this.initializerContext.config.get<ConfigType>();
    if (!this.usageCountersService) {
      throw new Error('plugin setup must be called first.');
    }

    this.savedObjects = savedObjects.createInternalRepository();
    const usageCountersStart = config.usageCounters.enabled
      ? this.usageCountersService.start({ savedObjects })
      : this.usageCountersService.stop();

    return {
      search: usageCountersStart.search,
    };
  }

  public stop() {
    this.logger.debug('Stopping plugin');
    this.usageCountersService?.stop();
  }
}
