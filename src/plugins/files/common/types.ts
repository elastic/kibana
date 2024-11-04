/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject } from '@kbn/core/server';
import type { Observable } from 'rxjs';
import type { Readable } from 'stream';
import type {
  FileJSON,
  FileStatus,
  FileMetadata,
  FileShare,
  FileShareJSON,
  FileKindBase,
  FileShareJSONWithToken,
} from '@kbn/shared-ux-file-types';
import type { UploadOptions } from '../server/blob_storage_service';
import type { ES_FIXED_SIZE_INDEX_BLOB_STORE } from './constants';
import type { SupportedFileHashAlgorithm } from '../server/saved_objects/file';

export type {
  FileKindBase,
  FileKindBrowser,
  FileJSON,
  FileStatus,
  FileMetadata,
  BaseFilesClient,
  FileCompression,
  BaseFileMetadata,
  FileImageMetadata,
} from '@kbn/shared-ux-file-types';

/*
 * A descriptor of meta values associated with a set or "kind" of files.
 *
 * @note In order to use the file service consumers must register a {@link FileKind}
 * in the {@link FileKindsRegistry}.
 */
export interface FileKind extends FileKindBase {
  /**
   * Max file contents size, in bytes. Can be customized per file using the
   * {@link FileJSON} object. This is enforced on the server-side as well as
   * in the upload React component.
   *
   * @default 4MiB
   */
  maxSizeBytes?: number | ((file: FileJSON) => number);

  /**
   * Blob store specific settings that enable configuration of storage
   * details.
   */
  blobStoreSettings?: BlobStorageSettings;

  /**
   * Specify which HTTP routes to create for the file kind.
   *
   * You can always create your own HTTP routes for working with files but
   * this interface allows you to expose basic CRUD operations, upload, download
   * and sharing of files over a RESTful-like interface.
   *
   * @note The public {@link FileClient} uses these endpoints.
   */
  http: {
    /**
     * Expose file creation (and upload) over HTTP.
     */
    create?: HttpEndpointDefinition;
    /**
     * Expose file updates over HTTP.
     */
    update?: HttpEndpointDefinition;
    /**
     * Expose file deletion over HTTP.
     */
    delete?: HttpEndpointDefinition;
    /**
     * Expose "get by ID" functionality over HTTP.
     */
    getById?: HttpEndpointDefinition;
    /**
     * Expose the ability to list all files of this kind over HTTP.
     */
    list?: HttpEndpointDefinition;
    /**
     * Expose the ability to download a file's contents over HTTP.
     */
    download?: HttpEndpointDefinition;
    /**
     * Expose file share functionality over HTTP.
     */
    share?: HttpEndpointDefinition;
  };

  /**
   * A list of hashes to compute for this file kind. The hashes will be computed
   * during the file upload process and stored in the file metadata.
   */
  hashes?: SupportedFileHashAlgorithm[];
}

/** Definition for an endpoint that the File's service will generate */
interface HttpEndpointDefinition {
  /**
   * Specify the tags for this endpoint.
   *
   * @example
   * // This will enable access control to this endpoint for users that can access "myApp" only.
   * { tags: ['access:myApp'] }
   *
   */
  tags: string[];
}

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

export type { FileShare, FileShareJSON, FileShareJSONWithToken };

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
   * Update a file object's metadata that can be updated.
   *
   * @param attr - The of attributes to update.
   */
  update(attr: Partial<UpdatableFileMetadata<Meta>>): Promise<File<Meta>>;

  /**
   * Stream file content to storage.
   *
   * @param content - The content to stream to storage.
   * @param abort$ - An observable that can be used to abort the upload at any time.
   * @param options - additional options.
   */
  uploadContent(
    content: Readable,
    abort$?: Observable<unknown>,
    options?: Partial<Pick<UploadOptions, 'transforms'>>
  ): Promise<File<Meta>>;

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
