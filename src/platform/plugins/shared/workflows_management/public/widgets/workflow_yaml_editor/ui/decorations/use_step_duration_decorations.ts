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
import { useSelector } from 'react-redux-v7';
import { monaco } from '@kbn/monaco';
import {
  selectEditorWorkflowLookup,
  selectExecution,
  selectHighlightedStepId,
  selectStepDurationDenominator,
  selectStepDurations,
} from '../../../../entities/workflows/store';
import {
  formatStepDurationLabel,
  getDurationGutterWidth,
  getStepDurationTone,
} from '../../../../shared/lib/build_step_durations';

// The stable base class for the lane container div.
const BASE_CLASS = 'step-duration-gutter';

// Monaco's default lineDecorationsWidth (no gutter active).
const MONACO_DEFAULT_LINE_DECORATIONS_WIDTH = 10;

/**
 * Sanitises a label for safe use in a CSS `content` property.
 * Strips characters that would break out of the string literal.
 */
const sanitizeLabel = (label: string): string => label.replace(/["\\\n\r]/g, '');

/**
 * Derives a stable CSS class name from a label string, suitable for use as a BEM modifier
 * and as a key into the per-label `::before { content }` style rules.
 */
const labelClass = (label: string): string =>
  `${BASE_CLASS}-l-${label.replace(/[^a-z0-9]/gi, '-')}`;

/**
 * Shows a per-step duration chip in the Monaco lines-decorations gutter lane while an execution
 * is open in read-only mode (executions tab). The chip text, colour, and lane width are all
 * derived from the Redux store and update automatically as the execution polls.
 *
 * Returns `{ styles }` — an Emotion `css` object that must be applied to the editor wrapper so
 * that the decoration class names resolve correctly.
 */
export const useStepDurationDecorations = (editor: monaco.editor.IStandaloneCodeEditor | null) => {
  const stepDurations = useSelector(selectStepDurations);
  const denominator = useSelector(selectStepDurationDenominator);
  const workflowLookup = useSelector(selectEditorWorkflowLookup);
  const highlightedStepId = useSelector(selectHighlightedStepId);
  const execution = useSelector(selectExecution);

  const { euiTheme } = useEuiTheme();
  const { colors, border } = euiTheme;

  // Memoize the decoration collection — re-created only when the editor instance changes.
  const decorationsCollection = useMemo(() => {
    if (!editor) return null;
    return editor.createDecorationsCollection();
  }, [editor]);

  // Effect 1 — update decoration objects whenever execution data or highlighted step changes.
  useEffect(() => {
    decorationsCollection?.clear();

    if (!stepDurations.size || !workflowLookup?.steps) return;

    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    for (const [stepId, duration] of stepDurations) {
      const stepInfo = workflowLookup.steps[stepId];
      const label = duration.hasDuration ? formatStepDurationLabel(duration) : '';

      if (duration.hasDuration && stepInfo && label) {
        const tone = getStepDurationTone(duration.totalMs, denominator);
        const isDimmed = !!highlightedStepId && highlightedStepId !== stepId;

        const classNames = [BASE_CLASS, `${BASE_CLASS}-${tone}`, labelClass(label)];
        if (isDimmed) classNames.push('dimmed');

        // Single-line range only: a multi-line range repeats the decoration on every line.
        decorations.push({
          range: new monaco.Range(stepInfo.lineStart, 1, stepInfo.lineStart, 1),
          options: { linesDecorationsClassName: classNames.join(' ') },
        });
      }
    }

    decorationsCollection?.set(decorations);
  }, [decorationsCollection, stepDurations, workflowLookup, denominator, highlightedStepId]);

  // Effect 2 — manage lane width, monotonically per execution id.
  // We track the widest width seen for the current execution id and never shrink it, so a live
  // run only nudges the code area right; it never shifts it back.
  const maxWidthRef = useRef(MONACO_DEFAULT_LINE_DECORATIONS_WIDTH);
  const lastExecutionIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!editor) return;

    // Reset monotonic tracking when the user opens a different execution.
    if (execution?.id !== lastExecutionIdRef.current) {
      lastExecutionIdRef.current = execution?.id;
      maxWidthRef.current = MONACO_DEFAULT_LINE_DECORATIONS_WIDTH;
    }

    if (!stepDurations.size) {
      editor.updateOptions({ lineDecorationsWidth: MONACO_DEFAULT_LINE_DECORATIONS_WIDTH });
      return;
    }

    const labels: string[] = [];
    for (const [, duration] of stepDurations) {
      if (duration.hasDuration) {
        const lbl = formatStepDurationLabel(duration);
        if (lbl) labels.push(lbl);
      }
    }

    const needed = getDurationGutterWidth(labels);
    if (needed > maxWidthRef.current) {
      maxWidthRef.current = needed;
    }

    editor.updateOptions({ lineDecorationsWidth: maxWidthRef.current });

    return () => {
      editor.updateOptions({ lineDecorationsWidth: MONACO_DEFAULT_LINE_DECORATIONS_WIDTH });
    };
  }, [editor, execution?.id, stepDurations]);

  // Build styles: one rule for each distinct label present (content injection),
  // plus the shared layout and tone modifiers.
  const styles = useMemo(() => {
    const contentRules: Record<string, object> = {};

    for (const [, duration] of stepDurations) {
      if (duration.hasDuration) {
        const raw = formatStepDurationLabel(duration);
        if (raw) {
          const safe = sanitizeLabel(raw);
          const cls = `.${labelClass(raw)}::before`;
          contentRules[cls] = { content: `"${safe}"` };
        }
      }
    }

    const isActive = stepDurations.size > 0;

    return css({
      // Lane container — layout only, no visible style of its own.
      [`.${BASE_CLASS}`]: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'flex-start', // keeps chip on the first line of a word-wrapped `- name:`
        paddingRight: '6px',
        overflow: 'hidden',
        pointerEvents: 'none',
      },

      // Chip — the `::before` pseudo-element on the lane div.
      [`.${BASE_CLASS}::before`]: {
        fontSize: '11px',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        padding: '0 4px',
        borderRadius: border.radius.small,
        lineHeight: '23px', // matches WORKFLOW_MONACO_LAYOUT_OPTIONS.lineHeight
        color: colors.textSubdued,
      },

      // Tone modifiers — opaque chip so the colour stands out from the status band behind it.
      [`.${BASE_CLASS}-warning::before`]: {
        backgroundColor: colors.backgroundLightWarning,
        color: colors.textWarning,
      },
      [`.${BASE_CLASS}-danger::before`]: {
        backgroundColor: colors.backgroundLightDanger,
        color: colors.textDanger,
      },

      // Per-label content injection. Built inline so Emotion owns insertion/cleanup.
      ...contentRules,

      // Folding chevron: clamp to its reserved 16px so it does not overlap the right-aligned chip.
      // `max-width` constrains an inline `width` without `!important`.
      // Active only while the gutter is shown to avoid changing the editor appearance at rest.
      ...(isActive && {
        '.cldr[class*="codicon-folding-"]': {
          maxWidth: '16px',
        },
      }),
    });
  }, [stepDurations, colors, border]);

  return { styles };
};
