/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node, Range } from 'yaml';
import { monaco } from '@kbn/monaco';
import type { YamlValidationErrorSeverity } from '../../../features/validate_workflow_yaml/model/types';

// Copied from monaco-editor/esm/vs/editor/editor.api.d.ts because we can't import with turbopack
export enum MarkerSeverity {
  Hint = 1,
  Info = 2,
  Warning = 4,
  Error = 8,
}

export function getSeverityString(severity: MarkerSeverity): YamlValidationErrorSeverity {
  switch (severity) {
    case MarkerSeverity.Error:
      return 'error';
    case MarkerSeverity.Warning:
      return 'warning';
    case MarkerSeverity.Info:
    case MarkerSeverity.Hint:
    default:
      return 'info';
  }
}

export function navigateToErrorPosition(
  editor: monaco.editor.IStandaloneCodeEditor | monaco.editor.IDiffEditor,
  lineNumber: number,
  column: number
): void {
  editor.setPosition({
    lineNumber,
    column,
  });
  editor.focus();
  editor.revealLineInCenter(lineNumber);
}

export function getMonacoRangeFromYamlNode(
  model: monaco.editor.ITextModel,
  node: Node
): monaco.Range | null {
  if (!node.range) {
    return null;
  }
  return getMonacoRangeFromYamlRange(model, node.range);
}

export function getMonacoRangeFromYamlRange(
  model: monaco.editor.ITextModel,
  range: Range
): monaco.Range | null {
  const [startOffset, _, endOffset] = range;
  const startPos = model.getPositionAt(startOffset);
  const endPos = model.getPositionAt(endOffset);
  if (!startPos || !endPos) {
    return null;
  }
  return new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column);
}
