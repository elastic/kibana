/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1".
 */

import { euiCanAnimate, euiFocusRing, EuiIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { ViewportPortal } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { LayoutDirection } from '@kbn/workflows';
import type { WorkflowGraphEditActions } from './workflow_graph_actions_context';
import { toAnchorRect } from './workflow_graph_insert_control';

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
  readonly direction: LayoutDirection;
  readonly edit: WorkflowGraphEditActions;
}

/**
 * Edit-mode canvas overlays: the ghost "+" that appends another trigger.
 * Step insertion is node-anchored (connection ports) — not edge/end overlays.
 */
export function WorkflowGraphEditOverlays({
  nodes,
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

  const handleAddTrigger = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) =>
      edit.onInsert({ mode: 'trigger' }, toAnchorRect(e.currentTarget)),
    [edit]
  );

  const addTriggerLabel = i18n.translate('workflowsUi.graph.addTrigger', {
    defaultMessage: 'Add trigger',
  });

  if (!triggerBounds) return null;

  const ghostCenter = isHorizontal
    ? {
        x: (triggerBounds.minX + triggerBounds.maxX) / 2,
        y: triggerBounds.maxY + TRIGGER_GHOST_GAP + TRIGGER_GHOST_SIZE / 2,
      }
    : {
        x: triggerBounds.maxX + TRIGGER_GHOST_GAP + TRIGGER_GHOST_SIZE / 2,
        y: (triggerBounds.minY + triggerBounds.maxY) / 2,
      };

  return (
    <ViewportPortal>
      <div
        style={{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${ghostCenter.x}px, ${ghostCenter.y}px)`,
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
                // Fade only — size stays fixed (unlike port pins that spring-expand).
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
