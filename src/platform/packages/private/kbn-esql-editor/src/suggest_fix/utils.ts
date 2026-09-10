/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Returns the number of identical lines at the start and end of both arrays.
 * Lines are compared after trimming so that indentation differences introduced
 * by the LLM don't cause unchanged lines to appear in the diff.
 */
export function findChangedRegion(
  originalLines: string[],
  fixedLines: string[]
): { prefixLen: number; suffixLen: number } {
  const maxPrefix = Math.min(originalLines.length, fixedLines.length);
  let prefixLen = 0;
  while (
    prefixLen < maxPrefix &&
    originalLines[prefixLen].trim() === fixedLines[prefixLen].trim()
  ) {
    prefixLen++;
  }

  const maxSuffix = Math.min(originalLines.length - prefixLen, fixedLines.length - prefixLen);
  let suffixLen = 0;
  while (
    suffixLen < maxSuffix &&
    originalLines[originalLines.length - 1 - suffixLen].trim() ===
      fixedLines[fixedLines.length - 1 - suffixLen].trim()
  ) {
    suffixLen++;
  }

  return { prefixLen, suffixLen };
}
