/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '@kbn/core/server';
import { Readable } from 'stream';
import {
  map,
  from,
  race,
  defer,
  NEVER,
  mergeMap,
  catchError,
  Observable,
  lastValueFrom,
} from 'rxjs';
import type { FileShareJSON, FileShareJSONWithToken } from '../../common/types';
import type { File as IFile, UpdatableFileMetadata, FileJSON } from '../../common';
import { fileAttributesReducer, Action } from './file_attributes_reducer';
import type { FileClientImpl } from '../file_client/file_client';
import {
  AbortedUploadError,
  AlreadyDeletedError,
  UploadInProgressError,
  NoDownloadAvailableError,
  ContentAlreadyUploadedError,
} from './errors';

/**
 * Scopes file actions to an ID and set of attributes.
 *
 * Also exposes the upload and download functionality.
 */
export class File<M = unknown> implements IFile {
  constructor(
    public readonly id: string,
    private metadata: FileJSON<M>,
    private readonly fileClient: FileClientImpl,
    private readonly logger: Logger
  ) {}

  private async updateFileState(action: Action): Promise<void> {
    const metadata = fileAttributesReducer(this.data, action);
    await this.fileClient.internalUpdate(this.id, metadata);
    this.data = metadata as FileJSON<M>;
  }

  private isReady(): boolean {
    return this.data.status === 'READY';
  }

  private isDeleted(): boolean {
    return this.data.status === 'DELETED';
  }

  private uploadInProgress(): boolean {
    return this.data.status === 'UPLOADING';
  }

  public async update(attrs: Partial<UpdatableFileMetadata>): Promise<IFile<M>> {
    await this.updateFileState({
      action: 'updateFile',
      payload: attrs,
    });
    return this;
  }

  private upload(content: Readable): Observable<{ size: number }> {
    return defer(() => this.fileClient.upload(this.id, content));
  }

  public async uploadContent(
    content: Readable,
    abort$: Observable<unknown> = NEVER
  ): Promise<IFile<M>> {
    if (this.uploadInProgress()) {
      throw new UploadInProgressError('Upload already in progress.');
    }
    if (this.isReady()) {
      throw new ContentAlreadyUploadedError('Already uploaded file content.');
    }
    this.logger.debug(`Uploading file [id = ${this.id}][name = ${this.data.name}].`);

    await lastValueFrom(
      from(this.updateFileState({ action: 'uploading' })).pipe(
        mergeMap(() =>
          race(
            this.upload(content),
            abort$.pipe(
              map(() => {
                throw new AbortedUploadError(`Aborted upload of ${this.id}!`);
              })
            )
          )
        ),
        mergeMap(({ size }) => {
          return this.updateFileState({ action: 'uploaded', payload: { size } });
        }),
        catchError(async (e) => {
          try {
            await this.updateFileState({ action: 'uploadError' });
          } catch (updateError) {
            this.logger.error(
              `Could not update file ${this.id} after upload error (${e.message}). Update failed with: ${updateError.message}. This file may be in an inconsistent state.`
            );
          }
          this.fileClient.deleteContent(this.id).catch(() => {});
          throw e;
        })
      )
    );

    return this;
  }

  public downloadContent(): Promise<Readable> {
    const { size } = this.data;
    if (!this.isReady()) {
      throw new NoDownloadAvailableError('This file content is not available for download.');
    }
    // We pass through this file ID to retrieve blob content.
    return this.fileClient.download({ id: this.id, size });
  }

  public async delete(): Promise<void> {
    if (this.uploadInProgress()) {
      throw new UploadInProgressError('Cannot delete file while upload in progress');
    }
    if (this.isDeleted()) {
      throw new AlreadyDeletedError('File has already been deleted');
    }
    await this.updateFileState({
      action: 'delete',
    });
    await this.fileClient.delete({ id: this.id, hasContent: this.isReady() });
  }

  public async share({
    name,
    validUntil,
  }: {
    name: string;
    validUntil?: number;
  }): Promise<FileShareJSONWithToken> {
    return this.fileClient.share({ name, validUntil, file: this });
  }

  async listShares(): Promise<FileShareJSON[]> {
    const { shares } = await this.fileClient.listShares({
      fileId: this.id,
    });
    return shares;
  }

  async unshare(opts: { shareId: string }): Promise<void> {
    await this.fileClient.unshare({ id: opts.shareId });
  }

  public toJSON(): FileJSON<M> {
    return this.data;
  }

  public get data(): FileJSON<M> {
    return this.metadata;
  }
  private set data(v: FileJSON<M>) {
    this.metadata = v;
  }
}
