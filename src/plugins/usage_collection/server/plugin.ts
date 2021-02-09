/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PluginInitializerContext,
  Logger,
  CoreSetup,
  CoreStart,
  ISavedObjectsRepository,
  Plugin,
} from 'src/core/server';
import { ConfigType } from './config';
import { CollectorSet, CollectorSetPublic } from './collector';
import { setupRoutes } from './routes';

export type UsageCollectionSetup = CollectorSetPublic;
export class UsageCollectionPlugin implements Plugin<CollectorSet> {
  private readonly logger: Logger;
  private savedObjects?: ISavedObjectsRepository;
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    const config = this.initializerContext.config.get<ConfigType>();

    const collectorSet = new CollectorSet({
      logger: this.logger.get('collector-set'),
      maximumWaitTimeForAllCollectorsInS: config.maximumWaitTimeForAllCollectorsInS,
    });

    const globalConfig = this.initializerContext.config.legacy.get();

    const router = core.http.createRouter();
    setupRoutes({
      router,
      getSavedObjects: () => this.savedObjects,
      collectorSet,
      config: {
        allowAnonymous: core.status.isStatusPageAnonymous(),
        kibanaIndex: globalConfig.kibana.index,
        kibanaVersion: this.initializerContext.env.packageInfo.version,
        server: core.http.getServerInfo(),
        uuid: this.initializerContext.env.instanceUuid,
      },
      metrics: core.metrics,
      overallStatus$: core.status.overall$,
    });

    return collectorSet;
  }

  public start({ savedObjects }: CoreStart) {
    this.logger.debug('Starting plugin');
    this.savedObjects = savedObjects.createInternalRepository();
  }

  public stop() {
    this.logger.debug('Stopping plugin');
  }
}
