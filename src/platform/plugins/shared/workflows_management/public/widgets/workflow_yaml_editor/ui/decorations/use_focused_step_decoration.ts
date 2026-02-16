/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css as cssClassName } from '@emotion/css';
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { monaco } from '@kbn/monaco';
import { selectEditorFocusedStepInfo } from '../../../../entities/workflows/store';

export const useFocusedStepDecoration = (editor: monaco.editor.IStandaloneCodeEditor | null) => {
  const focusedStepInfo = useSelector(selectEditorFocusedStepInfo);

  const blockClassName = useMemo(
    () =>
      cssClassName`
        position: relative;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 4px;
          border: 1px solid #0078d4;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0, 120, 212, 0.1);
          background-color: rgba(0, 120, 212, 0.02);
          pointer-events: none; /* Ensures the pseudo-element doesn't block interactions */
      }`,
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

    if (!focusedStepInfo) {
      decorationsCollection.clear();
      return;
    }

    decorationsCollection.set([
      {
        range: new monaco.Range(focusedStepInfo.lineStart, 1, focusedStepInfo.lineEnd, 1),
        options: {
          blockClassName,
          isWholeLine: true,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      },
    ]);

    return () => {
      decorationsCollection.clear();
    };
  }, [editor, focusedStepInfo, blockClassName, decorationsCollection]);
};
