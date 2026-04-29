/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FileShareJSON, FileShareJSONWithToken } from './sharing';
import type { FileJSON, FileKindBase } from '.';

export interface Pagination {
  page?: number;
  perPage?: number;
}

export interface Abortable {
  abortSignal?: AbortSignal;
}

export interface BaseFilesClient<M = unknown> {
  /**
   * Find a set of files given some filters.
   *
   * @param args - File filters
   */
  find: (
    args: {
      kind?: string | string[];
      kindToExclude?: string | string[];
      status?: string | string[];
      extension?: string | string[];
      mimeType?: string | string[];
      name?: string | string[];
      meta?: M;
    } & Pagination &
      Abortable
  ) => Promise<{ files: Array<FileJSON<unknown>>; total: number }>;
  /**
   * Bulk a delete a set of files given their IDs.
   *
   * @param args - Bulk delete args
   */
  bulkDelete: (
    args: { ids: string[] } & Abortable
  ) => Promise<{ succeeded: string[]; failed?: Array<[id: string, reason: string]> }>;
  /**
   * Create a new file object with the provided metadata.
   *
   * @param args - create file args
   */
  create: (
    args: { name: string; meta?: M; alt?: string; mimeType?: string; kind: string } & Abortable
  ) => Promise<{ file: FileJSON<M> }>;
  /**
   * Delete a file object and all associated share and content objects.
   *
   * @param args - delete file args
   */
  delete: (args: { id: string; kind: string } & Abortable) => Promise<{ ok: true }>;
  /**
   * Get a file object by ID.
   *
   * @param args - get file by ID args
   */
  getById: (args: { id: string; kind: string } & Abortable) => Promise<{ file: FileJSON<M> }>;
  /**
   * List all file objects, of a given {@link FileKindBrowser}.
   *
   * @param args - list files args
   */
  list: (
    args: {
      kind: string;
      status?: string | string[];
      extension?: string | string[];
      mimeType?: string | string[];
      name?: string | string[];
      meta?: M;
    } & Pagination &
      Abortable
  ) => Promise<{ files: Array<FileJSON<M>>; total: number }>;
  /**
   * Update a set of of metadata values of the file object.
   *
   * @param args - update file args
   */
  update: (
    args: { id: string; kind: string; name?: string; meta?: M; alt?: string } & Abortable
  ) => Promise<{ file: FileJSON<M> }>;
  /**
   * Stream the contents of the file to Kibana server for storage.
   *
   * @param args - upload file args
   */
  upload: (
    args: {
      id: string;
      /**
       * Should be blob or ReadableStream of some kind.
       */
      body: unknown;
      kind: string;
      abortSignal?: AbortSignal;
      contentType?: string;
      selfDestructOnAbort?: boolean;
    } & Abortable
  ) => Promise<{
    ok: true;
    size: number;
  }>;
  /**
   * Stream a download of the file object's content.
   *
   * @param args - download file args
   */
  download: (args: { fileName?: string; id: string; kind: string } & Abortable) => Promise<any>;
  /**
   * Get a string for downloading a file that can be passed to a button element's
   * href for download.
   *
   * @param args - get download URL args
   */
  getDownloadHref: (args: Pick<FileJSON<unknown>, 'id' | 'fileKind'>) => string;
  /**
   * Share a file by creating a new file share instance.
   *
   * @note This returns the secret token that can be used
   * to access a file via the public download enpoint.
   *
   * @param args - File share arguments
   */
  share: (
    args: { name?: string; validUntil?: number; fileId: string; kind: string } & Abortable
  ) => Promise<FileShareJSONWithToken>;
  /**
   * Delete a file share instance.
   *
   * @param args - File unshare arguments
   */
  unshare: (args: { id: string; kind: string } & Abortable) => Promise<{ ok: true }>;
  /**
   * Get a file share instance.
   *
   * @param args - Get file share arguments
   */
  getShare: (args: { id: string; kind: string } & Abortable) => Promise<{ share: FileShareJSON }>;
  /**
   * List all file shares. Optionally scoping to a specific
   * file.
   *
   * @param args - Get file share arguments
   */
  listShares: (
    args: { forFileId?: string; kind: string } & Pagination & Abortable
  ) => Promise<{ shares: FileShareJSON[] }>;
  /**
   * Get a file kind
   * @param id The id of the file kind
   */
  getFileKind: (id: string) => FileKindBase;
}
