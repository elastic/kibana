/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface FuzzyMatchResult {
  matches: boolean;
  indices: number[];
  score: number;
}

/** Characters that act as word separators (like Monaco's suggest scoring). */
const WORD_SEPARATORS = new Set(['.', '-', '_', '/', ' ', ':']);

/**
 * Fuzzy-match a pattern against text. Returns matched character indices
 * and a score (higher = better).
 *
 * Scoring prioritizes (in order):
 * 1. Exact prefix match (highest)
 * 2. Word-boundary matches (after `.`, `-`, `_`, etc.)
 * 3. Consecutive character runs
 * 4. Earlier match positions
 *
 * This matches Monaco's built-in suggest behavior where typing "bulk"
 * surfaces "elasticsearch.bulk" above "elasticsearch.bulk_delete".
 */
export const fuzzyMatch = (pattern: string, text: string): FuzzyMatchResult => {
  if (!pattern) {
    return { matches: true, indices: [], score: 0 };
  }

  const pLower = pattern.toLowerCase();
  const tLower = text.toLowerCase();

  // Fast path: check if pattern is a substring (common case)
  const substringIdx = tLower.indexOf(pLower);
  if (substringIdx !== -1) {
    const indices = Array.from({ length: pLower.length }, (_, i) => substringIdx + i);
    let score = 1000; // Substring match base bonus
    // Prefix match bonus
    if (substringIdx === 0) {
      score += 500;
    }
    // Word-boundary start bonus (match starts right after a separator)
    if (substringIdx > 0 && WORD_SEPARATORS.has(text[substringIdx - 1])) {
      score += 400;
    }
    // Exact match bonus
    if (pLower === tLower) {
      score += 1000;
    }
    return { matches: true, indices, score };
  }

  // Slow path: subsequence matching with word-boundary-aware scoring
  const indices: number[] = [];
  let pi = 0;

  for (let ti = 0; ti < tLower.length && pi < pLower.length; ti++) {
    if (tLower[ti] === pLower[pi]) {
      indices.push(ti);
      pi++;
    }
  }

  if (pi < pLower.length) {
    return { matches: false, indices: [], score: -1 };
  }

  let score = 0;
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    // Earlier matches are better
    score -= idx;
    // Consecutive matches get a bonus
    if (i > 0 && idx === indices[i - 1] + 1) {
      score += 15;
    }
    // Word-boundary match bonus (char right after a separator or at start)
    if (idx === 0 || WORD_SEPARATORS.has(text[idx - 1])) {
      score += 20;
    }
    // Camel-case boundary bonus (lowercase followed by uppercase)
    if (
      idx > 0 &&
      text[idx - 1] === text[idx - 1].toLowerCase() &&
      text[idx] === text[idx].toUpperCase()
    ) {
      score += 10;
    }
  }

  return { matches: true, indices, score };
};

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

/**
 * Split a label into segments with highlight flags based on fuzzy match indices.
 * Used for rendering without dangerouslySetInnerHTML.
 */
export const highlightSegments = (label: string, indices: number[]): HighlightSegment[] => {
  if (indices.length === 0) {
    return [{ text: label, highlighted: false }];
  }

  const indexSet = new Set(indices);
  const segments: HighlightSegment[] = [];
  let currentText = '';
  let currentHighlighted = false;

  for (let i = 0; i < label.length; i++) {
    const isHighlighted = indexSet.has(i);
    if (i === 0) {
      currentHighlighted = isHighlighted;
      currentText = label[i];
    } else if (isHighlighted === currentHighlighted) {
      currentText += label[i];
    } else {
      segments.push({ text: currentText, highlighted: currentHighlighted });
      currentText = label[i];
      currentHighlighted = isHighlighted;
    }
  }

  if (currentText) {
    segments.push({ text: currentText, highlighted: currentHighlighted });
  }

  return segments;
};
