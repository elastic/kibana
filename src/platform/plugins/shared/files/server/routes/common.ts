/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Readable } from 'stream';
import type { FileHttpResponseOptions } from '@kbn/core-http-server';
import type { File } from '../../common/types';

export function getFileHttpResponseOptions(
  file: File
): Pick<FileHttpResponseOptions<Readable>, 'headers' | 'fileContentType'> {
  return {
    fileContentType: file.data.mimeType ?? 'application/octet-stream',
    headers: { 'cache-control': 'max-age=31536000, immutable' },
  };
}

export function getDownloadedFileName(file: File): string {
  // When creating a file we also calculate the extension so the `file.extension`
  // check is not really necessary except for type checking.
  if (file.data.mimeType && file.data.extension) {
    return `${file.data.name}.${file.data.extension}`;
  }
  return file.data.name;
}
