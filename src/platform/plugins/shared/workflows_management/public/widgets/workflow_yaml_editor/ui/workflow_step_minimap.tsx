/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shade, transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
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
import { computeStepStructureFingerprint } from '../lib/minimap/step_structure_fingerprint';
import { useStableByFingerprint } from '../lib/minimap/use_stable_by_fingerprint';
import { buildEffectiveLineEnd, computeViewportSteps } from '../lib/minimap/viewport_steps';
import type { VisibleLineRange } from '../lib/minimap/viewport_steps';
import {
  EDITOR_PADDING_TOP_PX,
  MINIMAP_PADDING_LEFT_PX,
  MINIMAP_PADDING_RIGHT_PX,
  MINIMAP_WIDTH_PX,
} from '../styles/constants';

const ITEM_HEIGHT = 32;
const DOT_R = 4;
const TRACK_W = 32;
const PILL_TRACK_GAP = 6;
const MAX_LABEL_W = MINIMAP_WIDTH_PX - TRACK_W - PILL_TRACK_GAP;
const PILL_H = 22;
const PILL_RADIUS = 11;

// Single-track (no nesting): centred in the column
const TRACK_X = 10;
// Two-track (nesting present). Spread wide enough that the middle connector
// lane ((outer+inner)/2) keeps clear daylight from both rails and their dots.
const OUTER_TRACK_X = 26; // top-level steps
const INNER_TRACK_X = 6; // nested steps
// Nested pills are slightly narrower so they visually indent from parent pills
const NESTED_PILL_INDENT = 10;

/** Extra px the viewport-indicator border's right edge extends past the track so it
 *  clears the SVG track dots. Unrelated to `MINIMAP_GAP_PX`-style constants elsewhere —
 *  this one is purely about the border, not the panel's reserved layout width. */
const VIEWPORT_BORDER_RIGHT_EXTRA_PX = 8;

// Static per-step styles shared by every row — hoisted to module scope so they're
// created once instead of being rebuilt (and re-hashed by Emotion) on every render.
// Only the genuinely per-row/per-render values (position, colors, width) are computed
// inline at the call site.
const stepButtonBaseCss = css({
  position: 'absolute',
  left: 0,
  right: TRACK_W + PILL_TRACK_GAP,
  height: ITEM_HEIGHT,
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
  height: PILL_H,
  lineHeight: `${PILL_H}px`,
  paddingInline: '8px',
  borderRadius: PILL_RADIUS,
  fontSize: '12px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  transition: 'background 0.15s ease',
  userSelect: 'none',
  pointerEvents: 'none',
});

interface WorkflowStepMinimapProps {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  validationErrors: YamlValidationResult[];
  /** The scrollable container div that wraps this minimap (owned by the parent). */
  scrollContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  /** Becomes true once the Monaco editor has finished mounting. Used to ensure
   *  the viewport tracking effect re-runs after Monaco is ready even when steps
   *  are already available in Redux from a previous session. */
  isEditorMounted: boolean;
}

