/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { monaco } from '@kbn/monaco';
import { selectFocusedStepInfo } from '../../../../entities/workflows/store';

export const useFocusedStepOutline = (editor: monaco.editor.IStandaloneCodeEditor | null) => {
  const focusedStepInfo = useSelector(selectFocusedStepInfo);

  const scrollbarWidth = '24px';
  const styles = useMemo(
    () =>
      css({
        // Dev Console-style step highlighting (block border approach)
        '.workflow-step-selected-single': {
          backgroundColor: 'rgba(0, 120, 212, 0.02)',
          border: `1px solid #0078d4`, // Explicit blue color
          borderLeft: `1px solid #0078d4`, // Explicit blue color
          borderRadius: '4px',
          boxShadow: `0 1px 3px rgba(0, 120, 212, 0.1)`,
          position: 'relative', // Enable relative positioning for action buttons
          width: `calc(100% - ${scrollbarWidth}) !important`, // To add a space between decoration and the scrollbar
        },
        '.workflow-step-selected-first': {
          backgroundColor: 'rgba(0, 120, 212, 0.02)',
          borderTop: `1px solid #0078d4`, // Explicit blue color
          borderLeft: `1px solid #0078d4`, // Explicit blue color
          borderRight: `1px solid #0078d4`, // Explicit blue color
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          position: 'relative', // Enable relative positioning for action buttons
          width: `calc(100% - ${scrollbarWidth}) !important`, // To add a space between decoration and the scrollbar
        },
        '.workflow-step-selected-middle': {
          backgroundColor: 'rgba(0, 120, 212, 0.02)',
          borderLeft: `1px solid #0078d4`, // Left border to connect with first/last
          borderRight: `1px solid #0078d4`, // Right border to connect with first/last
          width: `calc(100% - ${scrollbarWidth}) !important`, // To add a space between decoration and the scrollbar
        },
        '.workflow-step-selected-last': {
          backgroundColor: 'rgba(0, 120, 212, 0.02)',
          borderBottom: `1px solid #0078d4`, // Explicit blue color
          borderLeft: `1px solid #0078d4`, // Explicit blue color
          borderRight: `1px solid #0078d4`, // Explicit blue color
          borderBottomLeftRadius: '4px',
          borderBottomRightRadius: '4px',
          boxShadow: `0 1px 3px rgba(0, 120, 212, 0.1)`,
          width: `calc(100% - ${scrollbarWidth}) !important`, // To add a space between decoration and the scrollbar
        },
      }),
    []
  );

  const decorationsCollection = useMemo(() => {
    if (!editor) {
      return null;
    }
    return editor.createDecorationsCollection();
  }, [editor]);

  useEffect(() => {
    if (!editor || !decorationsCollection) {
      return;
    }
    decorationsCollection.clear();

    if (!focusedStepInfo) {
      return;
    }

    // Create Dev Console-style decoration (single block border)
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    // Get step range using shared utility

    for (
      let lineNumber = focusedStepInfo.lineStart;
      lineNumber <= focusedStepInfo.lineEnd;
      lineNumber++
    ) {
      const isFirstLine = lineNumber === focusedStepInfo.lineStart;
      const isLastLine = lineNumber === focusedStepInfo.lineEnd;
      const isSingleLine = focusedStepInfo.lineStart === focusedStepInfo.lineEnd;
      let className = 'workflow-step-selected-middle';
      if (isSingleLine) {
        className = 'workflow-step-selected-single';
      } else if (isFirstLine) {
        className = 'workflow-step-selected-first';
      } else if (isLastLine) {
        className = 'workflow-step-selected-last';
      }
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          className,
          isWholeLine: true,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    }

    decorationsCollection.set(decorations);
  }, [editor, focusedStepInfo, decorationsCollection]);

  return { styles };
};
