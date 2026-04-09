/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import minimatch from 'minimatch';

/**
 * Returns file paths that don't match any of the given glob patterns.
 * When `patterns` is empty, all files are returned unchanged.
 */
export function filterIgnoredFiles(files: string[], patterns: string[]): string[] {
  if (patterns.length === 0) {
    return files;
  }
  return files.filter((file) => !patterns.some((p) => minimatch(file, p, { dot: true })));
}

/**
 * Returns true when any pattern matches any file in the list
 */
export function touchedCriticalFiles(files: string[], criticalFiles: string[]): boolean {
  return files.some((file) =>
    criticalFiles.some((criticalFile) => minimatch(file, criticalFile, { dot: true }))
  );
}
