/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const DEFAULT_MAX_ENCODED_LENGTH = 3000;
// `encodeURIComponent(',')` === '%2C'
const ENCODED_SEPARATOR_LENGTH = 3;

const encodedLength = (pattern: string): number => encodeURIComponent(pattern).length;

/**
 * Splits a pattern on top-level commas, i.e. commas that are not inside a
 * `<...>` date-math expression (e.g. `<logstash-{now/d}>`), which must never
 * be split even if it were to contain one.
 */
const splitOutsideDateMath = (value: string): string[] => {
  const entries: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of value) {
    if (char === '<') {
      depth++;
    } else if (char === '>') {
      depth = Math.max(0, depth - 1);
    }
    if (char === ',' && depth === 0) {
      entries.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  entries.push(current.trim());
  return entries;
};

const normalizePatterns = (indices: string | string[] | undefined): string[] => {
  if (indices == null) {
    return [];
  }
  const raw = typeof indices === 'string' ? [indices] : indices;
  return raw.flatMap(splitOutsideDateMath).filter((entry) => entry.length > 0);
};

/**
 * Splits an index/pattern target for the `_field_caps` API into chunks whose
 * `encodeURIComponent`-encoded, comma-joined length stays under `maxEncodedLength`.
 *
 * The Elasticsearch JS client always serializes `index` into the URL path for
 * `_field_caps` (never the body or query string), so a data view whose pattern
 * resolves to a very long list of concrete indices or patterns can produce a
 * request line larger than Elasticsearch's `http.max_initial_line_length`
 * (default 4096 bytes), throwing `too_long_http_line_exception`.
 *
 * Patterns starting with `-` (exclusions) are repeated in every chunk, since
 * Elasticsearch's multi-target syntax resolves an exclusion relative to
 * whatever else is present in the same call.
 *
 * Returns `[]` for empty/undefined input, and a single chunk whenever the
 * input already fits under the limit (the common case) — callers should use
 * the original `indices` value, not this chunk, when only one chunk comes back.
 */
export function chunkIndicesForFieldCaps(
  indices: string | string[] | undefined,
  maxEncodedLength = DEFAULT_MAX_ENCODED_LENGTH
): string[][] {
  const patterns = normalizePatterns(indices);
  if (patterns.length === 0) {
    return [];
  }

  const negativePatterns = patterns.filter((pattern) => pattern.startsWith('-'));
  const positivePatterns = patterns.filter((pattern) => !pattern.startsWith('-'));

  if (positivePatterns.length === 0) {
    return [negativePatterns];
  }

  const negativesBudget = negativePatterns.reduce(
    (sum, pattern) => sum + encodedLength(pattern) + ENCODED_SEPARATOR_LENGTH,
    0
  );
  const availableLength = Math.max(1, maxEncodedLength - negativesBudget);

  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const pattern of positivePatterns) {
    const patternLength = encodedLength(pattern);
    const addedLength =
      currentChunk.length === 0 ? patternLength : patternLength + ENCODED_SEPARATOR_LENGTH;

    if (currentChunk.length > 0 && currentLength + addedLength > availableLength) {
      chunks.push(currentChunk);
      currentChunk = [pattern];
      currentLength = patternLength;
    } else {
      currentChunk.push(pattern);
      currentLength += addedLength;
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.map((chunk) => [...chunk, ...negativePatterns]);
}
