/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { unlink, stat } from 'fs/promises';

export const deleteFiles = async ({ filesToDelete }: { filesToDelete: string[] }) => {
  await Promise.all(filesToDelete.map((fileToDelete) => unlink(fileToDelete)));
};

export type GetFileInfoResult = { exist: false } | { exist: true; size: number; mtime: Date };

export const getFileInfo = async (absFilePath: string): Promise<GetFileInfoResult> => {
  try {
    const { size, mtime } = await stat(absFilePath);
    return { exist: true, size, mtime };
  } catch (e) {
    if (e.code === 'ENOENT') {
      return { exist: false };
    }
    throw e;
  }
};
