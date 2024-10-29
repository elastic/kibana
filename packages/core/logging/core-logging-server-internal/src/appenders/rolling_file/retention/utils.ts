/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment, { type Duration } from 'moment-timezone';
import { getFileInfo } from './fs';

export const listFilesExceedingSize = async ({
  orderedFiles,
  maxSizeInBytes,
}: {
  orderedFiles: string[];
  maxSizeInBytes: number;
}): Promise<string[]> => {
  let currentSize = 0;

  for (let i = 0; i < orderedFiles.length; i++) {
    const filePath = orderedFiles[i];
    const stats = await getFileInfo(filePath);
    if (stats.exist) {
      currentSize += stats.size;
      if (currentSize > maxSizeInBytes) {
        return orderedFiles.slice(i);
      }
    }
  }

  return [];
};

export const listFilesOlderThan = async ({
  orderedFiles,
  duration,
}: {
  orderedFiles: string[];
  duration: Duration;
}): Promise<string[]> => {
  const filesOlderThanLimit = [];
  const timeLimit = moment().subtract(duration).toDate().getTime();

  for (let i = 0; i < orderedFiles.length; i++) {
    const filePath = orderedFiles[i];
    const stats = await getFileInfo(filePath);
    if (stats.exist) {
      if (stats.mtime.getTime() < timeLimit) {
        filesOlderThanLimit.push(filePath);
      }
    }
  }

  return filesOlderThanLimit;
};
