/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { css as cssClassName } from '@emotion/css';
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { monaco } from '@kbn/monaco';
import { selectEditorFocusedStepInfo } from '../../../../entities/workflows/store';
import { FOCUSED_STEP_DECORATION_INSET_PX } from '../../styles/constants';

export const useFocusedStepDecoration = (editor: monaco.editor.IStandaloneCodeEditor | null) => {
  const focusedStepInfo = useSelector(selectEditorFocusedStepInfo);
  const { euiTheme } = useEuiTheme();

  const borderColor = euiTheme.colors.vis.euiColorVis2;
  const shadowSmall = useEuiShadow('s');

  const blockClassName = useMemo(
    () =>
      // we use the pseudo-element to control the size of the decoration
      // setting width with calc won't work, since decorations parent has a size 0x0
      cssClassName`
        position: relative;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: ${FOCUSED_STEP_DECORATION_INSET_PX}px;
          border: 1px solid ${borderColor};
          border-radius: 4px;
          ${shadowSmall}
          background-color: ${transparentize(borderColor, 0.02)};
          pointer-events: none;
      }`,
    [borderColor, shadowSmall]
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
  }, [editor, focusedStepInfo, blockClassName, decorationsCollection]);

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
