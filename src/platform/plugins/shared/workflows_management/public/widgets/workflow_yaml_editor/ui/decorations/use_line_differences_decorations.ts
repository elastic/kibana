/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import { monaco } from '@kbn/monaco';
import { buildMergedDiffLines } from './build_merged_diff_lines';

interface UseLineDifferencesDecorationsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  isEditorMounted: boolean;
  highlightDiff: boolean;
  originalValue?: string;
  currentValue?: string;
}

/**
 * Applies diff line decorations (green/red) only after the editor model has
 * been updated with the merged diff text. Listens for model content changes
 * so decorations are applied after the diff is injected, keeping them in sync.
 */
export const useLineDifferencesDecorations = ({
  editor,
  isEditorMounted,
  highlightDiff,
  originalValue,
  currentValue,
}: UseLineDifferencesDecorationsProps) => {
  const changesHighlightDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  useEffect(() => {
    const collection = changesHighlightDecorationCollectionRef.current;
    if (collection) {
      collection.clear();
      changesHighlightDecorationCollectionRef.current = null;
    }

    if (!highlightDiff || originalValue === undefined || !editor || !isEditorMounted) {
      return;
    }

    const current = currentValue ?? '';
    const { lineTypes, text: expectedDiffText } = buildMergedDiffLines(originalValue, current);

    const applyDecorations = () => {
      const model = editor.getModel();
      if (!model) return;
      const lineCount = model.getLineCount();
      if (lineCount !== lineTypes.length) return;
      const modelValue = model.getValue();
      if (modelValue !== expectedDiffText) return;

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      for (let i = 0; i < lineTypes.length; i++) {
        const lineNumber = i + 1;
        const type = lineTypes[i];
        if (type === 'equal') continue;

        const maxColumn = model.getLineMaxColumn(lineNumber);
        const range = new monaco.Range(lineNumber, 1, lineNumber, maxColumn);

        if (type === 'add') {
          decorations.push({
            range,
            options: {
              isWholeLine: true,
              className: 'diff-line-added',
              marginClassName: 'diff-line-added-margin',
              glyphMarginClassName: 'diff-glyph-added',
            },
          });
        } else {
          decorations.push({
            range,
            options: {
              isWholeLine: true,
              className: 'diff-line-removed',
              marginClassName: 'diff-line-removed-margin',
              glyphMarginClassName: 'diff-glyph-removed',
            },
          });
        }
      }

      if (decorations.length > 0) {
        const existing = changesHighlightDecorationCollectionRef.current;
        if (existing) {
          existing.clear();
          changesHighlightDecorationCollectionRef.current = null;
        }
        changesHighlightDecorationCollectionRef.current =
          editor.createDecorationsCollection(decorations);
      }
    };

    const model = editor.getModel();
    if (!model) return;

    const tryApplyOrClear = () => {
      const model = editor.getModel();
      if (!model) return;
      const modelValue = model.getValue();
      if (modelValue !== expectedDiffText) {
        const coll = changesHighlightDecorationCollectionRef.current;
        if (coll) {
          coll.clear();
          changesHighlightDecorationCollectionRef.current = null;
        }
        return;
      }
      applyDecorations();
    };

    const disposable = model.onDidChangeContent(tryApplyOrClear);

    const timeoutId = setTimeout(tryApplyOrClear, 0);

    return () => {
      disposable.dispose();
      clearTimeout(timeoutId);
      const coll = changesHighlightDecorationCollectionRef.current;
      if (coll) {
        coll.clear();
        changesHighlightDecorationCollectionRef.current = null;
      }
    };
  }, [
    highlightDiff,
    originalValue,
    isEditorMounted,
    currentValue,
    editor,
  ]);

  return {
    decorationCollectionRef: changesHighlightDecorationCollectionRef,
  };
};
