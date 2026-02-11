/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { memoize } from 'lodash';

interface ProtectedRange {
  start: number;
  end: number;
}

export const HIGHLIGHT_TOKEN = '=hl=';

/**
 * Highlights text matches in a string by wrapping them in a highlighted mardown =hl=text=hl=.
 * Performs case-insensitive matching while avoiding highlighting text inside
 * markdown code blocks and links.
 */
export function highlightMatches(text: string, searchText: string): string {
  const normalizedSearchText = searchText.trim();

  if (!normalizedSearchText) {
    return text;
  }

  const protectedRanges = findProtectedRanges(text);

  // Create a regex to find all matches (case-insensitive)
  const regex = new RegExp(
    normalizedSearchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), // escape regex special characters
    'gi'
  );

  // Use replace to wrap matches in highlighting markers, but only if they're not in protected ranges
  return text.replace(regex, (match, offset) => {
    if (isPositionProtected(offset, protectedRanges)) {
      return match;
    }
    return `${HIGHLIGHT_TOKEN}${match}${HIGHLIGHT_TOKEN}`;
  });
}

export function removeHighlighting(text: string): string {
  return text.replaceAll(HIGHLIGHT_TOKEN, '');
}

/**
 * Finds protected ranges in markdown text (code blocks, inline code, and links)
 * where highlighting should not occur.
 *
 * This function is memoized so it won't run twice for the same given text.
 */
const findProtectedRanges = memoize((text: string): ProtectedRange[] => {
  const ranges: ProtectedRange[] = [];

  // Find multi-line code blocks (```...```)
  const codeBlockRegex = /```[\s\S]*?```/g;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }

  // Find inline code (`...`)
  const inlineCodeRegex = /`[^`\n]+`/g;
  while ((match = inlineCodeRegex.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }

  // Find markdown links ([text](url))
  // Use a limited length match to prevent ReDoS - links shouldn't be extremely long
  // This matches up to 500 chars in brackets and parentheses (should be enough for any link)
  const linkRegex = /\[(?:[^\]]){0,500}?\]\((?:[^)]){0,500}?\)/g;
  while ((match = linkRegex.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }

  // Sort ranges by start position and merge overlapping ranges
  ranges.sort((a, b) => a.start - b.start);
  const mergedRanges: ProtectedRange[] = [];
  for (const range of ranges) {
    const lastRange = mergedRanges[mergedRanges.length - 1];
    if (lastRange && range.start <= lastRange.end) {
      lastRange.end = Math.max(lastRange.end, range.end);
    } else {
      mergedRanges.push(range);
    }
  }

  return mergedRanges;
});

/**
 * Checks if a position is within any of the protected ranges.
 */
function isPositionProtected(position: number, protectedRanges: ProtectedRange[]): boolean {
  return protectedRanges.some((range) => position >= range.start && position < range.end);
}
