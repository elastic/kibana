/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux-v7';
import { monaco } from '@kbn/monaco';
import { useStepHighlightBlockClass } from './use_step_highlight_block_class';
import {
  selectEditorFocusedStepInfo,
  selectEditorFocusedTriggerInfo,
} from '../../../../entities/workflows/store';

export interface StepLineRange {
  lineStart: number;
  lineEnd: number;
}

/**
 * Draws the border + shadow block around the focused step.
 * When `overrideRange` is set (e.g. right after inserting a step), that range
 * takes precedence so the highlight appears before workflowLookup catches up.
 */
export const useFocusedStepDecoration = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  overrideRange?: StepLineRange | null
) => {
  const focusedStepInfo = useSelector(selectEditorFocusedStepInfo);
  const focusedTriggerInfo = useSelector(selectEditorFocusedTriggerInfo);
  const focusedInfo = focusedStepInfo ?? focusedTriggerInfo;
  const blockClassName = useStepHighlightBlockClass();

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

    const range = overrideRange
      ? overrideRange
      : focusedInfo
      ? { lineStart: focusedInfo.lineStart, lineEnd: focusedInfo.lineEnd }
      : null;

    if (!range) {
      decorationsCollection.clear();
      return;
    }

    decorationsCollection.set([
      {
        range: new monaco.Range(range.lineStart, 1, range.lineEnd, 1),
        options: {
          blockClassName,
          isWholeLine: true,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      },
    ]);
  }, [editor, focusedInfo, overrideRange, blockClassName, decorationsCollection]);

  // Cleanup effect: only clears decorations on unmount or when
  // editor/decorationsCollection changes, avoiding unnecessary clears
  // during normal focusedStepInfo or blockClassName updates.
  useEffect(() => {
    if (!decorationsCollection) {
      return;
    }

    return () => {
      decorationsCollection.clear();
    };
  }, [decorationsCollection]);
};
