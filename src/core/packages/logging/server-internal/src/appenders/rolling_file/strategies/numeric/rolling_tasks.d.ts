/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const shouldSkipRollout: ({
  logFilePath,
}: {
  logFilePath: string;
}) => Promise<boolean>;
/**
 * Returns the rolled file basenames, from the most recent to the oldest.
 */
export declare const getOrderedRolledFiles: ({
  logFileBaseName,
  logFileFolder,
  pattern,
}: {
  logFileFolder: string;
  logFileBaseName: string;
  pattern: string;
}) => Promise<string[]>;
export declare const rollPreviousFilesInOrder: ({
  filesToRoll,
  logFileFolder,
  logFileBaseName,
  pattern,
}: {
  logFileFolder: string;
  logFileBaseName: string;
  pattern: string;
  filesToRoll: string[];
}) => Promise<void>;
export declare const rollCurrentFile: ({
  logFileFolder,
  logFileBaseName,
  pattern,
}: {
  logFileFolder: string;
  logFileBaseName: string;
  pattern: string;
}) => Promise<void>;
