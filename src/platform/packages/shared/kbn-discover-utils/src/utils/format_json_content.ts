/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Upper bound on the value length we attempt to format.
 * Set to avoid blocking the thread on malicious or very edge case inputs.
 */
const MAX_FORMATTABLE_LENGTH = 100_000;

/**
 * Pretty-prints a field value that contains JSON blocks, replacing every JSON block with its pretty-printed
 * form and placing each block (and each surrounding run of text) on its own line so
 * the result reads clearly. Returns the transformed string, or undefined
 * when the value contains no JSON to format, so the caller can render it as-is.
 */
export const tryPrettyPrintJsonBlocks = (value: string): string | undefined => {
  if (value.length > MAX_FORMATTABLE_LENGTH) {
    return undefined;
  }

  const segments = extractEmbeddedJsonSegments(value);
  if (!segments.length) {
    return undefined;
  }

  const parts: string[] = [];
  let cursor = 0;

  for (const segment of segments) {
    const precedingText = value.slice(cursor, segment.start).trim();
    if (precedingText) {
      parts.push(precedingText);
    }
    parts.push(segment.pretty);
    cursor = segment.end;
  }

  const trailingText = value.slice(cursor).trim();
  if (trailingText) {
    parts.push(trailingText);
  }

  return parts.join('\n');
};

interface EmbeddedJsonSegment {
  start: number;
  end: number;
  pretty: string;
}
/**
 * Scans a string for embedded JSON blocks within surrounding text and
 * returns them in order of appearance. Only well-formed, non-empty objects and
 * arrays are returned, so plain text such as `[Error]` or `{not json}` is not
 * detected as JSON.
 */
const extractEmbeddedJsonSegments = (value: string): EmbeddedJsonSegment[] => {
  const segments: EmbeddedJsonSegment[] = [];
  let i = 0;

  while (i < value.length) {
    const char = value[i];
    if (char !== '{' && char !== '[') {
      i++;
      continue;
    }

    // Find the end of the JSON block.
    const end = findSegmentEnd(value, i);

    // If the block is not well-formed, skip it.
    if (end === undefined) {
      i++;
      continue;
    }

    // If the block is not valid JSON, skip it.
    let parsed: unknown;
    try {
      parsed = JSON.parse(value.slice(i, end));
    } catch {
      i++;
      continue;
    }

    // If the block only contains a scalar value or is empty, skip it.
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (Array.isArray(parsed) && parsed.length === 0) ||
      Object.keys(parsed).length === 0
    ) {
      i++;
      continue;
    }

    segments.push({ start: i, end, pretty: JSON.stringify(parsed, null, 2) });
    i = end;
  }

  return segments;
};

/**
 * Finds the offset of the closing delimiter for a JSON value that
 * starts at `startIndex`, or undefined if the delimiters never balance. String
 * literals and their escapes are respected so braces/brackets inside strings do
 * not affect the result.
 * Note there is no check on symmetry between "{" and "]", validity is checked when running JSON.parse.
 */
const findSegmentEnd = (value: string, startIndex: number): number | undefined => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < value.length; i++) {
    const char = value[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{' || char === '[') {
      depth++;
    } else if (char === '}' || char === ']') {
      depth--;
      if (depth === 0) {
        return i + 1;
      }
    }
  }

  return undefined;
};
