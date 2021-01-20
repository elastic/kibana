/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { join } from 'path';
import { readdir, rename, unlink, access } from 'fs/promises';
import { getFileNameMatcher, getRollingFileName } from './pattern_matcher';

export const shouldSkipRollout = async ({ logFilePath }: { logFilePath: string }) => {
  // in case of time-interval triggering policy, we can have an entire
  // interval without any log event. In that case, the log file is not even
  // present, and we should not perform the rollout
  try {
    await access(logFilePath);
    return false;
  } catch (e) {
    return true;
  }
};

/**
 * Returns the rolled file basenames, from the most recent to the oldest.
 */
export const getOrderedRolledFiles = async ({
  logFileBaseName,
  logFileFolder,
  pattern,
}: {
  logFileFolder: string;
  logFileBaseName: string;
  pattern: string;
}): Promise<string[]> => {
  const matcher = getFileNameMatcher(logFileBaseName, pattern);
  const dirContent = await readdir(logFileFolder);
  return dirContent
    .map((fileName) => ({
      fileName,
      index: matcher(fileName),
    }))
    .filter(({ index }) => index !== undefined)
    .sort((a, b) => a.index! - b.index!)
    .map(({ fileName }) => fileName);
};

export const deleteFiles = async ({
  logFileFolder,
  filesToDelete,
}: {
  logFileFolder: string;
  filesToDelete: string[];
}) => {
  await Promise.all(filesToDelete.map((fileToDelete) => unlink(join(logFileFolder, fileToDelete))));
};

export const rollPreviousFilesInOrder = async ({
  filesToRoll,
  logFileFolder,
  logFileBaseName,
  pattern,
}: {
  logFileFolder: string;
  logFileBaseName: string;
  pattern: string;
  filesToRoll: string[];
}) => {
  for (let i = filesToRoll.length - 1; i >= 0; i--) {
    const oldFileName = filesToRoll[i];
    const newFileName = getRollingFileName(logFileBaseName, pattern, i + 2);
    await rename(join(logFileFolder, oldFileName), join(logFileFolder, newFileName));
  }
};

export const rollCurrentFile = async ({
  logFileFolder,
  logFileBaseName,
  pattern,
}: {
  logFileFolder: string;
  logFileBaseName: string;
  pattern: string;
}) => {
  const rolledBaseName = getRollingFileName(logFileBaseName, pattern, 1);
  await rename(join(logFileFolder, logFileBaseName), join(logFileFolder, rolledBaseName));
};
