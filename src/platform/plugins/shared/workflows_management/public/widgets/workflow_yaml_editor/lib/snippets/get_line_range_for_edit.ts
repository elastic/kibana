/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/code-editor';

export interface InsertedLineRange {
  lineStart: number;
  lineEnd: number;
}

/** Gets the line range for inserted text, excluding a leading YAML sequence key. */
export function getLineRangeForEdit(
  editRange: monaco.Range,
  text: string
): InsertedLineRange | undefined {
  if (!text) {
    return undefined;
  }

  let lineStart = editRange.startLineNumber;
  let effectiveText = text;

  if (editRange.startColumn > 1 && text.startsWith('\n')) {
    lineStart = editRange.startLineNumber + 1;
    effectiveText = text.slice(1);
  }

  const rawLines = effectiveText.split('\n');
  if (rawLines.length > 1 && rawLines[rawLines.length - 1] === '') {
    rawLines.pop();
  }
  if (rawLines.length === 0) {
    return undefined;
  }

  const stepOffset = rawLines.findIndex((line) => /^\s*-\s/.test(line));
  const contentOffset = stepOffset >= 0 ? stepOffset : 0;

  return {
    lineStart: lineStart + contentOffset,
    lineEnd: lineStart + rawLines.length - 1,
  };
}