export const WorkflowStepMinimap = ({
  editorRef,
  validationErrors,
  scrollContainerRef,
  isEditorMounted,
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
  // not on every keystroke.
  const current = useStableByFingerprint(rawCurrent, (c) =>
    computeStepStructureFingerprint(c.entries)
  );

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

  // Precomputed once per [stepEntries, validationErrors] instead of once per step per
  // render — `validationErrors` is itself already reference-stable across no-op
  // revalidations (see `use_yaml_validation`'s fingerprint-gated setter), so this only
  // recomputes on a real structural or validation change, never on scroll.
  const severityMap = useMemo(
    () => buildStepSeverityMap(stepEntries, validationErrors),
    [stepEntries, validationErrors]
  );

  const handleStepClick = useCallback(
    (lineStart: number) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.revealLineInCenter(lineStart);
      editor.setPosition({ lineNumber: lineStart, column: 1 });
      editor.focus();
    },
    [editorRef]
  );

  // ── Viewport tracking ─────────────────────────────────────
  const [visibleLineRange, setVisibleLineRange] = useState<VisibleLineRange | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
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
    // Re-run when Monaco finishes mounting (isEditorMounted) or when steps first
    // appear. Without isEditorMounted, cached Redux state can cause the effect to
    // fire before editorRef.current is set, leaving no listeners attached.
  }, [editorRef, stepEntries.length, isEditorMounted]);

  // Depends only on stepEntries, not on scroll position — split out from
  // computeViewportSteps so it isn't rebuilt on every scroll frame.
  const effectiveLineEnd = useMemo(() => buildEffectiveLineEnd(stepEntries), [stepEntries]);

  const viewportSteps = useMemo(
    () => computeViewportSteps(stepEntries, effectiveLineEnd, visibleLineRange),
    [stepEntries, effectiveLineEnd, visibleLineRange]
  );

  // Scroll the minimap container to keep the viewport band centred.
  // Items are offset by EDITOR_PADDING_TOP_PX within the container, matching Monaco's padding.top.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !viewportSteps) return;
    const bandCenterY =
      EDITOR_PADDING_TOP_PX + ((viewportSteps.first + viewportSteps.last) / 2 + 0.5) * ITEM_HEIGHT;
    const targetScrollTop = Math.max(0, bandCenterY - container.clientHeight / 2);
    container.scrollTop = targetScrollTop;
  }, [scrollContainerRef, viewportSteps]);

  // When a step is focused (clicked in the YAML editor) ensure it is visible in the minimap.
  // Only scrolls if the step is already outside the minimap's current visible area.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !focusedStepInfo) return;
    const stepIndex = stepEntries.findIndex(([id]) => id === focusedStepInfo.stepId);
    if (stepIndex === -1) return;
    const stepTop = EDITOR_PADDING_TOP_PX + stepIndex * ITEM_HEIGHT;
    const stepBottom = stepTop + ITEM_HEIGHT;
    const visibleTop = container.scrollTop;
    const visibleBottom = container.scrollTop + container.clientHeight;
    if (stepTop >= visibleTop && stepBottom <= visibleBottom) return;
    const stepCenterY = stepTop + ITEM_HEIGHT / 2;
    container.scrollTop = Math.max(0, stepCenterY - container.clientHeight / 2);
  }, [focusedStepInfo, stepEntries, scrollContainerRef]);

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

  const totalHeight = stepEntries.length * ITEM_HEIGHT;

  const outerRailSegments = useMemo(
    () =>
      nestingInfo.hasNesting
        ? buildOuterRailSegments(stepEntries, nestingInfo.depths, OUTER_TRACK_X, ITEM_HEIGHT)
        : [],
    [stepEntries, nestingInfo]
  );
  const innerRailSegments = useMemo(
    () =>
      nestingInfo.hasNesting
        ? buildInnerRailSegments(nestingInfo.parentGroups, INNER_TRACK_X, ITEM_HEIGHT)
        : [],
    [nestingInfo]
  );
  const branchConnectors = useMemo(
    () =>
      nestingInfo.hasNesting
        ? buildBranchConnectors(
            nestingInfo.parentGroups,
            OUTER_TRACK_X,
            INNER_TRACK_X,
            DOT_R,
            ITEM_HEIGHT
          )
        : [],
    [nestingInfo]
  );

  // The rails/dots/pills below depend only on structure, focus, severity and theme —
  // never on scroll position — so they're built once per real change and reused as-is
  // across the scroll-driven re-renders that only update the viewport indicator overlay.
  const railsAndDots = useMemo(
    () => (
      <>
        {/* No-nesting: single continuous solid line */}
        {!nestingInfo.hasNesting && stepEntries.length > 1 && (
          <line
            x1={TRACK_X}
            y1={ITEM_HEIGHT / 2}
            x2={TRACK_X}
            y2={totalHeight - ITEM_HEIGHT / 2}
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

        {stepEntries.map(([stepId], index) => {
          const isFocused = stepId === focusedStepInfo?.stepId;
          const cy = index * ITEM_HEIGHT + ITEM_HEIGHT / 2;
          const isNested = nestingInfo.hasNesting && (nestingInfo.depths.get(stepId) ?? 0) > 0;
          const cx = nestingInfo.hasNesting ? (isNested ? INNER_TRACK_X : OUTER_TRACK_X) : TRACK_X;
          return (
            <circle
              key={stepId}
              cx={cx}
              cy={cy}
              r={DOT_R}
              fill={isFocused ? colors.activeColor : colors.dotBgColor}
              stroke={isFocused ? colors.activeColor : colors.railColor}
              strokeWidth={2}
            />
          );
        })}
      </>
    ),
    [
      nestingInfo,
      stepEntries,
      totalHeight,
      outerRailSegments,
      innerRailSegments,
      branchConnectors,
      colors,
      focusedStepInfo?.stepId,
    ]
  );

  const pillButtons = useMemo(
    () =>
      stepEntries.map(([stepId, step], index) => {
        const isFocused = stepId === focusedStepInfo?.stepId;
        const severity = severityMap.get(stepId) ?? null;
        const isNested = nestingInfo.hasNesting && (nestingInfo.depths.get(stepId) ?? 0) > 0;
        const pillMaxW = isNested ? MAX_LABEL_W - NESTED_PILL_INDENT : MAX_LABEL_W;

        return (
          <button
            key={stepId}
            type="button"
            title={stepId}
            onClick={(e) => {
              handleStepClick(step.lineStart);
              // Blur immediately so the browser doesn't fight our programmatic scroll
              e.currentTarget.blur();
            }}
            css={[
              stepButtonBaseCss,
              css({
                top: index * ITEM_HEIGHT,
                '&:hover .minimap-pill': {
                  background: isFocused ? colors.activeBgHover : colors.inactiveBgHover,
                },
              }),
            ]}
          >
            {severity && (
              <span
                aria-hidden="true"
                css={[
                  severityDotBaseCss,
                  css({
                    backgroundColor:
                      severity === 'error' ? colors.dangerColor : colors.warningColor,
                  }),
                ]}
              />
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
      }),
    [stepEntries, focusedStepInfo?.stepId, severityMap, nestingInfo, colors, handleStepClick]
  );

  if (stepEntries.length === 0) return null;

  return (
    <div
      css={css({
        paddingTop: EDITOR_PADDING_TOP_PX,
        paddingLeft: MINIMAP_PADDING_LEFT_PX,
        paddingRight: MINIMAP_PADDING_RIGHT_PX,
      })}
    >
      <div css={css({ position: 'relative', width: MAX_LABEL_W + TRACK_W, height: totalHeight })}>
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
                top: viewportSteps.first * ITEM_HEIGHT,
                left: -MINIMAP_PADDING_LEFT_PX,
                right: -(OUTER_TRACK_X + DOT_R - TRACK_W + VIEWPORT_BORDER_RIGHT_EXTRA_PX),
                height: (viewportSteps.last - viewportSteps.first + 1) * ITEM_HEIGHT,
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
          width={TRACK_W}
          height={totalHeight}
          style={{ pointerEvents: 'none' }}
          aria-hidden="true"
        >
          {railsAndDots}
        </svg>

        {/* ── Step pill buttons ── */}
        {pillButtons}
      </div>
    </div>
  );
};
