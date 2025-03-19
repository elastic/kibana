/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extname } from 'path';
import Accept from '@hapi/accept';
import { open } from './fs';

declare module '@hapi/accept' {
  // @types/accept does not include the `preferences` argument so we override the type to include it
  export function encodings(encodingHeader?: string, preferences?: string[]): string[];
}

async function tryToOpenFile(filePath: string) {
  try {
    return await open(filePath, 'r');
  } catch (e) {
    if (e.code === 'ENOENT') {
      return undefined;
    } else {
      throw e;
    }
  }
}

export async function selectCompressedFile(acceptEncodingHeader: string | undefined, path: string) {
  let fd: number | undefined;
  let fileEncoding: 'gzip' | 'br' | undefined;
  const ext = extname(path);

  const supportedEncodings = Accept.encodings(acceptEncodingHeader, ['br', 'gzip']);

  // do not bother trying to look compressed versions for anything else than js or css files
  if (ext === '.js' || ext === '.css') {
    if (supportedEncodings[0] === 'br') {
      fileEncoding = 'br';
      fd = await tryToOpenFile(`${path}.br`);
    }
  }

  if (!fd) {
    fileEncoding = undefined;
    // Use raw open to trigger exception if it does not exist
    fd = await open(path, 'r');
  }

  return { fd, fileEncoding };
}
