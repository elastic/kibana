/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FileMetadata, Pagination, UpdatableFileMetadata } from '../../common/types';

/**
 * Arguments to create a new file.
 */
export interface CreateFileArgs<Meta = unknown> {
  /**
   * File name
   */
  name: string;
  /**
   * File kind, must correspond to a registered {@link FileKind}.
   */
  fileKind: string;
  /**
   * Alternate text for accessibility and display purposes.
   */
  alt?: string;
  /**
   * Custom metadata like tags or identifiers for the file.
   */
  meta?: Meta;
  /**
   * The MIME type of the file.
   */
  mime?: string;
  /**
   * User data associated with this file
   */
  user?: FileMetadata['user'];
}

/**
 * Arguments to update a file
 */
export interface UpdateFileArgs {
  /**
   * File ID.
   */
  id: string;
  /**
   * Attributes to update.
   */
  attributes: UpdatableFileMetadata;
}

/**
 * Arguments to delete a file.
 */
export interface DeleteFileArgs {
  /**
   * File ID.
   */
  id: string;
}

/**
 * Arguments to delete files in a bulk request.
 */
export interface BulkDeleteFilesArgs {
  /**
   * File IDs.
   */
  ids: string[];
}

/**
 * Arguments to get a file by ID.
 */
export interface GetByIdArgs {
  /**
   * File ID.
   */
  id: string;
}

/**
 * Arguments to filter for files.
 *
 * @note Individual values in a filter are "OR"ed together filters are "AND"ed together.
 */
export interface FindFileArgs extends Pagination {
  /**
   * File kind(s), see {@link FileKind}.
   */
  kind?: string[];
  /**
   * File kind(s) to exclude from search, see {@link FileKind}.
   */
  kindToExclude?: string[];
  /**
   * File name(s).
   */
  name?: string[];
  /**
   * File extension(s).
   */
  extension?: string[];
  /**
   * File mime type(s).
   */
  mimeType?: string[];
  /**
   * File status(es).
   */
  status?: string[];
  /**
   * ID of user who created the file.
   */
  user?: string[];
  /**
   * File metadata values. These values are governed by the consumer.
   */
  meta?: Record<string, string | string[]>;
}
