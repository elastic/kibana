/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { findChangedRegion } from '../suggest_fix/utils';
import type { ReviewState } from './use_replace_review';

export interface VisorNlInsertPlan {
  review: ReviewState;
  // Null when the generated query only deletes original lines.
  insert: { isLastLine: boolean; text: string } | null;
}

/** Insert text and review ranges that Undo can apply to restore the original query. */
export const getVisorNlInsertPlan = (
  originalLines: string[],
  generatedLines: string[]
): VisorNlInsertPlan | null => {
  const { prefixLen, suffixLen } = findChangedRegion(originalLines, generatedLines);

  const firstChangedOriginalLine = prefixLen + 1;
  const lastChangedOriginalLine = originalLines.length - suffixLen;
  const genChangedLines = generatedLines.slice(prefixLen, generatedLines.length - suffixLen);

  if (genChangedLines.length === 0 && firstChangedOriginalLine > lastChangedOriginalLine) {
    return null;
  }

  const isLastLine = suffixLen === 0;
  const insert =
    genChangedLines.length === 0
      ? null
      : {
          isLastLine,
          // End-of-query: leading newline only, so reject can drop the generated
          // lines without leaving a leftover EOL. Mid-query: trailing newline so
          // the unchanged suffix stays on its own line.
          text: isLastLine ? `\n${genChangedLines.join('\n')}` : `${genChangedLines.join('\n')}\n`,
        };

  return {
    review: {
      firstChangedOriginalLine,
      lastChangedOriginalLine,
      generatedLineStart: lastChangedOriginalLine + 1,
      generatedLineEnd: lastChangedOriginalLine + genChangedLines.length,
    },
    insert,
  };
};
