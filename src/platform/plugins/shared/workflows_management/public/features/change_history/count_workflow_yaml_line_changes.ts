/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { diffLines } from 'diff';

/* Fallback to line hunks when semantic diff is not possible. */
export const countWorkflowYamlLineChanges = (baselineYaml: string, targetYaml: string): number => {
  if (baselineYaml === targetYaml) {
    return 0;
  }

  const changes = diffLines(baselineYaml, targetYaml, { ignoreNewlineAtEof: true });
  let hunkCount = 0;
  let inHunk = false;

  for (const change of changes) {
    if (change.added || change.removed) {
      if (!inHunk) {
        hunkCount += 1;
        inHunk = true;
      }
    } else {
      inHunk = false;
    }
  }

  return hunkCount;
};
