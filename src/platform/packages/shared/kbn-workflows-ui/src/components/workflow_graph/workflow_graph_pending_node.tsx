/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { Position, useReactFlow, useStore, ViewportPortal } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { LayoutDirection } from '@kbn/workflows';
import type { InsertionPoints } from './compute_insertion_points';
import { computeEdgePath } from './compute_edge_path';
import { deslugifyStepName } from './deslugify_step_name';
import {
  computePendingInsertConnector,
  computePendingInsertOrigin,
  PENDING_NODE_HEIGHT,
  PENDING_NODE_WIDTH,
  type PendingInsertVisual,
} from './pending_insert';
import { useWorkflowGraphActions } from './workflow_graph_actions_context';
import {
  PORT_DOT_SIZE,
  STEP_PORT,
  errorPortEdgeStyle,
} from './port_geometry';
import { AiIcon } from '@kbn/shared-ux-ai-components';
import { aiIconTileCss } from './ai_icon_tile';
import { resolveNodeColors } from './workflow_graph_node';
import { getStepIconType } from '../step_icons';

export interface WorkflowGraphPendingNodeProps {
  readonly pending: PendingInsertVisual;
  readonly nodes: readonly Node[];
  readonly insertionPoints: InsertionPoints;
  readonly direction: LayoutDirection;
}

/**
 * In-progress insert indicator: empty dashed card while choosing an action,
 * then a filled solid preview (icon + title) while the config panel is open.
 * An overlay edge connects from the preceding node when one exists; on an empty
 * canvas the card is centered in the viewport instead.
 */
