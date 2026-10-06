/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationLog, Progress } from '../types';
/**
 * Returns an initial state of the progress object (everything undefined)
 */
export declare function createInitialProgress(): Progress;
/**
 * Overwrites the total of the progress if anything provided
 * @param previousProgress
 * @param total
 */
export declare function setProgressTotal(
  previousProgress: Progress,
  total?: number | undefined
): Progress;
/**
 * Returns a new list of MigrationLogs with the info entry about the progress
 * @param previousLogs
 * @param progress
 */
export declare function logProgress(
  previousLogs: MigrationLog[],
  progress: Progress
): MigrationLog[];
/**
 * Increments the processed count and returns a new Progress
 * @param previousProgress Previous state of the progress
 * @param incrementProcessedBy Amount to increase the processed count by
 */
export declare function incrementProcessedProgress(
  previousProgress: Progress,
  incrementProcessedBy?: number
): Progress;
