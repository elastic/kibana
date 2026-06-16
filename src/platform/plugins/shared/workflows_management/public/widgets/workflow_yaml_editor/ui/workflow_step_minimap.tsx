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
import type { monaco } from '@kbn/monaco';
import type { NestedStepKey, StepInfo } from '@kbn/workflows-yaml';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { YamlValidationResult } from '../../../features/validate_workflow_yaml/model/types';
import {
  selectEditorFocusedStepInfo,
  selectEditorWorkflowLookup,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { EDITOR_PADDING_TOP_PX, MINIMAP_PADDING_RIGHT_PX, MINIMAP_WIDTH_PX } from '../styles/constants';

const ITEM_HEIGHT = 32;
const DOT_R = 4;
const TRACK_W = 24;
const PILL_TRACK_GAP = 6;
const MAX_LABEL_W = MINIMAP_WIDTH_PX - TRACK_W - PILL_TRACK_GAP;
const PILL_H = 22;
const PILL_RADIUS = 11;

// Single-track (no nesting): centred in the column
const TRACK_X = 10;
// Two-track (nesting present)
const OUTER_TRACK_X = 18; // top-level steps
const INNER_TRACK_X = 6; // nested steps
// Nested pills are slightly narrower so they visually indent from parent pills
const NESTED_PILL_INDENT = 10;

type StepSeverity = 'error' | 'warning' | null;

const getStepSeverity = (step: StepInfo, errors: YamlValidationResult[]): StepSeverity => {
  let hasWarning = false;
  for (const err of errors) {
    if (
      err.severity === null ||
      err.startLineNumber < step.lineStart ||
      err.startLineNumber > step.lineEnd
    ) {
      continue;
    }
    if (err.severity === 'error') return 'error';
    if (err.severity === 'warning') hasWarning = true;
  }
  return hasWarning ? 'warning' : null;
};

interface BranchGroup {
  /** Which nested key this branch came from. */
  branchKey: NestedStepKey;
  /** Index of the first step in this branch. */
  firstIndex: number;
  /** Index of the last step in this branch. */
  lastIndex: number;
}

interface ParentGroup {
  /** Index of the depth-0 parent step. */
  parentIndex: number;
  /** Branches under this parent, one per distinct branchKey. */
  branches: BranchGroup[];
  /** Span covering ALL nested descendants (for the inner rail). */
  firstChildIndex: number;
  lastChildIndex: number;
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
  const indexMap = new Map<string, number>(stepEntries.map(([id], i) => [id, i]));

  // Depth via parentStepId chain
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

  // Walk up to the depth-0 ancestor (the "scope owner")
  const getTopLevelAncestorId = (stepId: string): string | undefined => {
    let parentId = stepsMap[stepId]?.parentStepId;
    while (parentId && (depths.get(parentId) ?? 0) > 0) {
      parentId = stepsMap[parentId]?.parentStepId;
    }
    return parentId;
  };

  // For DIRECT children of a top-level parent, group by branchKey.
  // Deeply nested children are folded into whichever branch their
  // direct-child ancestor belongs to.
  const groupMap = new Map<
    number,
    {
      byBranch: Map<string, { firstIndex: number; lastIndex: number }>;
      firstChildIndex: number;
      lastChildIndex: number;
    }
  >();

  for (const [stepId, step] of stepEntries) {
    const depth = depths.get(stepId) ?? 0;
    if (depth === 0) continue;

    const topParentId = getTopLevelAncestorId(stepId);
    const parentIdx = topParentId != null ? indexMap.get(topParentId) : undefined;
    const childIdx = indexMap.get(stepId);
    if (parentIdx == null || childIdx == null) continue;

    // Resolve the branchKey: use the step's own branchKey if it's a direct child,
    // otherwise walk up to find which direct child it belongs to.
    let resolvedBranchKey: NestedStepKey | undefined = step.branchKey;
    if (depth > 1) {
      let ancestor: StepInfo | undefined = step;
      while (ancestor && (depths.get(ancestor.stepId) ?? 0) > 1) {
        ancestor = ancestor.parentStepId ? stepsMap[ancestor.parentStepId] : undefined;
      }
      resolvedBranchKey = ancestor?.branchKey;
    }
    const bk = resolvedBranchKey ?? 'steps';

    const existing = groupMap.get(parentIdx);
    if (!existing) {
      groupMap.set(parentIdx, {
        byBranch: new Map([[bk, { firstIndex: childIdx, lastIndex: childIdx }]]),
        firstChildIndex: childIdx,
        lastChildIndex: childIdx,
      });
    } else {
      const branch = existing.byBranch.get(bk);
      if (!branch) {
        existing.byBranch.set(bk, { firstIndex: childIdx, lastIndex: childIdx });
      } else {
        branch.firstIndex = Math.min(branch.firstIndex, childIdx);
        branch.lastIndex = Math.max(branch.lastIndex, childIdx);
      }
      existing.firstChildIndex = Math.min(existing.firstChildIndex, childIdx);
      existing.lastChildIndex = Math.max(existing.lastChildIndex, childIdx);
    }
  }

  const parentGroups: ParentGroup[] = [];
  for (const [parentIndex, { byBranch, firstChildIndex, lastChildIndex }] of groupMap) {
    const branches: BranchGroup[] = [...byBranch.entries()].map(
      ([bk, { firstIndex, lastIndex }]) => ({
        branchKey: bk as NestedStepKey,
        firstIndex,
        lastIndex,
      })
    );
    parentGroups.push({ parentIndex, branches, firstChildIndex, lastChildIndex });
  }

  const hasNesting = [...depths.values()].some((d) => d > 0);
  return { depths, parentGroups, hasNesting };
};

interface WorkflowStepMinimapProps {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  validationErrors: YamlValidationResult[];
  /** The scrollable container div that wraps this minimap (owned by the parent). */
  scrollContainerRef: React.MutableRefObject<HTMLDivElement | null>;
}

export const WorkflowStepMinimap = ({
  editorRef,
  validationErrors,
  scrollContainerRef,
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
    // Re-subscribe when steps first appear (editor is guaranteed mounted by then)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorRef, stepEntries.length]);

  // First and last index of steps currently in the visible viewport
  const viewportSteps = useMemo(() => {
    if (!visibleLineRange || stepEntries.length === 0) return null;

    let first = -1;
    let last = -1;
    stepEntries.forEach(([, step], index) => {
      if (step.lineEnd >= visibleLineRange.start && step.lineStart <= visibleLineRange.end) {
        if (first === -1) first = index;
        last = index;
      }
    });
    if (first !== -1) return { first, last };

    // Viewport doesn't overlap any step (e.g. looking at the YAML header above `steps:`).
    // Clamp to the nearest step boundary so the indicator is always visible.
    const lastIdx = stepEntries.length - 1;
    if (visibleLineRange.end < stepEntries[0][1].lineStart) return { first: 0, last: 0 };
    if (visibleLineRange.start > stepEntries[lastIdx][1].lineEnd) return { first: lastIdx, last: lastIdx };
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
    <div css={css({ paddingTop: EDITOR_PADDING_TOP_PX, paddingRight: MINIMAP_PADDING_RIGHT_PX })}>
    <div css={css({ position: 'relative', width: MAX_LABEL_W + TRACK_W, height: totalHeight })}>
      {/* Viewport indicator — shows which steps are currently visible in the editor */}
      {viewportSteps && (
        <div
          aria-hidden="true"
          css={css({
            position: 'absolute',
            top: viewportSteps.first * ITEM_HEIGHT,
            left: 0,
            right: 0,
            height: (viewportSteps.last - viewportSteps.first + 1) * ITEM_HEIGHT,
            backgroundColor: transparentize(euiTheme.colors.primary, 0.14),
            border: `1px solid ${transparentize(euiTheme.colors.primary, 0.4)}`,
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

        {/* Inner rails — one segment per parent's full nested span */}
        {hasNesting &&
          parentGroups.map(({ parentIndex, firstChildIndex, lastChildIndex }) => (
            <line
              key={`inner-rail-${parentIndex}`}
              x1={INNER_TRACK_X}
              y1={firstChildIndex * ITEM_HEIGHT + ITEM_HEIGHT / 2}
              x2={INNER_TRACK_X}
              y2={lastChildIndex * ITEM_HEIGHT + ITEM_HEIGHT / 2}
              stroke={railColor}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}

        {/* Branch connectors — one per (parent, branchKey) pair */}
        {hasNesting &&
          parentGroups.flatMap(({ parentIndex, branches }) => {
            const parentCy = parentIndex * ITEM_HEIGHT + ITEM_HEIGHT / 2;
            return branches.map(({ branchKey, firstIndex }) => {
              const childCy = firstIndex * ITEM_HEIGHT + ITEM_HEIGHT / 2;
              const startY = parentCy + DOT_R + 2;
              const midY = (startY + childCy) / 2;
              const d = `M ${OUTER_TRACK_X} ${startY} C ${OUTER_TRACK_X} ${midY} ${INNER_TRACK_X} ${midY} ${INNER_TRACK_X} ${childCy}`;
              return (
                <path
                  key={`connector-${parentIndex}-${branchKey}`}
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
        const isVisible =
          viewportSteps !== null && index >= viewportSteps.first && index <= viewportSteps.last;
        const severity = getStepSeverity(step, validationErrors);
        const isNested = hasNesting && (depths.get(stepId) ?? 0) > 0;
        const pillMaxW = isNested ? MAX_LABEL_W - NESTED_PILL_INDENT : MAX_LABEL_W;
        // Dim steps that are scrolled out of the editor viewport
        const buttonOpacity = isFocused || isVisible || viewportSteps === null ? 1 : 0.35;

        return (
          <button
            key={stepId}
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
              opacity: buttonOpacity,
              transition: 'opacity 0.15s ease',
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
