/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Fuzzy matching algorithm modeled on Monaco editor's `fuzzyScore`
 * (vs/base/common/filters.ts). Key behaviors replicated:
 *
 * - Word separators (`.`, `-`, `_`, etc.) give a score bonus to chars after them
 * - First match must be at a "strong" position (separator boundary, prefix, camelCase)
 * - Contiguous character runs score higher than scattered matches
 * - Exact prefix and substring matches get large bonuses
 * - Match positions are tracked for highlight rendering
 */

export interface FuzzyMatchResult {
  matches: boolean;
  /** Match character indices in the scored text (for highlight rendering) */
  indices: number[];
  /** Numeric score — higher is better. Comparable across items. */
  score: number;
}

/** Characters treated as word separators (same set as Monaco's isSeparatorAtPos). */
const SEPARATORS = new Set([
  '_',
  '-',
  '.',
  ' ',
  '/',
  '\\',
  "'",
  '"',
  ':',
  '$',
  '<',
  '>',
  '(',
  ')',
  '[',
  ']',
  '{',
  '}',
]);

const isUpperCase = (ch: string): boolean => ch !== ch.toLowerCase() && ch === ch.toUpperCase();

/** Check if position is a "strong" match start (separator boundary, camelCase, or string start). */
const isStrongPosition = (text: string, pos: number): boolean => {
  if (pos === 0) return true;
  const prev = text[pos - 1];
  if (SEPARATORS.has(prev)) return true;
  // CamelCase boundary: lowercase followed by uppercase
  if (!isUpperCase(prev) && isUpperCase(text[pos])) return true;
  return false;
};

/**
 * Score a pattern against text using Monaco-style fuzzy scoring.
 *
 * The scoring matches Monaco's behavior for the suggest widget:
 * - `filterText` (or `label`) is the text scored against
 * - The pattern is what the user typed
 * - Match positions are returned for highlight rendering on the label
 */

/** Score an array of match indices against the original text and pattern. */
const scoreMatchPositions = (
  indices: number[],
  pattern: string,
  text: string,
  pLen: number
): number => {
  let score = 0;
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    score += isStrongPosition(text, idx) ? 6 : 1;
    if (pattern[i] === text[idx]) score += 2; // exact case bonus
    if (i > 0 && idx === indices[i - 1] + 1) score += 5; // contiguous bonus
    score -= Math.floor(idx / 5); // earlier = better
  }
  // Penalize scattered matches
  const span = indices[indices.length - 1] - indices[0];
  score -= Math.floor((span - pLen) / 2);
  return score;
};

export const fuzzyMatch = (pattern: string, text: string): FuzzyMatchResult => {
  if (!pattern) {
    return { matches: true, indices: [], score: 0 };
  }

  const pLow = pattern.toLowerCase();
  const tLow = text.toLowerCase();
  const pLen = pLow.length;
  const tLen = tLow.length;

  if (pLen > tLen) {
    return { matches: false, indices: [], score: -1 };
  }

  // ── Fast path: exact match ──
  if (pLow === tLow) {
    return {
      matches: true,
      indices: Array.from({ length: pLen }, (_, i) => i),
      score: 10000,
    };
  }

  // ── Fast path: prefix match ──
  if (tLow.startsWith(pLow)) {
    return {
      matches: true,
      indices: Array.from({ length: pLen }, (_, i) => i),
      score: 5000 + pLen,
    };
  }

  // ── Fast path: substring match at a word boundary ──
  // Search for the pattern as a contiguous substring, preferring word-boundary starts
  let bestSubIdx = -1;
  let bestSubScore = -1;
  let searchFrom = 0;
  while (searchFrom <= tLen - pLen) {
    const idx = tLow.indexOf(pLow, searchFrom);
    if (idx === -1) break;
    let subScore = 2000; // Base substring bonus
    if (idx === 0) {
      subScore += 1000; // Prefix
    } else if (isStrongPosition(text, idx)) {
      subScore += 800; // Word-boundary start
    }
    if (subScore > bestSubScore) {
      bestSubScore = subScore;
      bestSubIdx = idx;
    }
    searchFrom = idx + 1;
  }
  if (bestSubIdx >= 0) {
    // Verify first match is strong (Monaco rejects weak first matches by default)
    if (bestSubIdx === 0 || isStrongPosition(text, bestSubIdx)) {
      return {
        matches: true,
        indices: Array.from({ length: pLen }, (_, i) => bestSubIdx + i),
        score: bestSubScore,
      };
    }
  }

  // ── Subsequence check ──
  // Verify pattern chars exist in order in text
  let pi = 0;
  for (let ti = 0; ti < tLen && pi < pLen; ti++) {
    if (tLow[ti] === pLow[pi]) pi++;
  }
  if (pi < pLen) {
    return { matches: false, indices: [], score: -1 };
  }

  // ── DP scoring (simplified Monaco algorithm) ──
  // Match pattern characters against text, preferring strong positions and contiguous runs

  // Find best match positions greedily, preferring strong positions.
  // First match must be at a strong position (Monaco's firstMatchCanBeWeak: false).
  const indices: number[] = [];
  pi = 0;

  // First pass: try to match each pattern char, requiring the first to be strong
  for (let ti = 0; ti < tLen && pi < pLen; ti++) {
    if (tLow[ti] === pLow[pi]) {
      // First match must be at a strong position — skip weak first positions
      const shouldMatch = pi > 0 || isStrongPosition(text, ti);
      if (shouldMatch) {
        indices.push(ti);
        pi++;
      }
    }
  }

  // If greedy matching didn't find all chars, try a second pass
  // that only enforces strong-first but accepts any subsequent position
  if (indices.length < pLen) {
    indices.length = 0;
    pi = 0;

    // Verify a strong first position exists at all
    const hasStrongFirst = Array.from({ length: tLen }, (_, i) => i).some(
      (i) => tLow[i] === pLow[0] && isStrongPosition(text, i)
    );
    if (!hasStrongFirst) {
      return { matches: false, indices: [], score: -1 };
    }

    // Match: strong first, any subsequent
    let firstMatched = false;
    for (let ti = 0; ti < tLen && pi < pLen; ti++) {
      if (tLow[ti] === pLow[pi]) {
        if (!firstMatched && !isStrongPosition(text, ti)) {
          // Skip — waiting for a strong first position
        } else {
          indices.push(ti);
          pi++;
          firstMatched = true;
        }
      }
    }

    if (indices.length < pLen) {
      return { matches: false, indices: [], score: -1 };
    }
  }

  return { matches: true, indices, score: scoreMatchPositions(indices, pattern, text, pLen) };
};

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

/**
 * Split a label into segments with highlight flags based on match indices.
 * If scoring was done against filterText (different from label), re-score
 * the pattern against the label to get label-specific highlight positions.
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

/**
 * Get highlight indices for the label when scoring was done against a different
 * filterText. Re-runs fuzzyMatch on the label to get label-specific positions.
 */
export const getLabelHighlightIndices = (
  pattern: string,
  label: string,
  filterText: string | undefined
): number[] => {
  if (!filterText || filterText === label) {
    // filterText matches label — use the same indices
    return fuzzyMatch(pattern, label).indices;
  }

  // filterText differs from label — score the label separately for highlights
  const labelResult = fuzzyMatch(pattern, label);
  return labelResult.indices;
};