export function WorkflowGraphPendingNode({
  pending,
  nodes,
  insertionPoints,
  direction,
}: WorkflowGraphPendingNodeProps) {
  const { euiTheme } = useEuiTheme();
  const nodeShadow = useEuiShadow('xs', { border: 'none' });
  const { renderStepIcon } = useWorkflowGraphActions();
  const { getViewport } = useReactFlow();
  const viewportWidth = useStore((s) => s.width);
  const viewportHeight = useStore((s) => s.height);

  const layoutOrigin = useMemo(
    () => computePendingInsertOrigin(pending.context, nodes, insertionPoints, direction),
    [pending.context, nodes, insertionPoints, direction]
  );

  const origin = useMemo(() => {
    if (layoutOrigin) return layoutOrigin;
    // Empty-canvas insert: place the draft in the middle of the visible pane.
    if (pending.context.mode !== 'step' || viewportWidth <= 0 || viewportHeight <= 0) {
      return undefined;
    }
    const { x, y, zoom } = getViewport();
    return {
      x: (viewportWidth / 2 - x) / zoom - PENDING_NODE_WIDTH / 2,
      y: (viewportHeight / 2 - y) / zoom - PENDING_NODE_HEIGHT / 2,
    };
  }, [
    layoutOrigin,
    pending.context.mode,
    viewportWidth,
    viewportHeight,
    getViewport,
  ]);

  const connector = useMemo(
    () =>
      origin && layoutOrigin
        ? computePendingInsertConnector(
            pending.context,
            origin,
            nodes,
            insertionPoints,
            direction
          )
        : undefined,
    [pending.context, origin, layoutOrigin, nodes, insertionPoints, direction]
  );

  if (!origin) return null;

  const isConfiguring = pending.phase === 'configuring';
  const isHorizontal = direction === 'LR';
  const borderRadius = euiTheme.border.radius.small ?? 4;
  const ariaLabel = isConfiguring
    ? i18n.translate('workflowsUi.graph.pendingConfiguringAria', {
        defaultMessage: 'Adding step {label}',
        values: { label: pending.label },
      })
    : i18n.translate('workflowsUi.graph.pendingChoosingAria', {
        defaultMessage: 'Choose a step to add here',
      });

  const colors = isConfiguring
    ? resolveNodeColors(euiTheme, pending.stepType, false, {
        isRunning: false,
        isSuccess: false,
        isFailed: false,
      })
    : undefined;
  const iconType = isConfiguring ? getStepIconType(pending.stepType) : undefined;
  const displayLabel = isConfiguring ? deslugifyStepName(pending.label) : undefined;

  const edgeStroke = connector?.isFailure
    ? euiTheme.colors.danger
    : euiTheme.colors.borderBaseProminent;
  const edgePath = connector
    ? computeEdgePath({
        sourceX: connector.sourceX,
        sourceY: connector.sourceY,
        targetX: connector.targetX,
        targetY: connector.targetY,
        // Failure always leaves Bottom (orientation-invariant error port).
        // LR enters the left edge; TB enters the top.
        sourcePosition:
          connector.isFailure || !isHorizontal ? Position.Bottom : Position.Right,
        targetPosition: connector.isFailure
          ? isHorizontal
            ? Position.Left
            : Position.Top
          : isHorizontal
          ? Position.Left
          : Position.Top,
        isFailure: connector.isFailure,
      }).path
    : undefined;

  return (
    <ViewportPortal>
      {connector && edgePath && (
        <svg
          style={{
            position: 'absolute',
            overflow: 'visible',
            pointerEvents: 'none',
            width: 1,
            height: 1,
          }}
          aria-hidden={true}
          data-test-subj="workflowGraphPendingNodeEdge"
        >
          <defs>
            <marker
              id="workflowGraphPendingNodeArrow"
              markerWidth="6"
              markerHeight="6"
              refX="6"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L6,3 z" fill={edgeStroke} />
            </marker>
          </defs>
          <path
            d={edgePath}
            fill="none"
            stroke={edgeStroke}
            strokeWidth={1}
            markerEnd="url(#workflowGraphPendingNodeArrow)"
          />
        </svg>
      )}
      <div
        role="status"
        aria-label={ariaLabel}
        data-test-subj="workflowGraphPendingNode"
        data-phase={pending.phase}
        style={{
          position: 'absolute',
          transform: `translate(${origin.x}px, ${origin.y}px)`,
          width: PENDING_NODE_WIDTH,
          height: PENDING_NODE_HEIGHT,
          pointerEvents: 'none',
        }}
        css={[
          {
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            gap: euiTheme.size.m,
            padding: euiTheme.size.m,
            borderRadius,
            // Draft (choosing) stays dashed; selected/configuring uses a solid border.
            border: `${euiTheme.border.width.thin} ${isConfiguring ? 'solid' : 'dashed'} ${
              euiTheme.colors.borderBaseProminent
            }`,
            // Choosing stays empty (no chip/title); both phases use the plain panel fill.
            background: euiTheme.colors.backgroundBasePlain,
            overflow: 'visible',
          },
          nodeShadow,
        ]}
      >
        {isConfiguring && colors && iconType && (
          <>
            <div
              css={[
                {
                  flex: '0 0 auto',
                  alignSelf: 'stretch',
                  aspectRatio: '1 / 1',
                  width: 'auto',
                  borderRadius,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...(colors.chipUseAiGradient
                    ? {}
                    : {
                        background: colors.chipBackground,
                        border: `1px solid ${colors.chipBorder}`,
                      }),
                },
                colors.chipUseAiGradient ? aiIconTileCss({ euiTheme }) : {},
              ]}
              data-test-subj="workflowGraphPendingNodeChip"
            >
              {colors.chipUseAiGradient && iconType === 'sparkles' ? (
                <AiIcon iconType="sparkles" size="m" aria-hidden />
              ) : renderStepIcon ? (
                <div
                  css={[
                    { color: colors.chipIconColor, display: 'flex' },
                    colors.chipIconColor
                      ? { '& svg, & svg *': { fill: colors.chipIconColor } }
                      : undefined,
                  ]}
                >
                  {renderStepIcon({
                    stepType: pending.stepType,
                    isTrigger: false,
                    size: 'm',
                    color: colors.chipIconColor,
                  })}
                </div>
              ) : (
                <EuiIcon type={iconType} size="m" color={colors.chipIconColor} aria-hidden />
              )}
            </div>
            <span
              css={{
                flex: '1 1 auto',
                minWidth: 0,
                fontFamily: euiTheme.font.family,
                fontSize: 12,
                fontWeight: 500,
                lineHeight: '24px',
                color: euiTheme.colors.textHeading,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              data-test-subj="workflowGraphPendingNodeLabel"
              title={displayLabel}
            >
              {displayLabel}
            </span>
          </>
        )}
        <PendingDraftPorts isHorizontal={isHorizontal} />
      </div>
    </ViewportPortal>
  );
}

/** Decorative step + error ports — match real nodes even before a type is chosen. */
function PendingDraftPorts({ isHorizontal }: { readonly isHorizontal: boolean }) {
  const { euiTheme } = useEuiTheme();
  const pinBase = {
    position: 'absolute' as const,
    width: PORT_DOT_SIZE,
    height: PORT_DOT_SIZE,
    borderRadius: '50%',
    boxShadow: `0 0 0 2px ${euiTheme.colors.backgroundBasePlain}`,
    pointerEvents: 'none' as const,
  };

  return (
    <div
      data-test-subj="workflowGraphPendingNodePorts"
      css={{
        position: 'absolute',
        ...(isHorizontal
          ? { top: 0, bottom: 0, right: 0, width: 0, height: '100%' }
          : { left: 0, right: 0, bottom: 0, height: 0, width: '100%' }),
        overflow: 'visible',
        pointerEvents: 'none',
      }}
      aria-hidden={true}
    >
      <span
        data-test-subj="workflowGraphPendingPort-step"
        css={{
          ...pinBase,
          ...(isHorizontal
            ? {
                right: -(PORT_DOT_SIZE / 2),
                top: STEP_PORT,
                transform: 'translateY(-50%)',
              }
            : {
                left: STEP_PORT,
                bottom: -(PORT_DOT_SIZE / 2),
                transform: 'translateX(-50%)',
              }),
          background: euiTheme.colors.borderBaseProminent,
        }}
      />
      <span
        data-test-subj="workflowGraphPendingPort-error"
        css={{
          ...pinBase,
          ...errorPortEdgeStyle(PORT_DOT_SIZE / 2),
          background: euiTheme.colors.danger,
        }}
      />
    </div>
  );
}
