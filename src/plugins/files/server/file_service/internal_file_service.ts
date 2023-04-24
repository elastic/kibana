/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { AuditEvent, AuditLogger } from '@kbn/security-plugin/server';
import pLimit from 'p-limit';

import { BlobStorageService } from '../blob_storage_service';
import { InternalFileShareService } from '../file_share_service';
import { FileMetadata, File as IFile, FileKind, FileJSON, FilesMetrics } from '../../common';
import { File, toJSON } from '../file';
import { FileKindsRegistry } from '../../common/file_kinds_registry';
import { FileNotFoundError } from './errors';
import type { FileMetadataClient } from '../file_client';
import type {
  CreateFileArgs,
  UpdateFileArgs,
  DeleteFileArgs,
  BulkDeleteFilesArgs,
  FindFileArgs,
  GetByIdArgs,
} from './file_action_types';
import { createFileClient, FileClientImpl } from '../file_client/file_client';

const bulkDeleteConcurrency = pLimit(10);

/**
 * Service containing methods for working with files.
 *
 * All file business logic is encapsulated in the {@link File} class.
 *
 * @internal
 */
export class InternalFileService {
  constructor(
    private readonly metadataClient: FileMetadataClient,
    private readonly blobStorageService: BlobStorageService,
    private readonly fileShareService: InternalFileShareService,
    private readonly auditLogger: undefined | AuditLogger,
    private readonly fileKindRegistry: FileKindsRegistry,
    private readonly logger: Logger
  ) {}

  public async createFile(args: CreateFileArgs): Promise<IFile> {
    return this.createFileClient(args.fileKind).create({ metadata: { ...args } });
  }

  public writeAuditLog(event: AuditEvent) {
    if (this.auditLogger) {
      this.auditLogger.log(event);
    } else {
      // Otherwise just log to info
      this.logger.info(event.message);
    }
  }

  public async updateFile({ attributes, id }: UpdateFileArgs): Promise<IFile> {
    const file = await this.getById({ id });
    return await file.update(attributes);
  }

  public async deleteFile({ id }: DeleteFileArgs): Promise<void> {
    const file = await this.getById({ id });
    await file.delete();
  }

  public async bulkDeleteFiles({
    ids,
  }: BulkDeleteFilesArgs): Promise<Array<PromiseSettledResult<void>>> {
    const promises = ids.map((id) => bulkDeleteConcurrency(() => this.deleteFile({ id })));
    const result = await Promise.allSettled(promises);
    return result;
  }

  private async get(id: string) {
    try {
      const { metadata } = await this.metadataClient.get({ id });
      if (metadata.Status === 'DELETED') {
        throw new FileNotFoundError('File has been deleted');
      }
      return this.toFile(id, metadata, metadata.FileKind);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw new FileNotFoundError('File not found');
      }
      this.logger.error(`Could not retrieve file: ${e}`);
      throw e;
    }
  }

  public async getById({ id }: GetByIdArgs): Promise<IFile> {
    return await this.get(id);
  }

  public getFileKind(id: string): FileKind {
    return this.fileKindRegistry.get(id);
  }

  public async findFilesJSON(args: FindFileArgs): Promise<{ files: FileJSON[]; total: number }> {
    const { total, files } = await this.metadataClient.find(args);
    return {
      total,
      files: files.map(({ id, metadata }) => toJSON(id, metadata)),
    };
  }

  public async getUsageMetrics(): Promise<FilesMetrics> {
    return this.metadataClient.getUsageMetrics({
      esFixedSizeIndex: {
        capacity: this.blobStorageService.getStaticBlobStorageSettings().esFixedSizeIndex.capacity,
      },
    });
  }

  public async getByToken(token: string) {
    const { fileId } = await this.fileShareService.getByToken(token);
    return this.get(fileId);
  }

  private toFile(
    id: string,
    fileMetadata: FileMetadata,
    fileKind: string,
    fileClient?: FileClientImpl
  ): IFile {
    return new File(
      id,
      toJSON(id, fileMetadata),
      fileClient ?? this.createFileClient(fileKind),
      this.logger.get(`file-${id}`)
    );
  }

  private createFileClient(fileKindId: string) {
    const fileKind = this.fileKindRegistry.get(fileKindId);
    return createFileClient({
      auditLogger: this.auditLogger,
      blobStorageClient: this.blobStorageService.createBlobStorageClient(
        fileKind.blobStoreSettings
      ),
      fileKindDescriptor: fileKind,
      internalFileShareService: this.fileShareService,
      logger: this.logger,
      metadataClient: this.metadataClient,
    });
  }
}
