/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  Plugin,
  Logger,
  CoreStart,
} from '@kbn/core/server';

import { PLUGIN_ID } from '../common/constants';
import {
  setFileKindsRegistry,
  getFileKindsRegistry,
  FileKindsRegistryImpl,
} from '../common/file_kinds_registry';

import { BlobStorageService } from './blob_storage_service';
import { FileServiceFactory } from './file_service';
import type { FilesPluginSetupDependencies, FilesSetup, FilesStart } from './types';

import type { FilesRequestHandlerContext, FilesRouter } from './routes/types';
import { registerRoutes, registerFileKindRoutes } from './routes';
import { Counters, registerUsageCollector } from './usage';

export class FilesPlugin implements Plugin<FilesSetup, FilesStart, FilesPluginSetupDependencies> {
  private readonly logger: Logger;
  private fileServiceFactory: undefined | FileServiceFactory;
  private securitySetup: FilesPluginSetupDependencies['security'];

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
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

    return {
      registerFileKind(fileKind) {
        getFileKindsRegistry().register(fileKind);
      },
    };
  }

  public start(coreStart: CoreStart): FilesStart {
    const { savedObjects } = coreStart;
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
