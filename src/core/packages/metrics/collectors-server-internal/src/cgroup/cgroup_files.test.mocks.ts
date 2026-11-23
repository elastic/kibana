/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PathLike } from 'fs';

export const readFileMock = jest.fn<Promise<Buffer>, [PathLike]>();

jest.doMock('fs/promises', () => ({ readFile: readFileMock }));

/** Builds an error with the code and message Node's fs/promises readFile rejects with. */
export const createFsError = (code: string, description: string, path: string) =>
  Object.assign(new Error(`${code}: ${description}, open '${path}'`), { code });

/** Serves the given file contents from readFile, and rejects other paths with ENOENT. */
export const mockCgroupFiles = (files: Readonly<Record<string, string>>) => {
  readFileMock.mockImplementation(async (path) => {
    const file = files[String(path)];
    if (file === undefined) {
      throw createFsError('ENOENT', 'no such file or directory', String(path));
    }
    return Buffer.from(file);
  });
};
