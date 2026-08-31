/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Change, diffLines } from 'diff';

export interface WorkflowYamlDiffStats {
  parts: Change[];
  added: number;
  removed: number;
  hunkCount: number;
}

const EMPTY_STATS: WorkflowYamlDiffStats = {
  parts: [],
  added: 0,
  removed: 0,
  hunkCount: 0,
};

/**
 * Compute line-based diff statistics for a pair of workflow YAML strings.
 *
 * Callers that render inside React should memoize this via `useMemo` keyed on
 * the input strings — the function itself is pure and does not cache.
 */
export const computeWorkflowYamlDiffStats = (
  beforeYaml: string,
  afterYaml: string
): WorkflowYamlDiffStats => {
  if (beforeYaml === afterYaml) {
    return EMPTY_STATS;
  }

  const parts = diffLines(beforeYaml, afterYaml, { ignoreNewlineAtEof: true });
  let added = 0;
  let removed = 0;
  let hunkCount = 0;
  let inHunk = false;

  for (const part of parts) {
    const count = part.count ?? part.value.replace(/\n$/, '').split('\n').length;
    if (part.added || part.removed) {
      if (part.added) added += count;
      else removed += count;
      if (!inHunk) {
        hunkCount += 1;
        inHunk = true;
      }
    } else {
      inHunk = false;
    }
  }

  return { parts, added, removed, hunkCount };
};
