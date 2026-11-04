/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/code-editor';
import type { ReferenceSelectionBridge } from './reference_capable_field';

/**
 * Lets `ReferenceCapableField` drive a Monaco editor: read and set the caret, and replace a
 * range through `executeEdits` so the insertion joins the editor's own undo stack.
 * `fallbackCaret` is used when the editor has no position yet.
 */
export const createMonacoSelectionBridge = (
  editor: monaco.editor.IStandaloneCodeEditor,
  fallbackCaret: () => number
): ReferenceSelectionBridge => {
  const model = editor.getModel();
  const clamp = (offset: number) => Math.max(0, Math.min(offset, model?.getValueLength() ?? 0));
  return {
    focus: () => editor.focus(),
    getCaret: () => {
      const position = editor.getPosition();
      return model && position ? model.getOffsetAt(position) : fallbackCaret();
    },
    setCaret: (offset: number) => {
      if (!model) return;
      const position = model.getPositionAt(clamp(offset));
      editor.setPosition(position);
      editor.revealPosition(position);
      editor.focus();
    },
    replaceText: (start: number, end: number, text: string) => {
      if (!model) return false;
      const from = model.getPositionAt(clamp(start));
      const to = model.getPositionAt(clamp(end));
      editor.focus();
      editor.executeEdits('workflow-data-reference', [
        {
          range: {
            startLineNumber: from.lineNumber,
            startColumn: from.column,
            endLineNumber: to.lineNumber,
            endColumn: to.column,
          },
          text,
          forceMoveMarkers: true,
        },
      ]);
      const next = model.getPositionAt(clamp(start) + text.length);
      editor.setPosition(next);
      editor.revealPosition(next);
      return true;
    },
  };
};
