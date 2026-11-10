/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { monaco } from '@kbn/code-editor';
import {
  selectBreakpoints,
  selectEditorWorkflowLookup,
  selectIsExecutionsTab,
  toggleBreakpoint,
} from '../../../../entities/workflows/store';

export const useBreakpointDecorations = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  isEditorMounted: boolean
) => {
  const dispatch = useDispatch();
  const isExecutionsTab = useSelector(selectIsExecutionsTab);
  const breakpoints = useSelector(selectBreakpoints);
  const workflowLookup = useSelector(selectEditorWorkflowLookup);
  const workflowLookupRef = useRef(workflowLookup);
  workflowLookupRef.current = workflowLookup;
  const isExecutionsTabRef = useRef(isExecutionsTab);
  isExecutionsTabRef.current = isExecutionsTab;

  const decorationsCollection = useMemo(() => {
    if (!editor) {
      return null;
    }
    return editor.createDecorationsCollection();
  }, [editor]);

  useEffect(() => {
    decorationsCollection?.clear();

    if (isExecutionsTab || !breakpoints.length || !workflowLookup?.steps) {
      return;
    }

    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    for (const stepId of breakpoints) {
      const stepInfo = workflowLookup.steps[stepId];
      if (stepInfo) {
        decorations.push({
          range: new monaco.Range(stepInfo.lineStart, 1, stepInfo.lineStart, 1),
          options: {
            glyphMarginClassName: 'step-breakpoint-glyph',
          },
        });
      }
    }

    decorationsCollection?.set(decorations);
  }, [isExecutionsTab, breakpoints, workflowLookup, decorationsCollection]);

  useEffect(() => {
    if (!editor || !isEditorMounted) {
      return;
    }

    const disposable = editor.onMouseDown((event) => {
      if (isExecutionsTabRef.current) {
        return;
      }
      if (
        event.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        event.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        return;
      }
      const lineNumber = event.target.position?.lineNumber;
      const steps = workflowLookupRef.current?.steps;
      if (!lineNumber || !steps) {
        return;
      }
      const matchedStep = Object.values(steps).find((step) => step.lineStart === lineNumber);
      if (matchedStep) {
        dispatch(toggleBreakpoint(matchedStep.stepId));
      }
    });

    return () => disposable.dispose();
  }, [editor, isEditorMounted, dispatch]);

  const { colors } = useEuiTheme().euiTheme;
  const styles = useMemo(
    () =>
      css({
        '.step-breakpoint-glyph': {
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        '.step-breakpoint-glyph:before': {
          content: '""',
          display: 'block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: colors.danger,
        },
      }),
    [colors]
  );

  return { styles };
};
