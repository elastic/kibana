/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { diffLines } from 'diff';

export type DiffLineType = 'add' | 'remove' | 'equal';

export interface MergedDiffLines {
  /** Full text of the merged diff (one line per array element, joined by \n) */
  text: string;
  /** Type for each 1-based line number (index 0 = line 1) */
  lineTypes: DiffLineType[];
}

/**
 * Builds a unified diff view: a single document containing both original and
 * current lines, with each line classified as added, removed, or unchanged.
 * Used to show green (+) for additions and red (-) for deletions in the editor.
 */
export function buildMergedDiffLines(original: string, current: string): MergedDiffLines {
  const originalNorm = original ?? '';
  const currentNorm = current ?? '';
  const changes = diffLines(originalNorm, currentNorm, { ignoreWhitespace: false });

  const lines: string[] = [];
  const lineTypes: DiffLineType[] = [];

  for (const change of changes) {
    const lineStrings = (change.value ?? '').split('\n');
    // diffLines includes trailing newline in value, so we often get an empty string at the end
    if (lineStrings.length > 1 && lineStrings[lineStrings.length - 1] === '') {
      lineStrings.pop();
    }
    const type: DiffLineType = change.added ? 'add' : change.removed ? 'remove' : 'equal';
    for (const line of lineStrings) {
      lines.push(line);
      lineTypes.push(type);
    }
  }

  return {
    text: lines.join('\n'),
    lineTypes,
  };
}
