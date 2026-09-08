/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiScreenReaderOnly, shade, transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux-v7';
import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/monaco';
import {
  selectEditorFocusedStepInfo,
  selectEditorWorkflowLookup,
  selectEditorYaml,
  selectEditorYamlDocument,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import type { YamlValidationResult } from '../../../features/validate_workflow_yaml/model/types';
import {
  buildBranchConnectors,
  buildInnerRailSegments,
  buildOuterRailSegments,
} from '../lib/minimap/connector_geometry';
import { buildNestingInfo } from '../lib/minimap/nesting_info';
import { buildStepSeverityMap } from '../lib/minimap/step_severity';
import type { StepSeverityInfo } from '../lib/minimap/step_severity';
import { computeStepStructureFingerprint } from '../lib/minimap/step_structure_fingerprint';
import { useStableByFingerprint } from '../lib/minimap/use_stable_by_fingerprint';
import { buildEffectiveLineEnd, computeViewportSteps } from '../lib/minimap/viewport_steps';
import type { VisibleLineRange } from '../lib/minimap/viewport_steps';
import {
  EDITOR_PADDING_TOP_PX,
  MINIMAP_DOT_R,
  MINIMAP_INNER_TRACK_X,
  MINIMAP_ITEM_HEIGHT,
  MINIMAP_MAX_LABEL_W,
  MINIMAP_NESTED_PILL_INDENT,
  MINIMAP_OUTER_TRACK_X,
  MINIMAP_PADDING_LEFT_PX,
  MINIMAP_PADDING_RIGHT_PX,
  MINIMAP_PILL_H,
  MINIMAP_PILL_RADIUS,
  MINIMAP_PILL_TRACK_GAP,
  MINIMAP_TRACK_W,
  MINIMAP_TRACK_X,
  MINIMAP_VIEWPORT_BORDER_RIGHT_EXTRA_PX,
} from '../styles/constants';

// Static per-step styles shared by every row — hoisted to module scope so they're
// created once instead of being rebuilt (and re-hashed by Emotion) on every render.
// Only the genuinely per-row/per-render values (position, colors, width) are computed
// inline at the call site.
const stepButtonBaseCss = css({
  position: 'absolute',
  left: 0,
  right: MINIMAP_TRACK_W + MINIMAP_PILL_TRACK_GAP,
  height: MINIMAP_ITEM_HEIGHT,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 4,
  background: 'none',
  border: 'none',
  padding: 0,
  zIndex: 1,
  cursor: 'pointer',
});

const severityDotBaseCss = css({
  width: 7,
  height: 7,
  borderRadius: '50%',
  flexShrink: 0,
  pointerEvents: 'none',
});

const pillBaseCss = css({
  display: 'inline-block',
  height: MINIMAP_PILL_H,
  lineHeight: `${MINIMAP_PILL_H}px`,
  paddingInline: '8px',
  borderRadius: MINIMAP_PILL_RADIUS,
  fontSize: '12px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  transition: 'background 0.15s ease',
  userSelect: 'none',
  pointerEvents: 'none',
});

// ── Sub-components (React.memo) ──────────────────────────────────────────────
// Extracted so a focus change re-renders 2 rows instead of rebuilding all N rows
// and re-serializing ~3 Emotion objects per row on every cursor move.

interface MinimapDotProps {
  cx: number;
  cy: number;
  isFocused: boolean;
  activeColor: string;
  dotBgColor: string;
  railColor: string;
}

const MinimapDot = React.memo(
  ({ cx, cy, isFocused, activeColor, dotBgColor, railColor }: MinimapDotProps) => (
    <circle
      cx={cx}
      cy={cy}
      r={MINIMAP_DOT_R}
      fill={isFocused ? activeColor : dotBgColor}
      stroke={isFocused ? activeColor : railColor}
      strokeWidth={2}
    />
  )
);

MinimapDot.displayName = 'MinimapDot';

interface MinimapColors {
  activeBg: string;
  activeBgHover: string;
  activeText: string;
  inactiveBg: string;
  inactiveBgHover: string;
  inactiveText: string;
  dangerColor: string;
  warningColor: string;
  fontFamily: string;
}

interface MinimapStepRowProps {
  stepId: string;
  lineStart: number;
  index: number;
  isFocused: boolean;
  severityInfo: StepSeverityInfo | null;
  isNested: boolean;
  colors: MinimapColors;
  onStepClick: (lineStart: number) => void;
}

const MinimapStepRow = React.memo(
  ({
    stepId,
    lineStart,
    index,
    isFocused,
    severityInfo,
    isNested,
    colors,
    onStepClick,
  }: MinimapStepRowProps) => {
    const pillMaxW = isNested
      ? MINIMAP_MAX_LABEL_W - MINIMAP_NESTED_PILL_INDENT
      : MINIMAP_MAX_LABEL_W;
    return (
      <button
        type="button"
        title={stepId}
        // `style` for the dynamic top position avoids creating a new Emotion css
        // object on every render; the stable stepButtonBaseCss covers everything else.
        style={{ top: index * MINIMAP_ITEM_HEIGHT }}
        onClick={(e) => {
          onStepClick(lineStart);
          // Blur only on pointer click (e.detail > 0), not on keyboard Enter/Space,
          // so Tab → Enter keeps focus on the pill and lets the user navigate further.
          if (e.detail > 0) e.currentTarget.blur();
        }}
        css={[
          stepButtonBaseCss,
          css({
            '&:hover .minimap-pill': {
              background: isFocused ? colors.activeBgHover : colors.inactiveBgHover,
            },
          }),
        ]}
      >
        {severityInfo?.severity && (
          <>
            <span
              css={[
                severityDotBaseCss,
                css({
                  backgroundColor:
                    severityInfo.severity === 'error' ? colors.dangerColor : colors.warningColor,
                }),
              ]}
            />
            <EuiScreenReaderOnly>
              <span>
                {severityInfo.isOwn
                  ? i18n.translate('workflows.stepMinimap.stepHasErrors', {
                      defaultMessage: 'has errors',
                    })
                  : i18n.translate('workflows.stepMinimap.stepContainsErrors', {
                      defaultMessage: 'contains steps with errors',
                    })}
              </span>
            </EuiScreenReaderOnly>
          </>
        )}
        <span
          className="minimap-pill"
          css={[
            pillBaseCss,
            css({
              maxWidth: pillMaxW,
              background: isFocused ? colors.activeBg : colors.inactiveBg,
              color: isFocused ? colors.activeText : colors.inactiveText,
              fontFamily: colors.fontFamily,
              fontWeight: isFocused ? 600 : 400,
            }),
          ]}
        >
          {stepId}
        </span>
      </button>
    );
  }
);

MinimapStepRow.displayName = 'MinimapStepRow';

// ── Main component ────────────────────────────────────────────────────────────

interface WorkflowStepMinimapProps {
  /** Mounted Monaco editor instance; null until `handleEditorDidMount` fires. */
  editor: monaco.editor.IStandaloneCodeEditor | null;
  validationErrors: YamlValidationResult[];
  /** The scrollable container div that wraps this minimap (owned by the parent). */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const WorkflowStepMinimap = ({
  editor,
  validationErrors,
  scrollContainerRef,
}: WorkflowStepMinimapProps) => {
  const { euiTheme } = useEuiTheme();
  const workflowLookup = useSelector(selectEditorWorkflowLookup);
  const yamlDocument = useSelector(selectEditorYamlDocument);
  const yamlString = useSelector(selectEditorYaml);
  const focusedStepInfo = useSelector(selectEditorFocusedStepInfo);

  const rawCurrent = useMemo(() => {
    const steps = workflowLookup?.steps ?? {};
    const entries = Object.entries(steps).sort(([, a], [, b]) => a.lineStart - b.lineStart);
    return { entries, steps };
  }, [workflowLookup]);

  // `workflowLookup` is recomputed (as a brand new object) on every keystroke, even when
  // the step list's shape hasn't changed. Stabilizing by a structural fingerprint means
  // the nesting/severity/geometry memos below only re-run on a real structural change,
  // not on every keystroke. The fingerprint is memoized here (not inside the hook) so
  // the O(steps) map+join runs exactly once per render, not twice.
  const fingerprint = useMemo(
    () => computeStepStructureFingerprint(rawCurrent.entries),
    [rawCurrent]
  );
  const current = useStableByFingerprint(rawCurrent, fingerprint);

  // While the user types, the YAML is often transiently unparseable and the
  // lookup collapses to nothing. Blanking the minimap on every such keystroke
  // makes it flicker, so keep the last known-good step list until the document
  // parses again. A valid document with genuinely no steps still hides it.
  // (Ref is intentionally written during render — this is a plain "sticky last
  // good value" cache, not a general escape hatch from React state.)
  const lastNonEmptyRef = useRef(current);
  if (current.entries.length > 0) {
    lastNonEmptyRef.current = current;
  }
  const isDocBroken =
    Boolean(yamlString?.trim()) && (!yamlDocument || yamlDocument.errors.length > 0);
  const { entries: stepEntries, steps: stepsMap } =
    current.entries.length === 0 && isDocBroken ? lastNonEmptyRef.current : current;

  const nestingInfo = useMemo(
    () => buildNestingInfo(stepEntries, stepsMap),
    [stepEntries, stepsMap]
  );

  // Depends only on stepEntries, not on scroll position — split out from
  // computeViewportSteps so it isn't rebuilt on every scroll frame.
  const effectiveLineEnd = useMemo(() => buildEffectiveLineEnd(stepEntries), [stepEntries]);

  // Precomputed once per [stepEntries, validationErrors, effectiveLineEnd] instead of
  // once per step per render. Now also splits own vs inherited severity for SR text,
  // while keeping the visual dot identical in both cases (roll-up is intentional).
  const severityMap = useMemo(
    () => buildStepSeverityMap(stepEntries, validationErrors, effectiveLineEnd),
    [stepEntries, validationErrors, effectiveLineEnd]
  );

  const handleStepClick = useCallback(
    (lineStart: number) => {
      if (!editor) return;
      editor.revealLineInCenter(lineStart);
      editor.setPosition({ lineNumber: lineStart, column: 1 });
      editor.focus();
    },
    [editor]
  );

  // ── Viewport tracking ─────────────────────────────────────
  const [visibleLineRange, setVisibleLineRange] = useState<VisibleLineRange | null>(null);

  useEffect(() => {
    if (!editor) return;

    let rafId: number | null = null;

    const applyVisibleRange = () => {
      rafId = null;
      const ranges = editor.getVisibleRanges();
      if (!ranges.length) return;
      const next = {
        start: ranges[0].startLineNumber,
        end: ranges[ranges.length - 1].endLineNumber,
      };
      // Scroll/cursor events fire far more often than the visible range actually
      // changes (e.g. sub-line scroll deltas); skip the state update — and the
      // resulting re-render — when it's a no-op.
      setVisibleLineRange((prev) =>
        prev && prev.start === next.start && prev.end === next.end ? prev : next
      );
    };

    // Coalesce bursts of scroll/cursor/layout events into at most one update per
    // animation frame, instead of one React render per raw event.
    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(applyVisibleRange);
    };

    scheduleUpdate();
    // Retry once after a short delay: getVisibleRanges() can return [] on the first
    // call if Monaco hasn't finished its initial layout pass yet.
    const retryTimer = setTimeout(scheduleUpdate, 150);

    const scrollDisposable = editor.onDidScrollChange(scheduleUpdate);
    const layoutDisposable = editor.onDidLayoutChange(scheduleUpdate);
    // Cursor movement fires without a scroll (e.g. clicking a step in the minimap),
    // so we need this to keep the viewport indicator in sync in those cases.
    const cursorDisposable = editor.onDidChangeCursorPosition(scheduleUpdate);
    return () => {
      clearTimeout(retryTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
      scrollDisposable.dispose();
      layoutDisposable.dispose();
      cursorDisposable.dispose();
    };
    // Re-run when the editor instance changes (e.g. after mount). The `editor` prop
    // is null until handleEditorDidMount fires, so the effect cleanly re-attaches
    // listeners once the real editor is available — no separate isEditorMounted flag needed.
  }, [editor]);

  const viewportSteps = useMemo(
    () => computeViewportSteps(stepEntries, effectiveLineEnd, visibleLineRange),
    [stepEntries, effectiveLineEnd, visibleLineRange]
  );

  // Unified minimap scroll: keep the viewport band centred and ensure the focused
  // step is visible. Only writes scrollTop when the target is out of view — this
  // prevents overriding manual minimap scrolls and stops the two former effects from
  // racing on pill click.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const visibleTop = container.scrollTop;
    const visibleBottom = container.scrollTop + container.clientHeight;

    // Priority 1: If a step is focused (e.g. from the graph view), ensure it's visible.
    if (focusedStepInfo) {
      const stepIndex = stepEntries.findIndex(([id]) => id === focusedStepInfo.stepId);
      if (stepIndex !== -1) {
        const stepTop = EDITOR_PADDING_TOP_PX + stepIndex * MINIMAP_ITEM_HEIGHT;
        const stepBottom = stepTop + MINIMAP_ITEM_HEIGHT;
        if (stepTop < visibleTop || stepBottom > visibleBottom) {
          container.scrollTop = Math.max(
            0,
            stepTop + MINIMAP_ITEM_HEIGHT / 2 - container.clientHeight / 2
          );
          return;
        }
      }
    }

    // Priority 2: Keep the viewport band centred when it's outside the minimap's view.
    if (!viewportSteps) return;
    const bandTop = EDITOR_PADDING_TOP_PX + viewportSteps.first * MINIMAP_ITEM_HEIGHT;
    const bandBottom = EDITOR_PADDING_TOP_PX + (viewportSteps.last + 1) * MINIMAP_ITEM_HEIGHT;
    if (bandTop >= visibleTop && bandBottom <= visibleBottom) return;
    const bandCenterY =
      EDITOR_PADDING_TOP_PX +
      ((viewportSteps.first + viewportSteps.last) / 2 + 0.5) * MINIMAP_ITEM_HEIGHT;
    container.scrollTop = Math.max(0, bandCenterY - container.clientHeight / 2);
  }, [scrollContainerRef, viewportSteps, focusedStepInfo, stepEntries]);

  // Theme-derived colors, recomputed only when the theme itself changes — not on
  // every scroll-driven re-render.
  const colors = useMemo(
    () => ({
      railColor: euiTheme.colors.lightShade,
      dotBgColor: euiTheme.colors.plainLight,
      activeColor: euiTheme.colors.primary,
      inactiveBg: transparentize(euiTheme.colors.primary, 0.12),
      inactiveBgHover: transparentize(euiTheme.colors.primary, 0.2),
      inactiveText: euiTheme.colors.primaryText,
      activeBg: euiTheme.colors.primary,
      activeBgHover: shade(euiTheme.colors.primary, 0.1),
      activeText: euiTheme.colors.plainLight,
      dangerColor: euiTheme.colors.danger,
      warningColor: euiTheme.colors.warning,
      fontFamily: euiTheme.font.family,
    }),
    [euiTheme]
  );

  // Split colors into two stable subsets so MinimapDot and MinimapStepRow each
  // receive only what they need, preventing unnecessary prop inequality.
  const dotColors = useMemo(
    () => ({
      activeColor: colors.activeColor,
      dotBgColor: colors.dotBgColor,
      railColor: colors.railColor,
    }),
    [colors]
  );
  const rowColors: MinimapColors = useMemo(
    () => ({
      activeBg: colors.activeBg,
      activeBgHover: colors.activeBgHover,
      activeText: colors.activeText,
      inactiveBg: colors.inactiveBg,
      inactiveBgHover: colors.inactiveBgHover,
      inactiveText: colors.inactiveText,
      dangerColor: colors.dangerColor,
      warningColor: colors.warningColor,
      fontFamily: colors.fontFamily,
    }),
    [colors]
  );

  const totalHeight = stepEntries.length * MINIMAP_ITEM_HEIGHT;

  // Pre-compute step IDs once for buildOuterRailSegments (which only needs ids, not full StepInfo).
  const stepIds = useMemo(() => stepEntries.map(([id]) => id), [stepEntries]);

  const outerRailSegments = useMemo(
    () =>
      nestingInfo.hasNesting
        ? buildOuterRailSegments(
            stepIds,
            nestingInfo.depths,
            MINIMAP_OUTER_TRACK_X,
            MINIMAP_ITEM_HEIGHT
          )
        : [],
    [stepIds, nestingInfo]
  );
  const innerRailSegments = useMemo(
    () =>
      nestingInfo.hasNesting
        ? buildInnerRailSegments(
            nestingInfo.parentGroups,
            MINIMAP_INNER_TRACK_X,
            MINIMAP_ITEM_HEIGHT
          )
        : [],
    [nestingInfo]
  );
  const branchConnectors = useMemo(
    () =>
      nestingInfo.hasNesting
        ? buildBranchConnectors(
            nestingInfo.parentGroups,
            MINIMAP_OUTER_TRACK_X,
            MINIMAP_INNER_TRACK_X,
            MINIMAP_DOT_R,
            MINIMAP_ITEM_HEIGHT
          )
        : [],
    [nestingInfo]
  );

  // Rail lines only — no focus dependency, so they're never rebuilt on cursor moves.
  const railLines = useMemo(
    () => (
      <>
        {/* No-nesting: single continuous solid line */}
        {!nestingInfo.hasNesting && stepEntries.length > 1 && (
          <line
            x1={MINIMAP_TRACK_X}
            y1={MINIMAP_ITEM_HEIGHT / 2}
            x2={MINIMAP_TRACK_X}
            y2={totalHeight - MINIMAP_ITEM_HEIGHT / 2}
            stroke={colors.railColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
        )}

        {outerRailSegments.map((segment) => (
          <line
            key={segment.key}
            x1={segment.x}
            y1={segment.y1}
            x2={segment.x}
            y2={segment.y2}
            stroke={colors.railColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={segment.dashed ? '5 4' : undefined}
          />
        ))}

        {innerRailSegments.map((segment) => (
          <line
            key={segment.key}
            x1={segment.x}
            y1={segment.y1}
            x2={segment.x}
            y2={segment.y2}
            stroke={colors.railColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
        ))}

        {branchConnectors.map((connector) => (
          <path
            key={connector.key}
            d={connector.path}
            fill="none"
            stroke={colors.railColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        ))}
      </>
    ),
    [
      nestingInfo,
      stepEntries,
      totalHeight,
      outerRailSegments,
      innerRailSegments,
      branchConnectors,
      colors.railColor,
    ]
  );

  if (stepEntries.length === 0) return null;

  return (
    <nav
      aria-label={i18n.translate('workflows.stepMinimap.regionLabel', {
        defaultMessage: 'Workflow step navigation',
      })}
      css={css({
        paddingTop: EDITOR_PADDING_TOP_PX,
        paddingLeft: MINIMAP_PADDING_LEFT_PX,
        paddingRight: MINIMAP_PADDING_RIGHT_PX,
      })}
    >
      <div
        css={css({
          position: 'relative',
          width: MINIMAP_MAX_LABEL_W + MINIMAP_TRACK_W,
          height: totalHeight,
        })}
      >
        {/* Viewport indicator — shows which steps are currently visible in the editor.
          Negative left/right offsets extend the border into the outer padding zones so
          severity dots (left) and SVG track circles (right) sit inside the border. */}
        {viewportSteps &&
          visibleLineRange &&
          stepEntries.length > 0 &&
          (visibleLineRange.start > stepEntries[0][1].lineStart ||
            visibleLineRange.end < stepEntries[stepEntries.length - 1][1].lineEnd) && (
            <div
              aria-hidden="true"
              css={css({
                position: 'absolute',
                top: viewportSteps.first * MINIMAP_ITEM_HEIGHT,
                left: -MINIMAP_PADDING_LEFT_PX,
                right: -(
                  MINIMAP_OUTER_TRACK_X +
                  MINIMAP_DOT_R -
                  MINIMAP_TRACK_W +
                  MINIMAP_VIEWPORT_BORDER_RIGHT_EXTRA_PX
                ),
                height: (viewportSteps.last - viewportSteps.first + 1) * MINIMAP_ITEM_HEIGHT,
                border: `1px solid ${transparentize(euiTheme.colors.primary, 0.65)}`,
                borderRadius: 6,
                pointerEvents: 'none',
                zIndex: 0,
              })}
            />
          )}
        {/* ── SVG track ── */}
        <svg
          css={css({ position: 'absolute', right: 0, top: 0, zIndex: 1 })}
          width={MINIMAP_TRACK_W}
          height={totalHeight}
          style={{ pointerEvents: 'none' }}
          aria-hidden="true"
        >
          {railLines}
          {stepEntries.map(([stepId], index) => {
            const isNested = nestingInfo.hasNesting && (nestingInfo.depths.get(stepId) ?? 0) > 0;
            const cx = nestingInfo.hasNesting
              ? isNested
                ? MINIMAP_INNER_TRACK_X
                : MINIMAP_OUTER_TRACK_X
              : MINIMAP_TRACK_X;
            const cy = index * MINIMAP_ITEM_HEIGHT + MINIMAP_ITEM_HEIGHT / 2;
            return (
              <MinimapDot
                key={stepId}
                cx={cx}
                cy={cy}
                isFocused={stepId === focusedStepInfo?.stepId}
                activeColor={dotColors.activeColor}
                dotBgColor={dotColors.dotBgColor}
                railColor={dotColors.railColor}
              />
            );
          })}
        </svg>

        {/* ── Step pill buttons ── */}
        {stepEntries.map(([stepId, step], index) => {
          const isNested = nestingInfo.hasNesting && (nestingInfo.depths.get(stepId) ?? 0) > 0;
          return (
            <MinimapStepRow
              key={stepId}
              stepId={stepId}
              lineStart={step.lineStart}
              index={index}
              isFocused={stepId === focusedStepInfo?.stepId}
              severityInfo={severityMap.get(stepId) ?? null}
              isNested={isNested}
              colors={rowColors}
              onStepClick={handleStepClick}
            />
          );
        })}
      </div>
    </nav>
  );
};
