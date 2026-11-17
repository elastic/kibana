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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
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

interface BreakpointLookupStep {
  stepType: string;
  parentStepId?: string;
}

/**
 * True when a breakpoint can be set on the step. Steps nested in a `parallel` branch are excluded
 * because the engine does not pause there.
 */
export const canSetBreakpointOnStep = (
  step: BreakpointLookupStep | undefined,
  steps: Readonly<Record<string, BreakpointLookupStep>> | undefined
): boolean => {
  if (!step || !isBreakpointSupportedStepType(step.stepType)) {
    return false;
  }
  let parentStepId = step.parentStepId;
  while (parentStepId) {
    const parent = steps?.[parentStepId];
    if (!parent) {
      return true;
    }
    if (parent.stepType === 'parallel') {
      return false;
    }
    parentStepId = parent.parentStepId;
  }
  return true;
};

/**
 * Marks the tooltip so the global hover overrides can size it compactly. Monaco's markdown
 * sanitizer strips `class`, so an allowed attribute (`data-code`, only read on `div`) is used.
 */
const toBreakpointTooltip = (text: string): monaco.IMarkdownString => ({
  value: `<span data-code="step-breakpoint-tooltip">${text}</span>`,
  supportHtml: true,
});

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
  const [hoveredLineNumber, setHoveredLineNumber] = useState<number | null>(null);
  const breakpointLines = useMemo(() => {
    const steps = workflowLookup?.steps ?? {};
    return new Set(
      Object.values(steps)
        .filter((step) => canSetBreakpointOnStep(step, steps))
        .map((step) => step.lineStart)
    );
  }, [workflowLookup]);
  const breakpointLinesRef = useRef(breakpointLines);
  breakpointLinesRef.current = breakpointLines;

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

    const setBreakpointHoverMessage = toBreakpointTooltip(
      i18n.translate('workflows.workflowDetail.yamlEditor.setBreakpointTooltip', {
        defaultMessage: 'Set breakpoint',
      })
    );
    const removeBreakpointHoverMessage = toBreakpointTooltip(
      i18n.translate('workflows.workflowDetail.yamlEditor.removeBreakpointTooltip', {
        defaultMessage: 'Remove breakpoint',
      })
    );
    const breakpointSet = new Set(breakpoints);
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    for (const [stepId, stepInfo] of Object.entries(workflowLookup.steps)) {
      if (canSetBreakpointOnStep(stepInfo, workflowLookup.steps)) {
        const range = {
          startLineNumber: stepInfo.lineStart,
          startColumn: 1,
          endLineNumber: stepInfo.lineStart,
          endColumn: 1,
        };
        if (breakpointSet.has(stepId)) {
          // Glyph is a separate non-whole-line decoration so it renders once on wrapped lines.
          decorations.push(
            {
              range,
              options: {
                glyphMarginClassName: 'step-breakpoint-glyph',
                glyphMarginHoverMessage: removeBreakpointHoverMessage,
              },
            },
            {
              range,
              options: {
                isWholeLine: true,
                className: 'step-breakpoint-line',
                marginClassName: 'step-breakpoint-margin',
              },
            }
          );
        } else {
          const isLineHovered = stepInfo.lineStart === hoveredLineNumber;
          decorations.push({
            range,
            options: {
              glyphMarginClassName: isLineHovered
                ? 'step-breakpoint-hover-target step-breakpoint-hover-active'
                : 'step-breakpoint-hover-target',
              glyphMarginHoverMessage: setBreakpointHoverMessage,
            },
          });
        }
      }
    }

    decorationsCollection?.set(decorations);
  }, [isExecutionsTab, breakpoints, workflowLookup, decorationsCollection, hoveredLineNumber]);

  useEffect(() => {
    if (!editor || !isEditorMounted) {
      return;
    }

    // Only step header lines are tracked, so moving across other lines does not re-render the editor.
    const mouseMoveDisposable = editor.onMouseMove((event) => {
      const lineNumber = event.target.position?.lineNumber;
      setHoveredLineNumber(
        !isExecutionsTabRef.current && lineNumber && breakpointLinesRef.current.has(lineNumber)
          ? lineNumber
          : null
      );
    });
    const mouseLeaveDisposable = editor.onMouseLeave(() => setHoveredLineNumber(null));

    return () => {
      mouseMoveDisposable.dispose();
      mouseLeaveDisposable.dispose();
    };
  }, [editor, isEditorMounted]);

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
        (step) => step.lineStart === lineNumber && canSetBreakpointOnStep(step, steps)
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
          backgroundColor: transparentize(colors.warning, 0.1),
          boxShadow: `inset 2px 0 0 0 ${colors.warning}`,
        },
        '.step-breakpoint-margin': {
          backgroundColor: transparentize(colors.warning, 0.1),
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
          backgroundColor: colors.warning,
          boxShadow: `0 0 0 2px ${transparentize(colors.warning, 0.25)}`,
        },
        '.step-breakpoint-hover-target:hover:before, .step-breakpoint-hover-active:before': {
          content: '""',
          display: 'block',
          width: '9px',
          height: '9px',
          borderRadius: '50%',
          backgroundColor: transparentize(colors.warning, 0.4),
        },
      }),
    [colors]
  );

  return { styles };
};
