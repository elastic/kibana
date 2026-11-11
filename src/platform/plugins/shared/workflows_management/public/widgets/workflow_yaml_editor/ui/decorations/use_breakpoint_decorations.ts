/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { monaco } from '@kbn/code-editor';
import { BuiltInStepTypes } from '@kbn/workflows';
import {
  selectBreakpoints,
  selectEditorWorkflowLookup,
  selectIsExecutionsTab,
  toggleBreakpoint,
} from '../../../../entities/workflows/store';

/**
 * True when a step's own type supports breakpoints (i.e. runs via `BaseAtomicNodeImplementation`).
 * Structural container headers (`if`, `foreach`, `while`, `switch`, `parallel`, etc.) do not pause
 * themselves, while atomic steps nested *inside* them have their own `stepType` and ARE supported.
 */
export const isBreakpointSupportedStepType = (stepType: string | undefined): boolean =>
  typeof stepType === 'string' &&
  stepType.length > 0 &&
  (stepType === 'data.set' || !(BuiltInStepTypes as readonly string[]).includes(stepType));

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

    if (isExecutionsTab || !workflowLookup?.steps) {
      return;
    }

    const breakpointSet = new Set(breakpoints);
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    for (const [stepId, stepInfo] of Object.entries(workflowLookup.steps)) {
      if (isBreakpointSupportedStepType(stepInfo.stepType)) {
        const range = {
          startLineNumber: stepInfo.lineStart,
          startColumn: 1,
          endLineNumber: stepInfo.lineStart,
          endColumn: 1,
        };
        if (breakpointSet.has(stepId)) {
          decorations.push({
            range,
            options: {
              isWholeLine: true,
              className: 'step-breakpoint-line',
              marginClassName: 'step-breakpoint-margin',
              glyphMarginClassName: 'step-breakpoint-glyph',
            },
          });
        } else {
          decorations.push({
            range,
            options: {
              glyphMarginClassName: 'step-breakpoint-hover-target',
            },
          });
        }
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
      const matchedStep = Object.values(steps).find(
        (step) => step.lineStart === lineNumber && isBreakpointSupportedStepType(step.stepType)
      );
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
        '.step-breakpoint-line': {
          backgroundColor: transparentize(colors.danger, 0.1),
          boxShadow: `inset 2px 0 0 0 ${colors.danger}`,
        },
        '.step-breakpoint-margin': {
          backgroundColor: transparentize(colors.danger, 0.1),
        },
        '.step-breakpoint-glyph, .step-breakpoint-hover-target': {
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        '.step-breakpoint-glyph:before': {
          content: '""',
          display: 'block',
          width: '9px',
          height: '9px',
          borderRadius: '50%',
          backgroundColor: colors.danger,
          boxShadow: `0 0 0 2px ${transparentize(colors.danger, 0.25)}`,
        },
        '.step-breakpoint-hover-target:hover:before': {
          content: '""',
          display: 'block',
          width: '9px',
          height: '9px',
          borderRadius: '50%',
          backgroundColor: transparentize(colors.danger, 0.4),
        },
      }),
    [colors]
  );

  return { styles };
};
