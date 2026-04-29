/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';

/**
 * Translates a zero-based, end-exclusive offset range expressed against the
 * extracted ES|QL substring into a Monaco IRange (one-based, end-inclusive)
 * over the surrounding YAML model.
 *
 * Returns `null` when the resulting range falls outside the model — callers
 * should drop the suggestion rather than render a bad range.
 */
export function mapEsqlRangeToYaml(
  range: { start: number; end: number },
  contentStartInFile: number,
  model: monaco.editor.ITextModel
): monaco.IRange | null {
  if (range.end < range.start) {
    return null;
  }

  const startOffset = contentStartInFile + range.start;
  const endOffset = contentStartInFile + range.end;
  const maxOffset = model.getValueLength();

  if (startOffset < 0 || startOffset > maxOffset) {
    return null;
  }

  const safeEndOffset = Math.min(endOffset, maxOffset);
  const startPos = model.getPositionAt(startOffset);
  const endPos = model.getPositionAt(safeEndOffset);

  return {
    startLineNumber: startPos.lineNumber,
    startColumn: startPos.column,
    endLineNumber: endPos.lineNumber,
    endColumn: endPos.column,
  };
}

export function buildZeroWidthYamlRange(
  offset: number,
  model: monaco.editor.ITextModel
): monaco.IRange {
  const safe = Math.max(0, Math.min(offset, model.getValueLength()));
  const pos = model.getPositionAt(safe);
  return {
    startLineNumber: pos.lineNumber,
    startColumn: pos.column,
    endLineNumber: pos.lineNumber,
    endColumn: pos.column,
  };
}
