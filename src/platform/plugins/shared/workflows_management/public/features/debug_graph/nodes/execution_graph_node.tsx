/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import type { Node } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';
import type { EsWorkflowStepExecution, WorkflowYaml } from '@kbn/workflows';
import type { NodeType } from './types';
import { atomicNodes, mainScopeNodes, secondaryScopeNodes } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface WorkflowNodeData extends Record<string, any> {
  stepType: NodeType;
  label: string;
  step: WorkflowYaml['steps'][number];
  stepExecution?: EsWorkflowStepExecution;
}

const getNodeBorderColor = (status: ExecutionStatus | undefined, euiTheme: EuiThemeComputed) => {
  if (!status) {
    return 'transparent';
  }
  switch (status) {
    case ExecutionStatus.FAILED:
      return euiTheme.colors.danger;
    case ExecutionStatus.COMPLETED:
      return '#16C5C0';
    case ExecutionStatus.PENDING:
      return euiTheme.colors.borderBaseNeutral;
    case ExecutionStatus.RUNNING:
      return euiTheme.colors.borderBaseNeutral;
    case ExecutionStatus.CANCELLED:
      return euiTheme.colors.borderBaseNeutral;
    case ExecutionStatus.SKIPPED:
      return euiTheme.colors.borderBaseNeutral;
    case ExecutionStatus.WAITING_FOR_INPUT:
      return euiTheme.colors.borderBaseNeutral;
    default:
      return 'transparent';
  }
};

const getNodeBackgroundColor = (nodeType: string, euiTheme: EuiThemeComputed) => {
  if (mainScopeNodes.includes(nodeType)) {
    return {
      backgroundColor: euiTheme.colors.backgroundBaseWarning,
      color: euiTheme.colors.warning,
    };
  }
  if (secondaryScopeNodes.includes(nodeType)) {
    return {
      backgroundColor: euiTheme.colors.backgroundBaseSuccess,
      color: euiTheme.colors.success,
    };
  }
  if (atomicNodes.includes(nodeType)) {
    return {
      backgroundColor: euiTheme.colors.backgroundBasePrimary,
      color: euiTheme.colors.primary,
    };
  }
  return {
    backgroundColor: euiTheme.colors.backgroundBasePrimary,
    color: euiTheme.colors.primary,
  };
};

export function ExecutionGraphNode(node: Node<WorkflowNodeData>) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      css={{
        width: '100%',
        height: '100%',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <EuiFlexItem
        css={{
          width: '100%',
          height: '100%',
          backgroundColor: getNodeBackgroundColor(node.data.stepType, euiTheme).backgroundColor,
          borderRadius: '8px',
          padding: '8px 12px',
          boxShadow:
            '0px 2px 8px 0px rgba(43,57,79,0.05), 0px 1px 4px 0px rgba(43,57,79,0.06), 0px 0px 2px 0px rgba(43,57,79,0.16)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: `1px solid ${getNodeBorderColor(node.data.stepExecution?.status, euiTheme)}`,
        }}
      >
        <EuiFlexGroup css={{ flex: 1, width: '100%' }} alignItems="center" gutterSize="m">
          <EuiFlexItem css={{ flex: 1 }}>
            <EuiFlexGroup
              alignItems="flexStart"
              direction="column"
              css={{ gap: '4px', flex: 1, width: '100%' }}
            >
              <EuiFlexItem css={{ width: '100%' }}>
                <span
                  css={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: euiTheme.colors.textHeading,
                    lineHeight: '1.25',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    title={node.data.label}
                    css={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '160px',
                    }}
                  >
                    {node.data.label}
                  </span>
                  {node.data.stepExecution?.status === ExecutionStatus.COMPLETED && (
                    <EuiIcon type="checkInCircleFilled" color="#16C5C0" />
                  )}
                  {node.data.stepExecution?.status === ExecutionStatus.FAILED && (
                    <EuiIcon type="alert" color={euiTheme.colors.danger} />
                  )}
                </span>
                <div
                  css={{
                    fontSize: '12px',
                    color: euiTheme.colors.textSubdued,
                  }}
                >
                  {node.data.stepType}
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <Handle type="source" position={Position.Bottom} />
    </EuiFlexGroup>
  );
}
