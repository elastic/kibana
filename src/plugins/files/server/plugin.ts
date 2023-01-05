/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  Plugin,
  Logger,
  CoreStart,
} from '@kbn/core/server';

import { AnalyticsServiceStart } from '@kbn/core/server';
import { PLUGIN_ID } from '../common/constants';
import {
  setFileKindsRegistry,
  getFileKindsRegistry,
  FileKindsRegistryImpl,
} from '../common/file_kinds_registry';
import { registerDefaultFileKinds } from '../common/register_default_file_kinds';

import { BlobStorageService } from './blob_storage_service';
import { FileServiceFactory } from './file_service';
import type {
  FilesPluginSetupDependencies,
  FilesPluginStartDependencies,
  FilesSetup,
  FilesStart,
} from './types';

import type { FilesRequestHandlerContext, FilesRouter } from './routes/types';
import { registerRoutes, registerFileKindRoutes } from './routes';
import { Counters, registerUsageCollector } from './usage';

export class FilesPlugin implements Plugin<FilesSetup, FilesStart, FilesPluginSetupDependencies> {
  private static analytics?: AnalyticsServiceStart;
  private readonly logger: Logger;
  private fileServiceFactory: undefined | FileServiceFactory;
  private securitySetup: FilesPluginSetupDependencies['security'];
  private securityStart: FilesPluginStartDependencies['security'];

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public static getAnalytics() {
    return this.analytics;
  }

  private static setAnalytics(analytics: AnalyticsServiceStart) {
    this.analytics = analytics;
  }

  public setup(
    core: CoreSetup,
    { security, usageCollection }: FilesPluginSetupDependencies
  ): FilesSetup {
    const usageCounter = usageCollection?.createUsageCounter(PLUGIN_ID);
    FileServiceFactory.setup(core.savedObjects, usageCounter);
    this.securitySetup = security;

    core.http.registerRouteHandlerContext<FilesRequestHandlerContext, typeof PLUGIN_ID>(
      PLUGIN_ID,
      async (ctx, req) => {
        return {
          security: this.securityStart,
          fileService: {
            asCurrentUser: () => this.fileServiceFactory!.asScoped(req),
            asInternalUser: () => this.fileServiceFactory!.asInternal(),
            logger: this.logger.get('files-routes'),
            usageCounter: usageCounter
              ? (counter: Counters) => usageCounter.incrementCounter({ counterName: counter })
              : undefined,
          },
        };
      }
    );

    const router: FilesRouter = core.http.createRouter();
    registerRoutes(router);
    setFileKindsRegistry(
      new FileKindsRegistryImpl((fk) => {
        registerFileKindRoutes(router, fk);
      })
    );
    registerUsageCollector({
      usageCollection,
      getFileService: () => this.fileServiceFactory?.asInternal(),
    });

    // Now that everything is set up:
    registerDefaultFileKinds();

    return {
      registerFileKind(fileKind) {
        getFileKindsRegistry().register(fileKind);
      },
    };
  }

  public start(coreStart: CoreStart, { security }: FilesPluginStartDependencies): FilesStart {
    const { savedObjects, analytics } = coreStart;
    this.securityStart = security;
    FilesPlugin.setAnalytics(analytics);
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const blobStorageService = new BlobStorageService(
      esClient,
      this.logger.get('blob-storage-service')
    );
    this.fileServiceFactory = new FileServiceFactory(
      savedObjects,
      blobStorageService,
      this.securitySetup,
      getFileKindsRegistry(),
      this.logger.get('files-service')
    );

    return {
      fileServiceFactory: this.fileServiceFactory,
    };
  }

  public stop() {}
}
