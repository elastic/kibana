/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { File, FileShareJSONWithToken, UpdatableFileMetadata } from '../../common/types';
import { CreateFileArgs } from '../file_service';
import { FileShareServiceStart } from '../file_share_service';
import { FileMetadataClient } from './file_metadata_client';

export type P1<F extends (...args: any[]) => any> = Parameters<F>[0];

export interface DeleteArgs {
  /** ID of the file to delete */
  id: string;
  /**
   * If `true`, the file will be deleted from the blob storage.
   *
   * @default true
   */
  hasContent?: boolean;
}

/**
 * Args to create a file
 */
export interface CreateArgs<Meta = unknown> {
  /**
   * Unique file ID
   */
  id?: string;
  /**
   * The file's metadata
   */
  metadata: Omit<CreateFileArgs<Meta>, 'fileKind'>;
}

/**
 * File share args
 */
export interface ShareArgs {
  /**
   * Name of the file share
   */
  name?: string;
  /**
   * Unix timestamp (in milliseconds) when the file share will expire
   */
  validUntil?: number;
  /**
   * The file to share
   */
  file: File;
}

/**
 * Wraps the {@link FileMetadataClient} and {@link BlobStorageClient} client
 * to provide basic file CRUD functionality.
 *
 * For now this is just a shallow type of the implementation for export purposes.
 */
export interface FileClient {
  /** See {@link FileMetadata.FileKind}.  */
  fileKind: string;

  /**
   * See {@link FileMetadataClient.create}.
   *
   * @param arg - Arg to create a file.
   * */
  create<M = unknown>(arg: CreateArgs<M>): Promise<File<M>>;

  /**
   * See {@link FileMetadataClient.get}
   *
   * @param arg - Argument to get a file
   */
  get<M = unknown>(arg: P1<FileMetadataClient['get']>): Promise<File<M>>;

  /**
   * {@link FileMetadataClient.update}
   *
   * @param id - File id
   * @param metadata - new file metadata
   */
  update<M = unknown>(id: string, metadata: UpdatableFileMetadata<M>): Promise<void>;

  /**
   * Delete a file.
   * @param arg - Argument to delete a file
   */
  delete(arg: DeleteArgs): Promise<void>;

  /**
   * See {@link FileMetadataClient.find}.
   *
   * @param arg - Argument to find files
   */
  find: (arg?: P1<FileMetadataClient['find']>) => Promise<{ files: File[]; total: number }>;

  /**
   * Create a file share instance for this file.
   *
   * @note this will only work for files that are share capable.
   *
   * @param args - Arguments to create a file share
   */
  share(args: ShareArgs): Promise<FileShareJSONWithToken>;
  /**
   * Create a file share instance for this file.
   *
   * @note this will only work for files that are share capable.
   *
   * @param args - Arguments to remove a file share
   */
  unshare: FileShareServiceStart['delete'];
  /**
   * Create a file share instance for this file.
   *
   * @note this will only work for files that are share capable.
   *
   * @param arg - Arguments to remove a file share
   */
  listShares: FileShareServiceStart['list'];
}
