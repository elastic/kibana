/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiCanAnimate, euiFocusRing, EuiIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { ViewportPortal } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { LayoutDirection } from '@kbn/workflows';
import type { InsertionPoints } from './compute_insertion_points';
import { computeWireInsertionControls } from './compute_wire_insertion_controls';
import type { WorkflowGraphEditActions } from './workflow_graph_actions_context';
import { toAnchorRect } from './workflow_graph_insert_control';
import { WorkflowGraphWireSplitControl } from './workflow_graph_wire_split_control';

/** Gap between the trigger row and the ghost "add trigger" button. */
const TRIGGER_GHOST_GAP = 12;
const TRIGGER_GHOST_SIZE = 26;

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Absolute (flow-space) bounds of the given nodes; inner nodes add their parent's origin. */
function boundsOf(ids: readonly string[], nodes: readonly Node[]): Bounds | undefined {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let bounds: Bounds | undefined;
  const found = ids.map((id) => byId.get(id)).filter((n): n is Node => n !== undefined);
  for (const node of found) {
    let { x, y } = node.position;
    let parent = node.parentId ? byId.get(node.parentId) : undefined;
    while (parent) {
      x += parent.position.x;
      y += parent.position.y;
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    const w = typeof node.width === 'number' ? node.width : 0;
    const h = typeof node.height === 'number' ? node.height : 0;
    bounds = bounds
      ? {
          minX: Math.min(bounds.minX, x),
          minY: Math.min(bounds.minY, y),
          maxX: Math.max(bounds.maxX, x + w),
          maxY: Math.max(bounds.maxY, y + h),
        }
      : { minX: x, minY: y, maxX: x + w, maxY: y + h };
  }
  return bounds;
}

export interface WorkflowGraphEditOverlaysProps {
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
  readonly insertionPoints: InsertionPoints;
  readonly direction: LayoutDirection;
  readonly edit: WorkflowGraphEditActions;
}

/**
 * Edit-mode canvas overlays: trigger ghost "+", mid-wire / terminal Add-step
 * controls, and half-height stub arrows for sequence ends.
 * Failure ports stay on the node edge (connection ports).
 */
export function WorkflowGraphEditOverlays({
  nodes,
  edges,
  insertionPoints,
  direction,
  edit,
}: WorkflowGraphEditOverlaysProps) {
  const { euiTheme } = useEuiTheme();
  const euiThemeContext = useEuiTheme();
  const isHorizontal = direction === 'LR';

  const triggerIds = useMemo(
    () => nodes.filter((n) => n.type === 'trigger').map((n) => n.id),
    [nodes]
  );
  const triggerBounds = useMemo(() => boundsOf(triggerIds, nodes), [triggerIds, nodes]);

  const wireControls = useMemo(
    () =>
      computeWireInsertionControls({
        nodes,
        edges,
        insertionPoints,
        direction,
      }),
    [nodes, edges, insertionPoints, direction]
  );

  const handleAddTrigger = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) =>
      edit.onInsert({ mode: 'trigger' }, toAnchorRect(e.currentTarget)),
    [edit]
  );

  const addTriggerLabel = i18n.translate('workflowsUi.graph.addTrigger', {
    defaultMessage: 'Add trigger',
  });

  const stubStroke = euiTheme.colors.borderBaseProminent;
  const terminalStubs = wireControls.filter((c) => c.kind === 'terminal');

  return (
    <ViewportPortal>
      {terminalStubs.length > 0 ? (
        <svg
          data-test-subj="workflowGraphTerminalStubs"
          css={{
            position: 'absolute',
            left: 0,
            top: 0,
            overflow: 'visible',
            pointerEvents: 'none',
            // Large enough that path coords in flow-space always paint.
            width: 1,
            height: 1,
          }}
        >
          <defs>
            <marker
              id="workflowGraphTerminalArrow"
              markerWidth="6"
              markerHeight="6"
              refX="6"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L6,3 z" fill={stubStroke} />
            </marker>
          </defs>
          {terminalStubs.map((control) => {
            // Stop the stroke just shy of the dashed + so the arrowhead meets its rim.
            const tipInset = 11;
            const isLr = control.direction === 'LR';
            const x2 = isLr
              ? control.segmentEnd.x - tipInset
              : control.segmentEnd.x;
            const y2 = isLr
              ? control.segmentEnd.y
              : control.segmentEnd.y - tipInset;
            return (
              <line
                key={control.id}
                x1={control.segmentStart.x}
                y1={control.segmentStart.y}
                x2={x2}
                y2={y2}
                stroke={stubStroke}
                strokeWidth={1}
                strokeDasharray="4 3"
                markerEnd="url(#workflowGraphTerminalArrow)"
              />
            );
          })}
        </svg>
      ) : null}

      {wireControls.map((control) => (
        <WorkflowGraphWireSplitControl key={control.id} control={control} edit={edit} />
      ))}

      {triggerBounds ? (
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${
              isHorizontal
                ? (triggerBounds.minX + triggerBounds.maxX) / 2
                : triggerBounds.maxX + TRIGGER_GHOST_GAP + TRIGGER_GHOST_SIZE / 2
            }px, ${
              isHorizontal
                ? triggerBounds.maxY + TRIGGER_GHOST_GAP + TRIGGER_GHOST_SIZE / 2
                : (triggerBounds.minY + triggerBounds.maxY) / 2
            }px)`,
            pointerEvents: 'all',
          }}
        >
          <EuiToolTip content={addTriggerLabel} disableScreenReaderOutput>
            <button
              type="button"
              aria-label={addTriggerLabel}
              onClick={handleAddTrigger}
              data-test-subj="workflowGraphAddTrigger"
              css={[
                {
                  width: TRIGGER_GHOST_SIZE,
                  height: TRIGGER_GHOST_SIZE,
                  borderRadius: '50%',
                  border: `${euiTheme.border.width.thin} dashed ${euiTheme.colors.borderBaseProminent}`,
                  background: euiTheme.colors.backgroundBasePlain,
                  color: euiTheme.colors.textSubdued,
                  boxShadow: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  cursor: 'pointer',
                  [euiCanAnimate]: {
                    transition:
                      'background 150ms ease, color 150ms ease, border-color 150ms ease, border-style 150ms ease, box-shadow 150ms ease',
                  },
                  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                  '&:hover, &:focus-visible': {
                    background: euiTheme.colors.primary,
                    borderColor: euiTheme.colors.primary,
                    borderStyle: 'solid',
                    color: euiTheme.colors.backgroundBasePlain,
                    boxShadow: `0 0 0 2px ${euiTheme.colors.backgroundBasePlain}`,
                  },
                },
                { '&:focus-visible': euiFocusRing(euiThemeContext) },
              ]}
            >
              <EuiIcon type="plus" size="s" aria-hidden={true} />
            </button>
          </EuiToolTip>
        </div>
      ) : null}
    </ViewportPortal>
  );
}

/** Centered dashed card shown when the workflow has no triggers and no steps. */
export function WorkflowGraphEmptyAddTrigger({ edit }: { edit: WorkflowGraphEditActions }) {
  const { euiTheme } = useEuiTheme();
  const euiThemeContext = useEuiTheme();
  const label = i18n.translate('workflowsUi.graph.addTrigger', { defaultMessage: 'Add trigger' });
  return (
    <div
      css={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <button
        type="button"
        onClick={(e) => edit.onInsert({ mode: 'trigger' }, toAnchorRect(e.currentTarget))}
        data-test-subj="workflowGraphEmptyAddTrigger"
        css={{
          pointerEvents: 'all',
          display: 'inline-flex',
          alignItems: 'center',
          gap: euiTheme.size.s,
          padding: `${euiTheme.size.m} ${euiTheme.size.l}`,
          minWidth: 220,
          justifyContent: 'center',
          border: `${euiTheme.border.width.thin} dashed ${euiTheme.colors.borderBaseProminent}`,
          borderRadius: euiTheme.border.radius.small,
          background: 'transparent',
          color: euiTheme.colors.textSubdued,
          fontFamily: euiTheme.font.family,
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 120ms ease, color 120ms ease',
          '&:hover': {
            background: euiTheme.colors.backgroundBasePlain,
            color: euiTheme.colors.textParagraph,
          },
          '&:focus-visible': euiFocusRing(euiThemeContext),
        }}
      >
        <EuiIcon type="plus" size="s" aria-hidden={true} />
        {label}
      </button>
    </div>
  );
}
