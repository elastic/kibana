/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { BaseFilesClient, Abortable, Pagination } from './base_file_client';

/* Status of a file.
 *
 * AWAITING_UPLOAD  - A file object has been created but does not have any contents.
 * UPLOADING        - File contents are being uploaded.
 * READY            - File contents have been uploaded and are ready for to be downloaded.
 * UPLOAD_ERROR     - An attempt was made to upload file contents but failed.
 * DELETED          - The file contents have been or are being deleted.
 */
export type FileStatus = 'AWAITING_UPLOAD' | 'UPLOADING' | 'READY' | 'UPLOAD_ERROR' | 'DELETED';

/**
 * Supported file compression algorithms
 */
export type FileCompression = 'br' | 'gzip' | 'deflate' | 'none';

/**
 * File metadata fields are defined per the ECS specification:
 *
 * https://www.elastic.co/guide/en/ecs/current/ecs-file.html
 *
 * Custom fields are named according to the custom field convention: "CustomFieldName".
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BaseFileMetadata = {
  /**
   * Name of the file
   *
   * @note This field is recommended since it will provide a better UX
   */
  name?: string;

  /**
   * MIME type of the file contents
   */
  mime_type?: string;

  /**
   * ISO string representing the file creation date
   */
  created?: string;
  /**
   * Size of the file
   */
  size?: number;
  /**
   * Hash of the file's contents
   */
  hash?: {
    /**
     * UTF-8 string representing MD5 hash
     */
    md5?: string;
    /**
     * UTF-8 string representing sha1 hash
     */
    sha1?: string;
    /**
     * UTF-8 string representing sha256 hash
     */
    sha256?: string;
    /**
     * UTF-8 string representing sha384 hash
     */
    sha384?: string;
    /**
     * UTF-8 string representing sha512 hash
     */
    sha512?: string;
    /**
     * UTF-8 string representing shadeep hash
     */
    ssdeep?: string;
    /**
     * UTF-8 string representing tlsh hash
     */
    tlsh?: string;
    [hashName: string]: string | undefined;
  };

  /**
   * Data about the user that created the file
   */
  user?: {
    /**
     * The human-friendly user name of the owner of the file
     *
     * @note this field cannot be used to uniquely ID a user. See {@link BaseFileMetadata['user']['id']}.
     */
    name?: string;
    /**
     * The unique ID of the user who created the file, taken from the user profile
     * ID.
     *
     * See https://www.elastic.co/guide/en/elasticsearch/reference/master/user-profile.html.
     */
    id?: string;
  };

  /**
   * The file extension, for example "jpg", "png", "svg" and so forth
   */
  extension?: string;

  /**
   * Alternate text that can be used used to describe the contents of the file
   * in human-friendly language
   */
  Alt?: string;

  /**
   * ISO string representing when the file was last updated
   */
  Updated?: string;

  /**
   * The file's current status
   */
  Status?: FileStatus;

  /**
   * The maximum number of bytes per file chunk
   */
  ChunkSize?: number;

  /**
   * Compression algorithm used to transform chunks before they were stored.
   */
  Compression?: FileCompression;
};

/**
 * Extra metadata on a file object specific to Kibana implementation.
 */
export type FileMetadata<Meta = unknown> = Required<
  Pick<BaseFileMetadata, 'created' | 'name' | 'Status' | 'Updated'>
> &
  BaseFileMetadata & {
    /**
     * Unique identifier of the kind of file. Kibana applications can register
     * these at runtime.
     */
    FileKind: string;

    /**
     * User-defined metadata.
     */
    Meta?: Meta;
  };

/**
 * Attributes of a file that represent a serialised version of the file.
 */
export interface FileJSON<Meta = unknown> {
  /**
   * Unique file ID.
   */
  id: string;
  /**
   * ISO string of when this file was created
   */
  created: FileMetadata['created'];
  /**
   * ISO string of when the file was updated
   */
  updated: FileMetadata['Updated'];
  /**
   * File name.
   *
   * @note Does not have to be unique.
   */
  name: FileMetadata['name'];
  /**
   * MIME type of the file's contents.
   */
  mimeType: FileMetadata['mime_type'];
  /**
   * The size, in bytes, of the file content.
   */
  size: FileMetadata['size'];
  /**
   * The file extension (dot suffix).
   *
   * @note this value can be derived from MIME type but is stored for search
   * convenience.
   */
  extension: FileMetadata['extension'];

  /**
   * A consumer defined set of attributes.
   *
   * Consumers of the file service can add their own tags and identifiers to
   * a file using the "meta" object.
   */
  meta: FileMetadata<Meta>['Meta'];
  /**
   * Use this text to describe the file contents for display and accessibility.
   */
  alt: FileMetadata['Alt'];
  /**
   * A unique kind that governs various aspects of the file. A consumer of the
   * files service must register a file kind and link their files to a specific
   * kind.
   *
   * @note This enables stricter access controls to CRUD and other functionality
   * exposed by the files service.
   */
  fileKind: FileMetadata['FileKind'];
  /**
   * The current status of the file.
   *
   * See {@link FileStatus} for more details.
   */
  status: FileMetadata['Status'];
  /**
   * User data associated with this file
   */
  user?: FileMetadata['user'];
}

/*
 * A descriptor of meta values associated with a set or "kind" of files.
 *
 * @note In order to use the file service consumers must register a {@link FileKind}
 * in the {@link FileKindsRegistry}.
 */
export interface FileKind {
  /**
   * Unique file kind ID
   */
  id: string;
  /**
   * Maximum size, in bytes, a file of this kind can be.
   *
   * @default 4MiB
   */
  maxSizeBytes?: number;

  /**
   * The MIME type of the file content.
   *
   * @default accept all mime types
   */
  allowedMimeTypes?: string[];

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
}

/**
 * Set of metadata captured for every image uploaded via the file services'
 * public components.
 */
export interface FileImageMetadata {
  /**
   * The blurhash that can be displayed while the image is loading
   */
  blurhash?: string;
  /**
   * Width, in px, of the original image
   */
  width: number;
  /**
   * Height, in px, of the original image
   */
  height: number;
}
