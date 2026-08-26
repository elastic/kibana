/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { CPS_TIER_ELIGIBLE_FEATURE, CPS_TIER_ELIGIBLE_FEATURE_ID } from '@kbn/cps-common';
import { NpreClient } from './npre/npre_client';
import { LinkedProjectsService } from './linked_projects';
import { registerRoutes } from './routes';
import type { CPSConfig } from './config';
import type { CPSServerSetup, CPSServerStart } from './types';

export class CPSServerPlugin implements Plugin<CPSServerSetup, CPSServerStart | undefined> {
  private readonly initContext: PluginInitializerContext;
  private readonly isServerless: boolean;
  private readonly config$: CPSConfig;
  private readonly log: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.initContext = { ...initContext };
    this.isServerless = initContext.env.packageInfo.buildFlavor === 'serverless';
    this.config$ = initContext.config.get();
    this.log = initContext.logger.get();
  }

  public setup(core: CoreSetup) {
    const { initContext, config$ } = this;
    const { cpsEnabled } = config$;

    if (this.isServerless) {
      registerRoutes(core, initContext);
    }

    core.pricing.registerProductFeatures([CPS_TIER_ELIGIBLE_FEATURE]);

    return {
      getCpsEnabled: () => !!cpsEnabled,
      isTierEligible: () => core.pricing.isFeatureAvailable(CPS_TIER_ELIGIBLE_FEATURE_ID),
    };
  }

  public start(core: CoreStart): CPSServerStart | undefined {
    const { cpsEnabled } = this.config$;
    this.log.info(`Cross-project search (CPS) is ${cpsEnabled ? 'enabled' : 'disabled'}`);

    if (!cpsEnabled) {
      return undefined;
    }

    const linkedProjectsService = new LinkedProjectsService(this.log, core.elasticsearch);

    return {
      createNpreClient: (request: KibanaRequest) =>
        new NpreClient(this.log, core.elasticsearch.client.asScoped(request)),
      getLinkedProjects: (request: KibanaRequest) =>
        linkedProjectsService.getLinkedProjects(request),
      isCpsActive: (request: KibanaRequest) => linkedProjectsService.isCpsActive(request),
    };
  }

  public stop() {}
}
