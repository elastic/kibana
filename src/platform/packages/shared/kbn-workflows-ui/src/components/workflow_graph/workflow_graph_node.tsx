/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, euiShadow, transparentize, useEuiTheme } from '@elastic/eui';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import React from 'react';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { FLOW_CONTROL_STEP_TYPES, TRIGGER_STEP_TYPES } from '@kbn/workflows';
import { StatusGlyph } from './status_glyph';

export interface WorkflowGraphNodeData extends Record<string, unknown> {
  label: string;
  stepType: string;
  isTrigger?: boolean;
  stepExecution?: WorkflowStepExecutionDto;
  matchesSearch?: boolean;
  searchActive?: boolean;
}

const STEP_TYPE_ICON: Record<string, string> = {
  if: 'branch',
  foreach: 'refresh',
  parallel: 'visGoal',
  merge: 'merge',
  atomic: 'package',
  manual: 'play',
  alert: 'bell',
  scheduled: 'clock',
  wait: 'clock',
  http: 'globe',
  elasticsearch: 'logoElasticsearch',
  kibana: 'logoKibana',
};

function getNodeIcon(stepType: string): string {
  const base = stepType.split('.')[0];
  return STEP_TYPE_ICON[base] ?? 'package';
}

function getAccent(
  stepType: string,
  isTrigger: boolean | undefined,
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']
) {
  if (isTrigger || TRIGGER_STEP_TYPES.has(stepType)) {
    return {
      iconColor: euiTheme.colors.vis.euiColorVis6,
      iconBg: transparentize(euiTheme.colors.vis.euiColorVis6, 0.1),
      iconBorder: euiTheme.colors.vis.euiColorVis6,
    };
  }
  if (FLOW_CONTROL_STEP_TYPES.has(stepType)) {
    return {
      iconColor: euiTheme.colors.warning,
      iconBg: transparentize(euiTheme.colors.warning, 0.1),
      iconBorder: euiTheme.colors.warning,
    };
  }
  return {
    iconColor: euiTheme.colors.textSubdued,
    iconBg: euiTheme.colors.backgroundBasePlain,
    iconBorder: euiTheme.colors.borderBaseSubdued,
  };
}

export function WorkflowGraphNode(node: NodeProps<Node<WorkflowGraphNodeData>>) {
  const ctx = useEuiTheme();
  const { euiTheme } = ctx;
  const { stepType, label, isTrigger, stepExecution, matchesSearch, searchActive } = node.data;
  const accent = getAccent(stepType, isTrigger, euiTheme);
  const dimmed = searchActive && !matchesSearch;
  const iconType = getNodeIcon(stepType);

  return (
    <>
      {!isTrigger && <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />}
      <div
        aria-label={`${stepType} step: ${label}${
          stepExecution?.status ? `, status: ${stepExecution.status}` : ''
        }`}
        css={[
          {
            position: 'relative',
            width: '100%',
            height: '100%',
            background: euiTheme.colors.backgroundBasePlain,
            border: `1px solid ${
              node.selected ? euiTheme.colors.primary : euiTheme.colors.borderBasePlain
            }`,
            borderRadius: 8,
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            opacity: dimmed ? 0.4 : 1,
            transition: 'opacity 120ms ease, border-color 120ms ease',
          },
          euiShadow(ctx, 'xs', { direction: 'down' }),
        ]}
      >
        <div
          css={{
            flex: '0 0 auto',
            width: 28,
            height: 28,
            borderRadius: isTrigger ? '50%' : 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: accent.iconBg,
            border: `1px solid ${accent.iconBorder}`,
          }}
        >
          <EuiIcon type={iconType} color={accent.iconColor} size="m" />
        </div>
        <span
          css={{
            flex: '1 1 auto',
            fontSize: 14,
            fontWeight: 600,
            color: euiTheme.colors.textHeading,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}
          title={label}
        >
          {label}
        </span>
        <StatusGlyph status={stepExecution?.status ?? null} />
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}
