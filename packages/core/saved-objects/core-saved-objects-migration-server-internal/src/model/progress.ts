/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MigrationLog, Progress } from '../types';

/**
 * Returns an initial state of the progress object (everything undefined)
 */
export function createInitialProgress(): Progress {
  return {
    processed: undefined,
    total: undefined,
  };
}

/**
 * Overwrites the total of the progress if anything provided
 * @param previousProgress
 * @param total
 */
export function setProgressTotal(
  previousProgress: Progress,
  total = previousProgress.total
): Progress {
  return {
    ...previousProgress,
    total,
  };
}

/**
 * Returns a new list of MigrationLogs with the info entry about the progress
 * @param previousLogs
 * @param progress
 */
export function logProgress(previousLogs: MigrationLog[], progress: Progress): MigrationLog[] {
  const logs = [...previousLogs];

  if (progress.total) {
    if (typeof progress.processed === 'undefined') {
      logs.push({
        level: 'info',
        message: `Starting to process ${progress.total} documents.`,
      });
    } else {
      logs.push({
        level: 'info',
        message: `Processed ${progress.processed} documents out of ${progress.total}.`,
      });
    }
  }

  return logs;
}

/**
 * Increments the processed count and returns a new Progress
 * @param previousProgress Previous state of the progress
 * @param incrementProcessedBy Amount to increase the processed count by
 */
export function incrementProcessedProgress(
  previousProgress: Progress,
  incrementProcessedBy = 0
): Progress {
  return {
    ...previousProgress,
    processed: (previousProgress.processed ?? 0) + incrementProcessedBy,
  };
}
