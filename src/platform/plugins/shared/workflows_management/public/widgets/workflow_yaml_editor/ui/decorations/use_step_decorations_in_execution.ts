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
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { monaco } from '@kbn/monaco';
import {
  selectHighlightedStepId,
  selectStepExecutions,
  selectWorkflowLookup,
} from '../../lib/store';

export const useStepDecorationsInExecution = (
  editor: monaco.editor.IStandaloneCodeEditor | null
) => {
  const stepExecutions = useSelector(selectStepExecutions);
  const workflowLookup = useSelector(selectWorkflowLookup);
  const highlightedStepId = useSelector(selectHighlightedStepId);
  const decorationsCollection = useMemo(() => {
    if (!editor) {
      return null;
    }
    return editor.createDecorationsCollection();
  }, [editor]);

  useEffect(() => {
    decorationsCollection?.clear();

    if (!stepExecutions?.length) {
      return;
    }

    const decorations = stepExecutions.flatMap((stepExecution) => {
      const stepInfo = workflowLookup?.steps[stepExecution.stepId];

      if (!stepInfo) {
        return [];
      }
      // Glyph decoration for status icon - position at the dash line
      const glyphDecoration: monaco.editor.IModelDeltaDecoration = {
        range: new monaco.Range(
          stepInfo.lineStart,
          1, // Start at column 1 for consistent glyph positioning
          stepInfo.lineStart,
          1 // End at column 1 for single-point positioning
        ),
        options: {
          glyphMarginClassName: `step-execution-${stepExecution.status}-glyph ${
            !!highlightedStepId && highlightedStepId !== stepExecution.stepId ? 'dimmed' : ''
          }`,
        },
      };
      // Background decoration for execution status - from dash line to end of step
      const bgClassName = `step-execution-${stepExecution.status} ${
        !!highlightedStepId && highlightedStepId !== stepExecution.stepId ? 'dimmed' : ''
      }`;
      const backgroundDecoration: monaco.editor.IModelDeltaDecoration = {
        range: new monaco.Range(
          stepInfo.lineStart, // Start from the dash line
          1, // Start at column 1
          stepInfo.lineEnd,
          0
        ),
        options: {
          className: bgClassName,
          marginClassName: bgClassName,
          isWholeLine: true,
        },
      };

      return [glyphDecoration, backgroundDecoration];
    });
    decorationsCollection?.set(decorations);
  }, [stepExecutions, decorationsCollection, workflowLookup, highlightedStepId]);

  const theme = useEuiTheme();
  const styles = useMemo(
    () =>
      css({
        '.step-execution-skipped': {
          backgroundColor: theme.euiTheme.colors.backgroundBaseFormsControlDisabled,
        },
        '.step-execution-waiting_for_input': {
          backgroundColor: theme.euiTheme.colors.backgroundLightWarning,
        },
        '.step-execution-running': {
          backgroundColor: theme.euiTheme.colors.backgroundLightPrimary,
        },
        '.step-execution-completed': {
          backgroundColor: theme.euiTheme.colors.backgroundLightSuccess,
        },
        '.step-execution-failed': {
          backgroundColor: theme.euiTheme.colors.backgroundLightDanger,
        },
        '.step-execution-skipped-glyph': {
          '&:before': {
            content: '""',
            display: 'block',
            width: '12px',
            height: '12px',
            backgroundColor: theme.euiTheme.colors.backgroundFilledText,
            borderRadius: '50%',
          },
        },
        '.step-execution-waiting_for_input-glyph': {
          '&:before': {
            content: '""',
            display: 'block',
            width: '12px',
            height: '12px',
            backgroundColor: theme.euiTheme.colors.backgroundFilledWarning,
            borderRadius: '50%',
          },
        },
        '.step-execution-running-glyph': {
          '&:before': {
            content: '""',
            display: 'block',
            width: '12px',
            height: '12px',
            backgroundColor: theme.euiTheme.colors.backgroundFilledPrimary,
            borderRadius: '50%',
          },
        },
        '.step-execution-completed-glyph': {
          '&:before': {
            content: '""',
            display: 'block',
            width: '12px',
            height: '12px',
            backgroundColor: theme.euiTheme.colors.vis.euiColorVis0,
            borderRadius: '50%',
          },
        },
        '.step-execution-failed-glyph': {
          '&:before': {
            content: '""',
            display: 'block',
            width: '12px',
            height: '12px',
            backgroundColor: theme.euiTheme.colors.danger,
            borderRadius: '50%',
          },
        },
      }),
    [theme]
  );

  return { styles };
};
