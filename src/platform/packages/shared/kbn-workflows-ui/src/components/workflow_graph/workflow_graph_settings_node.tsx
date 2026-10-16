/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiCanAnimate, euiFocusRing, EuiIcon, useEuiShadow, useEuiTheme } from '@elastic/eui';
import type { Node, NodeProps } from '@xyflow/react';
import React, { memo } from 'react';
import { nodeLabelTypography, selectionRingStyle } from './node_styles';
import { useWorkflowGraphActions } from './workflow_graph_actions_context';
import type { WorkflowSettingsNodeKind } from './workflow_graph_actions_context';

export type { WorkflowSettingsNodeKind };

export interface WorkflowGraphSettingsNodeData extends Record<string, unknown> {
  readonly kind: WorkflowSettingsNodeKind;
  readonly label: string;
  readonly subtitle: string;
  readonly iconType: string;
  /** Single-line, denser chrome for Option B Compact layout. */
  readonly compact?: boolean;
}

/** Matches `CHIP_SIZE` on step/trigger nodes. */
const CHIP_SIZE = 32;
const COMPACT_CHIP_SIZE = 24;

function WorkflowGraphSettingsNodeInner(node: NodeProps<Node<WorkflowGraphSettingsNodeData>>) {
  const { kind, label, subtitle, iconType, compact = false } = node.data;
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const nodeShadow = useEuiShadow('xs', { border: 'none' });
  const { onSettingsNodeSelect } = useWorkflowGraphActions();
  const isActive = node.selected;
  const borderRadius = euiTheme.border.radius.small;
  const chipSize = compact ? COMPACT_CHIP_SIZE : CHIP_SIZE;

  const select = () => {
    onSettingsNodeSelect?.(kind);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={compact ? label : `${label}: ${subtitle}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      }}
      data-test-subj={`workflowGraphSettingsNode-${kind}`}
      css={[
        {
          position: 'relative',
          width: '100%',
          height: '100%',
          background: euiTheme.colors.backgroundBasePlain,
          // Keep a stable thin border so selection never changes node size.
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
          borderRadius,
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          gap: compact ? euiTheme.size.s : euiTheme.size.m,
          padding: compact ? euiTheme.size.s : euiTheme.size.m,
          // Match step/trigger nodes: visible so the selection ring is not clipped.
          overflow: 'visible',
          [euiCanAnimate]: {
            transition: 'border-color 120ms ease, background 120ms ease, box-shadow 120ms ease',
          },
          cursor: 'pointer',
          '&:focus': { outline: 'none' },
          '&:focus-visible': euiFocusRing(euiThemeContext),
          '&::after': selectionRingStyle(euiTheme, isActive),
        },
        nodeShadow,
      ]}
    >
      <div
        css={{
          flex: '0 0 auto',
          width: chipSize,
          height: chipSize,
          background: euiTheme.colors.backgroundBaseSubdued,
          border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
          borderRadius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EuiIcon
          type={iconType}
          size={compact ? 's' : 'm'}
          color={euiTheme.colors.textSubdued}
          aria-hidden={true}
        />
      </div>

      <div
        css={{
          flex: '1 1 auto',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <span
          css={{
            ...nodeLabelTypography(euiTheme, '16px'),
            fontStyle: 'normal',
            color: euiTheme.colors.textHeading,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={label}
        >
          {label}
        </span>
        {compact ? null : (
          <span
            css={{
              fontFamily: euiTheme.font.family,
              fontSize: 11,
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: '14px',
              color: euiTheme.colors.textSubdued,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={subtitle}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

export const WorkflowGraphSettingsNode = memo(WorkflowGraphSettingsNodeInner);
