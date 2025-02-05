/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIXED_SIZE_INDEX_BLOB_STORE } from '../../../common/constants';
import type { FileMetadata, FilesMetrics, Pagination } from '../../../common/types';
import type { FindFileArgs } from '../../file_service/file_action_types';

/**
 * Args to get usage metrics
 */
export interface GetUsageMetricsArgs {
  /**
   * The ES backed fixed size storage
   */
  [ES_FIXED_SIZE_INDEX_BLOB_STORE]: {
    /**
     * Use this number to calculate free space when calculating metrics
     */
    capacity: number;
  };
}

/**
 * Meta description of a file.
 */
export interface FileDescriptor<M = unknown> {
  /**
   * Unique ID of a file, used to locate a file.
   */
  id: string;
  /**
   * The file's metadata.
   */
  metadata: FileMetadata<M>;
}

/**
 * Update a file args
 */
export interface UpdateArgs<M = unknown> {
  /**
   * A unique file ID.
   */
  id: string;
  /**
   * The file's metadata.
   */
  metadata: Partial<FileMetadata<M>>;
}

/**
 * Get a file
 */
export interface GetArg {
  /**
   * Unique ID of file metadata
   */
  id: string;
}

/**
 * Bulk get files
 */
export interface BulkGetArg {
  /**
   * Unique IDs of file metadata
   */
  ids: string[];
  /**
   * Flag to indicate if an Error is thrown if any of the file id is not found. If set to `false`, "null" will be returned.
   * @default true
   */
  throwIfNotFound?: boolean;
}

export interface DeleteArg {
  /**
   * Unique ID of file metadata to delete
   *
   * @note Deleting file metadata should only be done once all other related
   * file objects have been deleted
   */
  id: string;
}

export interface FindArg extends Pagination {
  /**
   * The file kind to scope this query to
   */
  fileKind?: string;
}

/**
 * An abstraction of storage implementation of file object's (i.e., metadata)
 */
export interface FileMetadataClient {
  /**
   * Create an instance of file metadata
   *
   * @param arg - Provide an ID and metadata
   */
  create(arg: FileDescriptor): Promise<FileDescriptor>;

  /**
   * Get file metadata
   *
   * @param arg - Arguments to retrieve file metadata
   */
  get(arg: GetArg): Promise<FileDescriptor>;

  /**
   * Bulk get file metadata
   *
   * @param arg - Arguments to bulk retrieve file metadata
   */
  bulkGet(arg: { ids: string[]; throwIfNotFound?: true }): Promise<FileDescriptor[]>;
  bulkGet(
    arg: BulkGetArg | { ids: string[]; throwIfNotFound: false }
  ): Promise<Array<FileDescriptor | null>>;

  /**
   * The file metadata to update
   *
   * @param arg - Arguments to update file metadata
   */
  update(arg: UpdateArgs): Promise<FileDescriptor>;
  /**
   * Delete an instance of file metadata
   *
   * @param arg - Arguments to delete file metadata
   */
  delete(arg: DeleteArg): Promise<void>;
  /**
   * Search for a set of file kind instances that match the filters.
   *
   * @param arg - Filters and other settings to match against
   */
  find(arg?: FindFileArgs): Promise<{ total: number; files: FileDescriptor[] }>;
  /**
   * Prepare a set of metrics based on the file metadata.
   *
   * @param arg - Argument to get usage metrics
   */
  getUsageMetrics(arg: GetUsageMetricsArgs): Promise<FilesMetrics>;
}
