/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import { monaco } from '@kbn/monaco';

interface UseLineDifferencesDecorationsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  isEditorMounted: boolean;
  highlightDiff: boolean;
  originalValue?: string;
  currentValue?: string;
}

export const useLineDifferencesDecorations = ({
  editor,
  isEditorMounted,
  highlightDiff,
  originalValue,
  currentValue,
}: UseLineDifferencesDecorationsProps) => {
  const changesHighlightDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  // Helper to compute diff lines
  const calculateLineDifferences = useCallback((original: string, current: string) => {
    const originalLines = (original ?? '').split('\n');
    const currentLines = (current ?? '').split('\n');
    const changed: number[] = [];
    const max = Math.max(originalLines.length, currentLines.length);
    for (let i = 0; i < max; i++) {
      if ((originalLines[i] ?? '') !== (currentLines[i] ?? '')) changed.push(i + 1);
    }
    return changed;
  }, []);

  // Apply diff highlight when toggled
  useEffect(() => {
    if (!highlightDiff || !originalValue || !editor || !isEditorMounted) {
      if (changesHighlightDecorationCollectionRef.current) {
        changesHighlightDecorationCollectionRef.current.clear();
      }
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    if (changesHighlightDecorationCollectionRef.current) {
      changesHighlightDecorationCollectionRef.current.clear();
    }

    const changedLines = calculateLineDifferences(originalValue, currentValue ?? '');
    if (changedLines.length === 0) return;

    const decorations = changedLines.map((lineNumber) => ({
      range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
      options: {
        className: 'changed-line-highlight',
        isWholeLine: true,
        marginClassName: 'changed-line-margin',
      },
    }));

    changesHighlightDecorationCollectionRef.current =
      editor.createDecorationsCollection(decorations);

    return () => {
      changesHighlightDecorationCollectionRef.current?.clear();
    };
  }, [
    highlightDiff,
    originalValue,
    isEditorMounted,
    currentValue,
    calculateLineDifferences,
    editor,
  ]);

  // Return ref for cleanup purposes
  return {
    decorationCollectionRef: changesHighlightDecorationCollectionRef,
  };
};
