/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { Node } from 'yaml';
import type { YamlValidationErrorSeverity } from '../../../features/validate_workflow_yaml/model/types';

export function getSeverityString(severity: monaco.MarkerSeverity): YamlValidationErrorSeverity {
  switch (severity) {
    case monaco.MarkerSeverity.Error:
      return 'error';
    case monaco.MarkerSeverity.Warning:
      return 'warning';
    case monaco.MarkerSeverity.Info:
    case monaco.MarkerSeverity.Hint:
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

// REMOVED: getHighlightStepDecorations - no longer needed
// All step highlighting is now handled by UnifiedActionsProvider

export function getMonacoRangeFromYamlNode(
  model: monaco.editor.ITextModel,
  node: Node
): monaco.Range | null {
  const [startOffset, _, endOffset] = node.range ?? [];
  if (!startOffset || !endOffset) {
    return null;
  }
  const startPos = model.getPositionAt(startOffset);
  const endPos = model.getPositionAt(endOffset);
  if (!startPos || !endPos) {
    return null;
  }
  const range = new monaco.Range(
    startPos.lineNumber,
    startPos.column,
    endPos.lineNumber,
    endPos.column
  );
  return range;
}
