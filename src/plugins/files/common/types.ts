/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '@kbn/core/server';
import type { Observable } from 'rxjs';
import type { Readable } from 'stream';
import type { FileJSON, FileStatus, FileMetadata } from '@kbn/shared-ux-file-types';
import type { ES_FIXED_SIZE_INDEX_BLOB_STORE } from './constants';

export type {
  FileKind,
  FileJSON,
  FileStatus,
  FileMetadata,
  BaseFilesClient,
  FileCompression,
  BaseFileMetadata,
  FileImageMetadata,
} from '@kbn/shared-ux-file-types';

/**
 * Values for paginating through results.
 */
export interface Pagination {
  /**
   * Page of results.
   */
  page?: number;
  /**
   * Number of results per page.
   */
  perPage?: number;
}

/**
 * An {@link SavedObject} containing a file object (i.e., metadata only).
 */
export type FileSavedObject<Meta = unknown> = SavedObject<FileMetadata<Meta>>;

/**
 * The set of file metadata that can be updated.
 */
export type UpdatableFileMetadata<Meta = unknown> = Pick<FileJSON<Meta>, 'meta' | 'alt' | 'name'>;

/**
 * Data stored with a file share object
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FileShare = {
  /**
   * ISO timestamp of when the file share was created.
   */
  created: string;

  /**
   * Secret token used to access the associated file.
   */
  token: string;

  /**
   * Human friendly name for this share token.
   */
  name?: string;

  /**
   * The unix timestamp (in milliseconds) this file share will expire.
   *
   * TODO: in future we could add a special value like "forever", but this should
   * not be the default.
   */
  valid_until: number;
};

/**
 * Attributes of a file that represent a serialised version of the file.
 */
export interface FileShareJSON {
  /**
   * Unique ID share instance
   */
  id: string;
  /**
   * ISO timestamp the share was created
   */
  created: FileShare['created'];
  /**
   * Unix timestamp (in milliseconds) of when this share expires
   */
  validUntil: FileShare['valid_until'];
  /**
   * A user-friendly name for the file share
   */
  name?: FileShare['name'];
  /**
   * The ID of the file this share is linked to
   */
  fileId: string;
}

/**
 * A version of the file share with a token included.
 *
 * @note This should only be shown when the file share is first created
 */
export type FileShareJSONWithToken = FileShareJSON & {
  /**
   * Secret token that can be used to access files
   */
  token: string;
};

/**
 * Set of attributes that can be updated in a file share.
 */
export type UpdatableFileShareMetadata = Pick<FileShare, 'name'>;

/**
 * Arguments to pass to share a file
 */
export interface FileShareOptions {
  /**
   * Optional name for the file share, should be human-friendly.
   */
  name?: string;
  /**
   * Unix timestamp (in milliseconds) when the file share will expire.
   *
   * @note default is 30 days
   */
  validUntil?: number;
}
/**
 * Arguments for unsharing a file
 */
export interface FileUnshareOptions {
  /**
   * Specify the share instance to remove
   */
  shareId: string;
}

/**
 * A class with set of properties and behaviors of the "smart" file object and adds
 * behaviours for interacting with files on top of the pure data.
 */
export interface File<Meta = unknown> {
  /**
   * The file ID
   */
  id: string;

  /**
   * File metadata in camelCase form.
   */
  data: FileJSON<Meta>;
  /**
   * Update a file object's metadatathat can be updated.
   *
   * @param attr - The of attributes to update.
   */
  update(attr: Partial<UpdatableFileMetadata<Meta>>): Promise<File<Meta>>;

  /**
   * Stream file content to storage.
   *
   * @param content - The content to stream to storage.
   * @param abort$ - An observable that can be used to abort the upload at any time.
   */
  uploadContent(content: Readable, abort$?: Observable<unknown>): Promise<File<Meta>>;

  /**
   * Stream file content from storage.
   */
  downloadContent(): Promise<Readable>;

  /**
   * Delete a file.
   *
   * @note This will delete the file metadata, contents and any other objects
   * related to the file owned by files.
   */
  delete(): Promise<void>;

  /**
   * Generate a secure token that can be used to access a file's content.
   *
   * @note This makes a file available for public download. Any agent with the
   * token will bypass normal authz and authn checks.
   *
   * @param opts - Share file options.
   */
  share(opts?: FileShareOptions): Promise<FileShareJSONWithToken>;

  /**
   * List all current {@link FileShareJSON} objects that have been created for
   * a file.
   */
  listShares(): Promise<FileShareJSON[]>;

  /**
   * Remove a {@link FileShareJSON} object therefore ceasing to share a file's
   * content.
   *
   * @param opts - Unshare file options
   */
  unshare(opts: FileUnshareOptions): Promise<void>;

  /**
   * Get a JSON representation of the file. Convenient for serialisation.
   */
  toJSON(): FileJSON<Meta>;
}

/**
 * Defines all the settings for supported blob stores.
 *
 * Key names map to unique blob store implementations and so must not be changed
 * without a migration
 */
export interface BlobStorageSettings {
  /**
   * Single index that supports up to 50GB of blobs
   */
  [ES_FIXED_SIZE_INDEX_BLOB_STORE]?: {
    index: string;
  };
  // Other blob store settings will go here once available
}

/**
 * A collection of generally useful metrics about files.
 */
export interface FilesMetrics {
  /**
   * Metrics about all storage media.
   */
  storage: {
    /**
     * The ES fixed size blob store.
     */
    [ES_FIXED_SIZE_INDEX_BLOB_STORE]: {
      /**
       * The total size in bytes that can be used in this storage medium
       */
      capacity: number;
      /**
       * Bytes currently used
       */
      used: number;
      /**
       * Bytes currently available
       */
      available: number;
    };
  };
  /**
   * A count of all files grouped by status
   */
  countByStatus: Record<FileStatus, number>;
  /**
   * A count of all files grouped by extension
   */
  countByExtension: Record<string, number>;
}
