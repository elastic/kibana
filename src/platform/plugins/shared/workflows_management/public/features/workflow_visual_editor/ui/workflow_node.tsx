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
import type { EsWorkflowStepExecution, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { Node } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import React from 'react';
import type { NodeType } from '../lib/get_layouted_nodes_and_edges';
import { flowNodeTypes } from '../lib/get_layouted_nodes_and_edges';

const triggerNodeTypes = ['manual', 'alert', 'scheduled'];
const actionNodeTypes = ['console', 'slack', 'delay', 'inference.unified_inference'];

function getNodeIcon(nodeType: string, color: string) {
  switch (nodeType) {
    case 'if':
      return <EuiIcon type="logstashIf" color={color} />;
    case 'merge':
      return <EuiIcon type="logstashInput" color={color} />;
    case 'console':
      return <EuiIcon type="console" color={color} />;
    case 'slack':
      return <EuiIcon type="logoSlack" color={color} />;
    case 'inference.unified_inference':
      return <EuiIcon type="sparkles" color={color} />;
    case 'manual':
      return <EuiIcon type="accessibility" color={color} />;
    case 'alert':
      return <EuiIcon type="warning" color={color} />;
    case 'scheduled':
      return <EuiIcon type="clock" color={color} />;
    case 'delay':
      return <EuiIcon type="clock" color={color} />;
    default:
      return <EuiIcon type="info" color={color} />;
  }
}

function getIconColors(nodeType: NodeType, euiTheme: EuiThemeComputed) {
  if (flowNodeTypes.includes(nodeType)) {
    return {
      backgroundColor: euiTheme.colors.backgroundBaseWarning,
      color: euiTheme.colors.warning,
    };
  }
  if (actionNodeTypes.includes(nodeType)) {
    return {
      backgroundColor: '#F7F8FC',
      color: euiTheme.colors.textSubdued,
    };
  }
  if (triggerNodeTypes.includes(nodeType)) {
    return {
      backgroundColor: 'rgba(255, 199, 219, 0.3)',
      color: '#EE72A6',
    };
  }
  return {
    backgroundColor: euiTheme.colors.backgroundBasePrimary,
    color: euiTheme.colors.primary,
  };
}

function NodeIcon({ nodeType }: { nodeType: NodeType }) {
  const { euiTheme } = useEuiTheme();
  const { backgroundColor, color } = getIconColors(nodeType, euiTheme);
  return (
    <div
      css={{
        width: '36px',
        height: '36px',
        borderRadius: flowNodeTypes.includes(nodeType) ? '8px' : '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: flowNodeTypes.includes(nodeType) ? `1px solid ${color}` : 'none',
        backgroundColor,
      }}
    >
      {getNodeIcon(nodeType, color)}
    </div>
  );
}

interface WorkflowNodeData {
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

// @ts-expect-error - TODO: fix this
export function WorkflowGraphNode(node: Node<WorkflowNodeData>) {
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
          backgroundColor: euiTheme.colors.backgroundBasePlain,
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
          <EuiFlexItem grow={false}>
            <NodeIcon nodeType={node.data.stepType} />
          </EuiFlexItem>
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
                  {node.data.label}
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
