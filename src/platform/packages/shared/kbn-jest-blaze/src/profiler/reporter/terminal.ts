/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import stripAnsi from 'strip-ansi';

export function getTextSegments(input: string) {
  const clean = stripAnsi(input);
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return Array.from(segmenter.segment(clean)).map((segment) => segment.segment);
}

export function getTextDisplayedWidth(input: string) {
  return getTextSegments(input).length;
}

export function getTermWidth(): number {
  const w = typeof process !== 'undefined' && process.stdout && process.stdout.columns;
  const cols = typeof w === 'number' && w > 40 ? w : 120;
  const buffer = 16; // leave extra space to avoid overflow
  return Math.max(60, cols - buffer);
}
