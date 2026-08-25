/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, Node } from 'yaml';
import { isScalar, isSeq, visit } from 'yaml';

export interface StepsElseKeyOffsets {
  stepsKeyStartOffsets: number[];
  elseKeyStartOffsets: number[];
}

export function getStepsAndElseKeyOffsets(document: Document): StepsElseKeyOffsets {
  const stepsKeyStartOffsets: number[] = [];
  const elseKeyStartOffsets: number[] = [];

  visit(document, {
    Pair(_key, pair) {
      if (!pair.key || !isScalar(pair.key)) return;
      const keyVal = pair.key.value;
      if (keyVal !== 'steps' && keyVal !== 'else') return;
      const keyNode = pair.key as Node;
      if (!keyNode.range) return;
      const startOffset = keyNode.range[0];
      if (keyVal === 'steps') {
        stepsKeyStartOffsets.push(startOffset);
      } else {
        elseKeyStartOffsets.push(startOffset);
      }
    },
  });

  return { stepsKeyStartOffsets, elseKeyStartOffsets };
}

export interface BlockKeyInfo {
  keyStartOffset: number;
  rangeStart: number;
  rangeEnd: number;
}

export function getInnermostBlockContainingOffset(
  document: Document,
  cursorOffset: number
): BlockKeyInfo | null {
  const candidates: BlockKeyInfo[] = [];

  visit(document, {
    Pair(_key, pair) {
      if (!pair.key || !isScalar(pair.key)) return;
      const keyVal = pair.key.value;
      if (keyVal !== 'steps' && keyVal !== 'else') return;
      const seq = pair.value;
      if (!isSeq(seq) || !seq.range) return;
      const keyNode = pair.key as Node;
      if (!keyNode.range) return;
      const [rangeStart, , rangeEnd] = seq.range as number[];
      if (cursorOffset >= rangeStart && cursorOffset <= rangeEnd) {
        candidates.push({
          keyStartOffset: keyNode.range[0],
          rangeStart,
          rangeEnd,
        });
      }
    },
  });

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.rangeEnd - a.rangeStart - (b.rangeEnd - b.rangeStart));
  return candidates[0];
}
