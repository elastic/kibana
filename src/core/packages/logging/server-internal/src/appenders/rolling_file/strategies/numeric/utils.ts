/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { copyFile, rename, unlink } from 'fs/promises';

export const moveFile = async (oldPath: string, newPath: string): Promise<void> => {
  try {
    await rename(oldPath, newPath);
  } catch (err) {
    // rename isn't supported on some file systems / volumes
    // so we fallback to copy+delete
    if (err.code === 'EXDEV') {
      await copyFile(oldPath, newPath);
      await unlink(oldPath);
    } else {
      throw err;
    }
  }
};
