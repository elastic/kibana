/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// @ts-ignore
import { saveAs } from '@elastic/filesaver';
import pMap from 'p-map';

export type DownloadableContent = { content: string; type: string } | Blob;

/**
 * Convenient method to use for a single file download
 * **Note**: for multiple files use the downloadMultipleAs method, do not iterate with this method here
 * @param filename full name of the file
 * @param payload either a Blob content, or a Record with a stringified content and type
 *
 * @returns a Promise that resolves when the download has been correctly started
 */
export function downloadFileAs(filename: string, payload: DownloadableContent) {
  return downloadMultipleAs({ [filename]: payload });
}

/**
 * Multiple files download method
 * @param files a Record containing one entry per file: the key entry should be the filename
 * and the value either a Blob content, or a Record with a stringified content and type
 *
 * @returns a Promise that resolves when all the downloads have been correctly started
 */
export async function downloadMultipleAs(files: Record<string, DownloadableContent>) {
  const filenames = Object.keys(files);
  const downloadQueue = filenames.map((filename, i) => {
    const payload = files[filename];
    const blob =
      // probably this is enough? It does not support Node or custom implementations
      payload instanceof Blob ? payload : new Blob([payload.content], { type: payload.type });

    // TODO: remove this workaround for multiple files when fixed (in filesaver?)
    return () => Promise.resolve().then(() => saveAs(blob, filename));
  });

  // There's a bug in some browser with multiple files downloaded at once
  // * sometimes only the first/last content is downloaded multiple times
  // * sometimes only the first/last filename is used multiple times
  await pMap(downloadQueue, (downloadFn) => Promise.all([downloadFn(), wait(50)]), {
    concurrency: 1,
  });
}
// Probably there's already another one around?
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
