/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
  Logger,
  KibanaRequest,
} from '@kbn/core/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';

import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { File, FileJSON, FileMetadata } from '../../common';
import { fileObjectType, fileShareObjectType, hiddenTypes } from '../saved_objects';
import { BlobStorageService } from '../blob_storage_service';
import { FileClientImpl } from '../file_client/file_client';
import { InternalFileShareService } from '../file_share_service';
import { CreateFileArgs, FindFileArgs, GetByIdArgs, UpdateFileArgs } from './file_action_types';
import { InternalFileService } from './internal_file_service';
import { FileServiceStart } from './file_service';
import { FileKindsRegistry } from '../../common/file_kinds_registry';
import { SavedObjectsFileMetadataClient } from '../file_client';

/**
 * A simple interface for getting an instance of {@link FileServiceStart}
 */
export interface FileServiceFactory {
  /**
   * Get a file service instance that is scoped to the current user request.
   *
   * @param req - the Kibana request to scope the service to
   */
  asScoped(req: KibanaRequest): FileServiceStart;

  /**
   * Get a file service instance that is scoped to the internal user.
   *
   * @note
   * Do not use this to drive interactions with files that are initiated by a
   * user.
   */
  asInternal(): FileServiceStart;
}

/**
 * Factory for creating {@link FileServiceStart} instances.
 */
export class FileServiceFactoryImpl implements FileServiceFactory {
  constructor(
    private readonly savedObjectsService: SavedObjectsServiceStart,
    private readonly blobStorageService: BlobStorageService,
    private readonly security: undefined | SecurityPluginSetup,
    private readonly fileKindRegistry: FileKindsRegistry,
    private readonly logger: Logger
  ) {}

  private createFileService(req?: KibanaRequest): FileServiceStart {
    const soClient = req
      ? this.savedObjectsService.getScopedClient(req, {
          includedHiddenTypes: hiddenTypes,
        })
      : this.savedObjectsService.createInternalRepository(hiddenTypes);

    const auditLogger = req
      ? this.security?.audit.asScoped(req)
      : this.security?.audit.withoutRequest;

    const internalFileShareService = new InternalFileShareService(soClient);
    const soMetadataClient = new SavedObjectsFileMetadataClient(
      fileObjectType.name,
      soClient,
      this.logger.get('so-metadata-client')
    );

    const internalFileService = new InternalFileService(
      soMetadataClient,
      this.blobStorageService,
      internalFileShareService,
      auditLogger,
      this.fileKindRegistry,
      this.logger
    );

    return {
      async create<M>(args: CreateFileArgs<M>) {
        return internalFileService.createFile(args) as Promise<File<M>>;
      },
      async update<M>(args: UpdateFileArgs) {
        await internalFileService.updateFile(args);
      },
      async delete(args) {
        return await internalFileService.deleteFile(args);
      },
      async bulkDelete(args) {
        return await internalFileService.bulkDeleteFiles(args);
      },
      async getById<M>(args: GetByIdArgs) {
        return internalFileService.getById(args) as Promise<File<M>>;
      },
      async find<M>(args: FindFileArgs) {
        return internalFileService.findFilesJSON(args) as Promise<{
          files: Array<FileJSON<M>>;
          total: number;
        }>;
      },
      async getUsageMetrics() {
        return internalFileService.getUsageMetrics();
      },
      async getByToken<M>(token: string) {
        return internalFileService.getByToken(token) as Promise<File<M>>;
      },
      getShareObject: internalFileShareService.get.bind(internalFileShareService),
      updateShareObject: internalFileShareService.update.bind(internalFileShareService),
      deleteShareObject: internalFileShareService.delete.bind(internalFileShareService),
      listShareObjects: internalFileShareService.list.bind(internalFileShareService),
    };
  }

  public asScoped(req: KibanaRequest): FileServiceStart {
    return this.createFileService(req);
  }

  public asInternal(): FileServiceStart {
    return this.createFileService();
  }

  /**
   * This function can only called during Kibana's setup phase
   */
  public static setup(
    savedObjectsSetup: SavedObjectsServiceSetup,
    usageCounter?: UsageCounter
  ): void {
    savedObjectsSetup.registerType<FileMetadata<{}>>(fileObjectType);
    savedObjectsSetup.registerType(fileShareObjectType);
    if (usageCounter) {
      FileClientImpl.configureUsageCounter(usageCounter);
      InternalFileShareService.configureUsageCounter(usageCounter);
    }
  }
}
