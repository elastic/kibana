/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AnalyticsServiceStart } from '@kbn/core-analytics-server';
import type { JsonValue } from '@kbn/utility-types';
import type { Readable, Transform } from 'stream';

export type BlobAttribute = [key: string, value: JsonValue];

export interface UploadOptions {
  /**
   * Optionally provide any transforms to run on the readable source stream
   * as it is being uploaded.
   */
  transforms?: Transform[];

  /**
   * The ID to use to derive blob IDs.
   *
   * If "mycoolid" is provided. The blob IDs will look like:
   * "mycoolid.0"
   * "mycoolid.1"
   * "mycoolid.2"
   *
   * And so on.
   */
  id?: string;

  /**
   * Optional analytics service client in order to report performance of upload.
   */
  analytics?: AnalyticsServiceStart;
}

/**
 * An interface that must be implemented by any blob storage adapter.
 *
 * @note
 * The blob storage target must be fully managed by Kibana through this interface
 * to avoid corrupting stored data.
 *
 * @note
 * File IDs are stored in Kibana Saved Objects as references to a file.
 *
 * @internal
 */
export interface BlobStorageClient {
  /**
   * Upload a new file.
   *
   * Generates a random file ID and returns it upon successfully uploading a
   * file. The file size can be used when downloading the file later.
   *
   * @param content - The readable stream to upload.
   * @param opts - Optional options to use when uploading the file.
   */
  upload(content: Readable, opts?: UploadOptions): Promise<{ id: string; size: number }>;

  /**
   * Download a file.
   *
   * Given an ID, and optional file size, retrieve the file contents as a readable
   * stream.
   *
   * @param args - Arguments to download a file
   */
  download(args: { id: string; size?: number }): Promise<Readable>;

  /**
   * Delete a file given a unique ID.
   *
   * @param id - The ID of the file to delete.
   */
  delete(id: string): Promise<void>;
}
