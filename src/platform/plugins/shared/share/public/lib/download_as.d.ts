/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type DownloadableContent =
  | {
      content: string;
      type: string;
    }
  | Blob;
/**
 * Convenient method to use for a single file download
 * **Note**: for multiple files use the downloadMultipleAs method, do not iterate with this method here
 * @param filename full name of the file
 * @param payload either a Blob content, or a Record with a stringified content and type
 *
 * @returns a Promise that resolves when the download has been correctly started
 */
export declare function downloadFileAs(
  filename: string,
  payload: DownloadableContent
): Promise<void>;
/**
 * Multiple files download method
 * @param files a Record containing one entry per file: the key entry should be the filename
 * and the value either a Blob content, or a Record with a stringified content and type
 *
 * @returns a Promise that resolves when all the downloads have been correctly started
 */
export declare function downloadMultipleAs(
  files: Record<string, DownloadableContent>
): Promise<void>;
