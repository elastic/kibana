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
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import {
  selectEditorWorkflowLookup,
  selectExecution,
  selectHighlightedStepId,
  selectIsEditorYamlExecutionSnapshot,
  selectStepDurationDenominator,
  selectStepDurations,
} from '../../../../entities/workflows/store';
import type { StepDuration } from '../../../../shared/lib/build_step_durations';
import {
  formatStepDurationLabel,
  getDurationGutterWidth,
  getStepDurationTone,
} from '../../../../shared/lib/build_step_durations';
import { formatDuration } from '../../../../shared/lib/format_duration';

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
 * Derives a collision-free CSS class name from a label string, suitable for use as a BEM modifier
 * and as a key into the per-label `::before { content }` style rules.
 *
 * The label is hex-encoded rather than pattern-replaced so that distinct labels can never produce
 * the same class (`<1ms` and `~1ms` both collapse to the same string under a naive replace, which
 * makes one chip render the other step's text).
 */
const labelClass = (label: string): string =>
  `${BASE_CLASS}-l-${Array.from(label, (c) => (c.codePointAt(0) ?? 0).toString(16)).join('')}`;

/**
 * Shows a per-step duration chip in the Monaco lines-decorations gutter lane while an execution
 * is open (executions tab, or after running a test from the workflow tab while the YAML still
 * matches the snapshot). The chip text, colour, and lane width are all derived from the Redux
 * store and update automatically as the execution polls. Chips are hidden when the editor content
 * has diverged from the execution snapshot (`selectIsEditorYamlExecutionSnapshot` is false).
 * For terminal executions with more step docs than the UI page budget, `loadExecutionThunk`
 * fetches up to `WORKFLOW_EXECUTION_STEPS_MAX_PAGE_SIZE` (5000) docs for duration computation
 * only; chips therefore cover all steps for the vast majority of real executions.
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
  const isExecutionSnapshot = useSelector(selectIsEditorYamlExecutionSnapshot);

  const { euiTheme } = useEuiTheme();
  const { colors, border } = euiTheme;

  // Chips are only meaningful when the editor content is the exact snapshot the execution ran,
  // so that line positions from the execution's computed lookup still align with the editor.
  const isActive = stepDurations.size > 0 && isExecutionSnapshot;

  // Memoize the decoration collection — re-created only when the editor instance changes.
  const decorationsCollection = useMemo(() => {
    if (!editor) return null;
    return editor.createDecorationsCollection();
  }, [editor]);

  // Effect 1 — update decoration objects whenever execution data or highlighted step changes.
  useEffect(() => {
    decorationsCollection?.clear();

    if (!isActive || !workflowLookup?.steps) return;

    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    for (const [stepId, duration] of stepDurations) {
      const stepInfo = workflowLookup.steps[stepId];
      const label = duration.hasDuration ? formatStepDurationLabel(duration) : '';

      if (duration.hasDuration && stepInfo && label) {
        const tone = getStepDurationTone(duration.totalMs, denominator);
        const isDimmed = !!highlightedStepId && highlightedStepId !== stepId;

        const classNames = [BASE_CLASS, `${BASE_CLASS}-${tone}`, labelClass(label)];
        if (isDimmed) classNames.push('dimmed');

        // Point range: linesDecorationsClassName on a multi-line range repeats the chip on
        // every wrapped line, so we keep this at (n,1,n,1).
        decorations.push({
          range: new monaco.Range(stepInfo.lineStart, 1, stepInfo.lineStart, 1),
          options: { linesDecorationsClassName: classNames.join(' ') },
        });
      }
    }

    decorationsCollection?.set(decorations);
  }, [
    decorationsCollection,
    isActive,
    stepDurations,
    workflowLookup,
    denominator,
    highlightedStepId,
  ]);

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

    if (!isActive) {
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
  }, [editor, execution?.id, isActive, stepDurations]);

  // Effect 3 — chip-hover tooltip.
  // Monaco's gutter area (lines-decorations lane) has no native hover API and is clipped by
  // `overflow: hidden`, so CSS ::after tooltips don't work there. Instead we use Monaco's own
  // mouse-move event (which fires even through pointer-events:none children) to detect when the
  // cursor is over the GUTTER_LINE_DECORATIONS area and show a position:fixed div on document.body.
  useEffect(() => {
    if (!editor || !isActive) return;

    // Build a lineStart → StepDuration map for the steps that need a tooltip.
    const lineTooltip = new Map<number, StepDuration>();
    for (const [stepId, duration] of stepDurations) {
      if (duration.runCount > 1 && duration.hasDuration) {
        const stepInfo = workflowLookup?.steps[stepId];
        if (stepInfo) lineTooltip.set(stepInfo.lineStart, duration);
      }
    }

    if (!lineTooltip.size) return;

    const tipEl = document.createElement('div');
    // position:fixed escapes Monaco's overflow:hidden margin container.
    Object.assign(tipEl.style, {
      position: 'fixed',
      zIndex: '10000',
      pointerEvents: 'none',
      display: 'none',
      padding: '4px 8px',
      borderRadius: border.radius.small,
      fontSize: '12px',
      fontFamily: 'monospace',
      whiteSpace: 'nowrap',
      backgroundColor: colors.backgroundBaseHighlighted,
      color: colors.textParagraph,
      border: `1px solid ${colors.borderBasePlain}`,
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    });
    document.body.appendChild(tipEl);

    const moveDisposable = editor.onMouseMove((e) => {
      const isGutter = e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS;
      const line = e.target.position?.lineNumber;
      const duration = isGutter && line != null ? lineTooltip.get(line) : undefined;

      if (duration) {
        const avg = formatDuration(Math.round(duration.totalMs / duration.runCount)).trim();
        const minStr = formatDuration(duration.minMs).trim();
        const maxStr = formatDuration(duration.maxMs).trim();

        const runsLabel = i18n.translate(
          'workflows.workflowYamlEditor.stepDurationGutter.tooltip.runs',
          {
            defaultMessage: '{count} completed {count, plural, one {run} other {runs}}',
            values: { count: duration.runCount },
          }
        );
        const avgLabel = i18n.translate(
          'workflows.workflowYamlEditor.stepDurationGutter.tooltip.avg',
          {
            defaultMessage: 'Average duration per run: {duration}',
            values: { duration: avg },
          }
        );
        const minMaxLabel = i18n.translate(
          'workflows.workflowYamlEditor.stepDurationGutter.tooltip.minMax',
          {
            defaultMessage: 'Min {min} · Max {max}',
            values: { min: minStr, max: maxStr },
          }
        );

        const bold = document.createElement('strong');
        bold.textContent = runsLabel;
        tipEl.replaceChildren(
          bold,
          document.createElement('br'),
          document.createTextNode(avgLabel),
          document.createElement('br'),
          document.createTextNode(minMaxLabel)
        );
        tipEl.style.display = 'block';
        // Clamp position so the tooltip never escapes the viewport.
        const { width: tipW, height: tipH } = tipEl.getBoundingClientRect();
        const margin = 8;
        const cx = e.event.browserEvent.clientX;
        const cy = e.event.browserEvent.clientY;
        const rawLeft = cx + 12;
        const rawTop = cy + 12;
        const clampedLeft = Math.min(rawLeft, window.innerWidth - tipW - margin);
        // Flip above the cursor when there is not enough room below.
        const clampedTop = rawTop + tipH + margin > window.innerHeight ? cy - tipH - 12 : rawTop;
        tipEl.style.left = `${Math.max(margin, clampedLeft)}px`;
        tipEl.style.top = `${Math.max(margin, clampedTop)}px`;
      } else {
        tipEl.style.display = 'none';
      }
    });

    const leaveDisposable = editor.onMouseLeave(() => {
      tipEl.style.display = 'none';
    });

    // Hide when the editor scrolls with a stationary pointer — `onMouseMove` does not fire in
    // that case, so the fixed tooltip would otherwise stay pinned next to the wrong step.
    const scrollDisposable = editor.onDidScrollChange(() => {
      tipEl.style.display = 'none';
    });

    return () => {
      moveDisposable.dispose();
      leaveDisposable.dispose();
      scrollDisposable.dispose();
      if (document.body.contains(tipEl)) document.body.removeChild(tipEl);
    };
  }, [editor, isActive, stepDurations, workflowLookup, colors, border]);

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

    return css({
      // Lane container — layout only, no visible style of its own.
      [`.${BASE_CLASS}`]: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'flex-start', // keeps chip on the first line of a word-wrapped `- name:`
        // 16px left padding ensures chip text never overlaps the folding chevron that Monaco
        // renders at the left edge of the lines-decorations lane.
        paddingLeft: '16px',
        paddingRight: '4px',
        overflow: 'hidden',
        pointerEvents: 'none',
      },

      // Chip — the `::before` pseudo-element on the lane div.
      [`.${BASE_CLASS}::before`]: {
        fontSize: '11px',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        padding: '0 3px',
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
    });
  }, [stepDurations, colors, border]);

  return { styles };
};
