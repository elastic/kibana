/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { Readable } from 'stream';
import mimeType from 'mime';
import cuid from 'cuid';
import { type Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

import type {
  File,
  FileJSON,
  FileKind,
  FileMetadata,
  FileShareJSONWithToken,
  UpdatableFileMetadata,
} from '../../common/types';
import type { FileMetadataClient } from './file_metadata_client';
import type {
  BlobStorageClient,
  UploadOptions as BlobUploadOptions,
} from '../blob_storage_service';
import { getCounters, Counters } from '../usage';
import { File as FileImpl } from '../file';
import { FileShareServiceStart, InternalFileShareService } from '../file_share_service';
import { enforceMaxByteSizeTransform } from './stream_transforms';
import { createAuditEvent } from '../audit_events';
import type { FileClient, CreateArgs, DeleteArgs, P1, ShareArgs } from './types';
import { serializeJSON, toJSON } from '../file/to_json';
import { createDefaultFileAttributes } from './utils';
import {
  PerfArgs,
  withReportPerformanceMetric,
  FILE_DOWNLOAD_PERFORMANCE_EVENT_NAME,
} from '../performance';

export type UploadOptions = Omit<BlobUploadOptions, 'id'>;

export function createFileClient({
  fileKindDescriptor,
  auditLogger,
  blobStorageClient,
  internalFileShareService,
  logger,
  metadataClient,
}: {
  fileKindDescriptor: FileKind;
  metadataClient: FileMetadataClient;
  blobStorageClient: BlobStorageClient;
  internalFileShareService: undefined | InternalFileShareService;
  auditLogger: undefined | AuditLogger;
  logger: Logger;
}) {
  return new FileClientImpl(
    fileKindDescriptor,
    metadataClient,
    blobStorageClient,
    internalFileShareService,
    auditLogger,
    logger
  );
}

export class FileClientImpl implements FileClient {
  /**
   * A usage counter instance that is shared across all FileClient instances.
   */
  private static usageCounter: undefined | UsageCounter;

  public static configureUsageCounter(uc: UsageCounter) {
    FileClientImpl.usageCounter = uc;
  }

  private readonly logAuditEvent: AuditLogger['log'];

  constructor(
    private fileKindDescriptor: FileKind,
    private readonly metadataClient: FileMetadataClient,
    private readonly blobStorageClient: BlobStorageClient,
    private readonly internalFileShareService: undefined | InternalFileShareService,
    auditLogger: undefined | AuditLogger,
    private readonly logger: Logger
  ) {
    this.logAuditEvent = (e) => {
      if (auditLogger) {
        auditLogger.log(e);
      } else if (e) {
        this.logger.info(JSON.stringify(e.event, null, 2));
      }
    };
  }

  private getCounters() {
    return getCounters(this.fileKind);
  }

  private incrementUsageCounter(counter: Counters) {
    FileClientImpl.usageCounter?.incrementCounter({ counterName: this.getCounters()[counter] });
  }

  private instantiateFile<M = unknown>(id: string, metadata: FileMetadata<M>): File<M> {
    return new FileImpl(
      id,
      toJSON(id, {
        ...createDefaultFileAttributes(),
        ...metadata,
      }),
      this,
      this.logger
    );
  }

  public get fileKind(): string {
    return this.fileKindDescriptor.id;
  }

  public async create<M = unknown>({ id, metadata }: CreateArgs): Promise<File<M>> {
    const serializedMetadata = serializeJSON({ ...metadata, mimeType: metadata.mime });
    const result = await this.metadataClient.create({
      id: id || cuid(),
      metadata: {
        ...createDefaultFileAttributes(),
        ...serializedMetadata,
        name: serializedMetadata.name!,
        extension:
          (serializedMetadata.mime_type && mimeType.getExtension(serializedMetadata.mime_type)) ??
          undefined,
        FileKind: this.fileKind,
      },
    });
    this.logAuditEvent(
      createAuditEvent({
        action: 'create',
        message: `Created file "${result.metadata.name}" of kind "${this.fileKind}" and id "${result.id}"`,
      })
    );
    return this.instantiateFile(result.id, {
      ...result.metadata,
      FileKind: this.fileKind,
    }) as File<M>;
  }

  public async get<M = unknown>(arg: P1<FileMetadataClient['get']>): Promise<File<M>> {
    const { id, metadata } = await this.metadataClient.get(arg);
    return this.instantiateFile(id, metadata as FileMetadata<M>);
  }

  public async internalUpdate(id: string, metadata: Partial<FileJSON>): Promise<void> {
    await this.metadataClient.update({ id, metadata: serializeJSON(metadata) });
  }

  public async update<M = unknown>(id: string, metadata: UpdatableFileMetadata<M>): Promise<void> {
    const { alt, meta, name } = metadata;
    const payload = { name, alt, meta, updated: moment().toISOString() };
    await this.internalUpdate(id, payload);
  }

  public async find<M = unknown>(
    arg: P1<FileMetadataClient['find']>
  ): Promise<{ files: File[]; total: number }> {
    const result = await this.metadataClient.find(arg);
    return {
      total: result.total,
      files: result.files.map(({ id, metadata }) =>
        this.instantiateFile(id, metadata as FileMetadata<M>)
      ),
    };
  }

  public async delete({ id, hasContent = true }: DeleteArgs) {
    this.incrementUsageCounter('DELETE');
    try {
      if (this.internalFileShareService) {
        // Stop sharing this file
        await this.internalFileShareService.deleteForFile({ id });
      }
      if (hasContent) await this.blobStorageClient.delete(id);
      await this.metadataClient.delete({ id });
      this.logAuditEvent(
        createAuditEvent({
          action: 'delete',
          outcome: 'success',
          message: `Deleted file with "${id}"`,
        })
      );
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        this.incrementUsageCounter('DELETE_ERROR_NOT_FOUND');
      } else {
        this.incrementUsageCounter('DELETE_ERROR');
      }
      throw e;
    }
  }

  public deleteContent: BlobStorageClient['delete'] = (arg) => {
    return this.blobStorageClient.delete(arg);
  };

  /**
   * Upload a blob
   * @param id - The ID of the file content is associated with
   * @param rs - The readable stream of the file content
   * @param options - Options for the upload
   */
  public upload = async (
    id: string,
    rs: Readable,
    options?: UploadOptions
  ): ReturnType<BlobStorageClient['upload']> => {
    return this.blobStorageClient.upload(rs, {
      ...options,
      transforms: [
        ...(options?.transforms || []),
        enforceMaxByteSizeTransform(this.fileKindDescriptor.maxSizeBytes ?? Infinity),
      ],
      id,
    });
  };

  public download: BlobStorageClient['download'] = async (args) => {
    this.incrementUsageCounter('DOWNLOAD');
    try {
      const perf: PerfArgs = {
        eventData: {
          eventName: FILE_DOWNLOAD_PERFORMANCE_EVENT_NAME,
          key1: 'size',
          value1: args.size,
          meta: {
            id: args.id,
          },
        },
      };

      return withReportPerformanceMetric(perf, () => this.blobStorageClient.download(args));
    } catch (e) {
      this.incrementUsageCounter('DOWNLOAD_ERROR');
      throw e;
    }
  };

  async share({ file, name, validUntil }: ShareArgs): Promise<FileShareJSONWithToken> {
    if (!this.internalFileShareService) {
      throw new Error('#share not implemented');
    }
    const shareObject = await this.internalFileShareService.share({
      file,
      name,
      validUntil,
    });
    this.logAuditEvent(
      createAuditEvent({
        action: 'create',
        message: `Shared file "${file.data.name}" with id "${file.data.id}"`,
      })
    );
    return shareObject;
  }

  unshare: FileShareServiceStart['delete'] = async (arg) => {
    if (!this.internalFileShareService) {
      throw new Error('#delete shares is not implemented');
    }
    const result = await this.internalFileShareService.delete(arg);

    this.logAuditEvent(
      createAuditEvent({
        action: 'delete',
        message: `Removed share with id "${arg.id}"`,
      })
    );

    return result;
  };

  listShares: FileShareServiceStart['list'] = (args) => {
    if (!this.internalFileShareService) {
      throw new Error('#list shares not implemented');
    }
    return this.internalFileShareService.list(args);
  };
}
