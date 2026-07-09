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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { monaco } from '@kbn/monaco';
import type { StepInfo } from '@kbn/workflows-yaml';
import {
  selectEditorFocusedStepInfo,
  selectEditorWorkflowLookup,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import type { YamlValidationResult } from '../../../features/validate_workflow_yaml/model/types';
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

type StepSeverity = 'error' | 'warning' | null;

const getStepSeverity = (step: StepInfo, errors: YamlValidationResult[]): StepSeverity => {
  let hasWarning = false;
  for (const err of errors) {
    const isInStepRange =
      err.severity !== null &&
      err.startLineNumber >= step.lineStart &&
      err.startLineNumber <= step.lineEnd;
    if (isInStepRange) {
      if (err.severity === 'error') return 'error';
      if (err.severity === 'warning') hasWarning = true;
    }
  }
  return hasWarning ? 'warning' : null;
};

interface BranchGroup {
  /** Stable identity of this branch: parent-of-branch-root + branchKey. */
  branchId: string;
  /** Index of the first step in this branch. */
  firstIndex: number;
  /** Index of the last step in this branch. */
  lastIndex: number;
}

interface ParentGroup {
  /** Index of the depth-0 parent step. */
  parentIndex: number;
  /** Branches under this parent, sorted by firstIndex. Each gets its own rail + connector. */
  branches: BranchGroup[];
}

interface NestingInfo {
  depths: Map<string, number>;
  parentGroups: ParentGroup[];
  hasNesting: boolean;
}

const buildNestingInfo = (
  stepEntries: Array<[string, StepInfo]>,
  stepsMap: Record<string, StepInfo>
): NestingInfo => {
  // Depth via parentStepId chain. The chain may pass through container nodes
  // (e.g. `parallel` branch entries that have a `name` but no `type`) which are
  // not registered steps — the walk stops there, still yielding depth >= 1,
  // which is all the two-track layout needs.
  const depths = new Map<string, number>();
  for (const [id, step] of stepEntries) {
    let d = 0;
    let current: StepInfo | undefined = step;
    while (current?.parentStepId) {
      d++;
      current = stepsMap[current.parentStepId];
    }
    depths.set(id, d);
  }

  // Group nested steps under their top-level ancestor, found positionally:
  // entries are sorted by lineStart and a parent's line range contains its whole
  // subtree, so the owning top-level step is simply the last depth-0 step seen.
  // This stays correct even when parentStepId points at an unregistered
  // container node (whose id can't be resolved through stepsMap).
  //
  // Within a parent, group by branch identity: the (parentStepId, branchKey)
  // pair of the highest chain node below the top level. Distinct branches
  // (`steps` vs `else`, or separate `parallel` branch containers) must NOT be
  // joined by one rail — they are alternative paths, not a sequence.
  const groupMap = new Map<number, Map<string, { firstIndex: number; lastIndex: number }>>();
  let topLevelIndex = -1;
  let topLevelId: string | undefined;

  stepEntries.forEach(([stepId, step], index) => {
    if ((depths.get(stepId) ?? 0) === 0) {
      topLevelIndex = index;
      topLevelId = stepId;
      return;
    }
    // Nested step appearing before any top-level step (malformed YAML) — leave ungrouped.
    if (topLevelIndex === -1) return;

    // Walk up to the branch root: the highest node whose parent is either the
    // top-level ancestor itself or an unregistered container under it.
    let node: StepInfo = step;
    while (node.parentStepId && node.parentStepId !== topLevelId && stepsMap[node.parentStepId]) {
      node = stepsMap[node.parentStepId];
    }
    const branchId = `${node.parentStepId ?? ''}:${node.branchKey ?? 'steps'}`;

    let byBranch = groupMap.get(topLevelIndex);
    if (!byBranch) {
      byBranch = new Map();
      groupMap.set(topLevelIndex, byBranch);
    }
    const branch = byBranch.get(branchId);
    if (!branch) {
      byBranch.set(branchId, { firstIndex: index, lastIndex: index });
    } else {
      branch.firstIndex = Math.min(branch.firstIndex, index);
      branch.lastIndex = Math.max(branch.lastIndex, index);
    }
  });

  const parentGroups: ParentGroup[] = [];
  for (const [parentIndex, byBranch] of groupMap) {
    const branches: BranchGroup[] = [...byBranch.entries()]
      .map(([branchId, { firstIndex, lastIndex }]) => ({ branchId, firstIndex, lastIndex }))
      .sort((a, b) => a.firstIndex - b.firstIndex);
    parentGroups.push({ parentIndex, branches });
  }

  const hasNesting = [...depths.values()].some((d) => d > 0);
  return { depths, parentGroups, hasNesting };
};

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
  const focusedStepInfo = useSelector(selectEditorFocusedStepInfo);

  const stepEntries: Array<[string, StepInfo]> = useMemo(
    () =>
      workflowLookup
        ? Object.entries(workflowLookup.steps).sort(([, a], [, b]) => a.lineStart - b.lineStart)
        : [],
    [workflowLookup]
  );

  const { depths, parentGroups, hasNesting } = useMemo(
    () => buildNestingInfo(stepEntries, workflowLookup?.steps ?? {}),
    [stepEntries, workflowLookup]
  );

  const handleStepClick = useCallback(
    (step: StepInfo) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.revealLineInCenter(step.lineStart);
      editor.setPosition({ lineNumber: step.lineStart, column: 1 });
      editor.focus();
    },
    [editorRef]
  );

  // ── Viewport tracking ─────────────────────────────────────
  const [visibleLineRange, setVisibleLineRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const update = () => {
      const ranges = editor.getVisibleRanges();
      if (!ranges.length) return;
      setVisibleLineRange({
        start: ranges[0].startLineNumber,
        end: ranges[ranges.length - 1].endLineNumber,
      });
    };

    update();
    // Retry once after a short delay: getVisibleRanges() can return [] on the first
    // call if Monaco hasn't finished its initial layout pass yet.
    const retryTimer = setTimeout(update, 150);

    const d1 = editor.onDidScrollChange(update);
    const d2 = editor.onDidLayoutChange(update);
    // Cursor movement fires without a scroll (e.g. clicking a step in the minimap),
    // so we need this to keep the viewport indicator in sync in those cases.
    const d3 = editor.onDidChangeCursorPosition(update);
    return () => {
      clearTimeout(retryTimer);
      d1.dispose();
      d2.dispose();
      d3.dispose();
    };
    // Re-run when Monaco finishes mounting (isEditorMounted) or when steps first
    // appear. Without isEditorMounted, cached Redux state can cause the effect to
    // fire before editorRef.current is set, leaving no listeners attached.
  }, [editorRef, stepEntries.length, isEditorMounted]);

  // First and last index of steps currently in the visible viewport
  const viewportSteps = useMemo(() => {
    if (!visibleLineRange || stepEntries.length === 0) return null;

    // For parent steps, lineEnd spans their entire subtree. Trim each step's
    // effective end to just before its first direct child so that a parent
    // whose name is off-screen is not falsely included in the viewport band.
    // stepEntries is sorted by lineStart, so the first child encountered per
    // parent has the smallest lineStart (i.e. Math.min is a no-op after the first).
    const effectiveLineEnd = new Map<string, number>(
      stepEntries.map(([id, step]) => [id, step.lineEnd])
    );
    for (const [, step] of stepEntries) {
      const parentEnd = step.parentStepId ? effectiveLineEnd.get(step.parentStepId) : undefined;
      if (step.parentStepId && parentEnd !== undefined) {
        effectiveLineEnd.set(step.parentStepId, Math.min(parentEnd, step.lineStart - 1));
      }
    }

    let first = -1;
    let last = -1;
    stepEntries.forEach(([id, step], index) => {
      const end = effectiveLineEnd.get(id) ?? step.lineEnd;
      if (end >= visibleLineRange.start && step.lineStart <= visibleLineRange.end) {
        if (first === -1) first = index;
        last = index;
      }
    });
    if (first !== -1) return { first, last };

    // Viewport doesn't overlap any step (e.g. looking at the YAML header above `steps:`).
    // Clamp to the nearest step boundary so the indicator is always visible.
    const lastIdx = stepEntries.length - 1;
    if (visibleLineRange.end < stepEntries[0][1].lineStart) return { first: 0, last: 0 };
    if (visibleLineRange.start > stepEntries[lastIdx][1].lineEnd)
      return { first: lastIdx, last: lastIdx };
    // Between two consecutive steps — span both neighbours.
    const belowIdx = stepEntries.findIndex(([, s]) => s.lineStart > visibleLineRange.end);
    const idx = belowIdx > 0 ? belowIdx - 1 : 0;
    return { first: idx, last: Math.min(idx + 1, lastIdx) };
  }, [stepEntries, visibleLineRange]);

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

  if (stepEntries.length === 0) return null;

  const totalHeight = stepEntries.length * ITEM_HEIGHT;

  const railColor = euiTheme.colors.lightShade;
  const dotBgColor = euiTheme.colors.plainLight;
  const activeColor = euiTheme.colors.primary;

  const inactiveBg = transparentize(euiTheme.colors.primary, 0.12);
  const inactiveBgHover = transparentize(euiTheme.colors.primary, 0.2);
  const inactiveText = euiTheme.colors.primaryText;
  const activeBg = activeColor;
  const activeBgHover = shade(activeColor, 0.1);
  const activeText = euiTheme.colors.plainLight;

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
                right: -(OUTER_TRACK_X + DOT_R - TRACK_W + 8),
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
          {/* No-nesting: single continuous solid line */}
          {!hasNesting && stepEntries.length > 1 && (
            <line
              x1={TRACK_X}
              y1={ITEM_HEIGHT / 2}
              x2={TRACK_X}
              y2={totalHeight - ITEM_HEIGHT / 2}
              stroke={railColor}
              strokeWidth={2}
              strokeLinecap="round"
            />
          )}

          {/* With nesting: outer rail drawn as segments — solid where no branch exists between
            two consecutive top-level steps, dashed where nested children occupy those rows */}
          {hasNesting &&
            stepEntries
              .reduce<number[]>((acc, [id], i) => {
                if ((depths.get(id) ?? 0) === 0) acc.push(i);
                return acc;
              }, [])
              .flatMap((fromIdx, j, topLevel) => {
                if (j === topLevel.length - 1) return [];
                const toIdx = topLevel[j + 1];
                return [
                  <line
                    key={`outer-seg-${j}`}
                    x1={OUTER_TRACK_X}
                    y1={fromIdx * ITEM_HEIGHT + ITEM_HEIGHT / 2}
                    x2={OUTER_TRACK_X}
                    y2={toIdx * ITEM_HEIGHT + ITEM_HEIGHT / 2}
                    stroke={railColor}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeDasharray={toIdx > fromIdx + 1 ? '5 4' : undefined}
                  />,
                ];
              })}

          {/* Inner rails — one segment per branch, so alternative branches
            (`else`, separate `parallel` branches) are not joined into one line */}
          {hasNesting &&
            parentGroups.flatMap(({ parentIndex, branches }) =>
              branches
                .filter(({ firstIndex, lastIndex }) => lastIndex > firstIndex)
                .map(({ branchId, firstIndex, lastIndex }) => (
                  <line
                    key={`inner-rail-${parentIndex}-${branchId}`}
                    x1={INNER_TRACK_X}
                    y1={firstIndex * ITEM_HEIGHT + ITEM_HEIGHT / 2}
                    x2={INNER_TRACK_X}
                    y2={lastIndex * ITEM_HEIGHT + ITEM_HEIGHT / 2}
                    stroke={railColor}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                ))
            )}

          {/* Branch connectors — one per branch, from the parent to the branch's
            first step. The nearest branch gets a short S-curve; branches further
            down drop through a middle lane so the connector neither overlaps the
            dashed outer rail nor the earlier branches' inner rails. */}
          {hasNesting &&
            parentGroups.flatMap(({ parentIndex, branches }) => {
              const parentCy = parentIndex * ITEM_HEIGHT + ITEM_HEIGHT / 2;
              return branches.map(({ branchId, firstIndex }) => {
                const childCy = firstIndex * ITEM_HEIGHT + ITEM_HEIGHT / 2;
                const startY = parentCy + DOT_R + 2;
                let d: string;
                if (childCy - startY <= ITEM_HEIGHT) {
                  const midY = (startY + childCy) / 2;
                  d = `M ${OUTER_TRACK_X} ${startY} C ${OUTER_TRACK_X} ${midY} ${INNER_TRACK_X} ${midY} ${INNER_TRACK_X} ${childCy}`;
                } else {
                  const laneX = (OUTER_TRACK_X + INNER_TRACK_X) / 2;
                  const bend = ITEM_HEIGHT / 2;
                  const outY = startY + bend;
                  const inY = childCy - bend;
                  d = [
                    `M ${OUTER_TRACK_X} ${startY}`,
                    `C ${OUTER_TRACK_X} ${(startY + outY) / 2} ${laneX} ${
                      (startY + outY) / 2
                    } ${laneX} ${outY}`,
                    `L ${laneX} ${inY}`,
                    `C ${laneX} ${(inY + childCy) / 2} ${INNER_TRACK_X} ${
                      (inY + childCy) / 2
                    } ${INNER_TRACK_X} ${childCy}`,
                  ].join(' ');
                }
                return (
                  <path
                    key={`connector-${parentIndex}-${branchId}`}
                    d={d}
                    fill="none"
                    stroke={railColor}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                );
              });
            })}

          {/* Dots — outer track for top-level, inner for nested */}
          {stepEntries.map(([stepId], index) => {
            const isFocused = stepId === focusedStepInfo?.stepId;
            const isInViewport =
              viewportSteps !== null && index >= viewportSteps.first && index <= viewportSteps.last;
            const cy = index * ITEM_HEIGHT + ITEM_HEIGHT / 2;
            const isNested = hasNesting && (depths.get(stepId) ?? 0) > 0;
            const cx = hasNesting ? (isNested ? INNER_TRACK_X : OUTER_TRACK_X) : TRACK_X;
            return (
              <circle
                key={stepId}
                cx={cx}
                cy={cy}
                r={DOT_R}
                fill={isFocused ? activeColor : dotBgColor}
                stroke={isFocused ? activeColor : railColor}
                strokeWidth={2}
              />
            );
          })}
        </svg>

        {/* ── Step pill buttons ── */}
        {stepEntries.map(([stepId, step], index) => {
          const isFocused = stepId === focusedStepInfo?.stepId;
          const severity = getStepSeverity(step, validationErrors);
          const isNested = hasNesting && (depths.get(stepId) ?? 0) > 0;
          const pillMaxW = isNested ? MAX_LABEL_W - NESTED_PILL_INDENT : MAX_LABEL_W;

          return (
            <button
              key={stepId}
              type="button"
              title={stepId}
              onClick={(e) => {
                handleStepClick(step);
                // Blur immediately so the browser doesn't fight our programmatic scroll
                (e.currentTarget as HTMLButtonElement).blur();
              }}
              css={css({
                position: 'absolute',
                top: index * ITEM_HEIGHT,
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
                '&:hover .minimap-pill': {
                  background: isFocused ? activeBgHover : inactiveBgHover,
                },
              })}
            >
              {severity && (
                <span
                  aria-hidden="true"
                  css={css({
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    flexShrink: 0,
                    pointerEvents: 'none',
                    backgroundColor:
                      severity === 'error' ? euiTheme.colors.danger : euiTheme.colors.warning,
                  })}
                />
              )}
              <span
                className="minimap-pill"
                css={css({
                  display: 'inline-block',
                  maxWidth: pillMaxW,
                  height: PILL_H,
                  lineHeight: `${PILL_H}px`,
                  paddingInline: '8px',
                  background: isFocused ? activeBg : inactiveBg,
                  color: isFocused ? activeText : inactiveText,
                  borderRadius: PILL_RADIUS,
                  fontSize: '12px',
                  fontFamily: euiTheme.font.family,
                  fontWeight: isFocused ? 600 : 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'background 0.15s ease',
                  userSelect: 'none',
                  pointerEvents: 'none',
                })}
              >
                {stepId}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
