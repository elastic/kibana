/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import type { Node, NodeProps } from '@xyflow/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { WorkflowGraphForeachGroupNode } from './workflow_graph_foreach_group_node';

// Stub @xyflow/react's Handle — it requires an internal React Flow context that
// isn't available in unit tests, and we're not testing connection logic here.
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom' },
}));

interface ForeachGroupNodeData extends Record<string, unknown> {
  readonly label: string;
  readonly stepType: string;
  readonly stepExecution?: WorkflowStepExecutionDto;
}

// Constructs a minimal but fully-typed WorkflowStepExecutionDto. The component
// reads only `.status`; the other required fields carry sentinel values.
const makeExecution = (status: ExecutionStatus): WorkflowStepExecutionDto => ({
  id: 'e1',
  stepId: 'group-1',
  status,
  scopeStack: [],
  workflowRunId: 'run-1',
  workflowId: 'wf-1',
  startedAt: '2024-01-01T00:00:00.000Z',
  topologicalIndex: 0,
  globalExecutionIndex: 0,
  stepExecutionIndex: 0,
});

// Minimal NodeProps-shaped object for `WorkflowGraphForeachGroupNode`.
const makeNodeProps = (
  data: Partial<ForeachGroupNodeData> = {}
): NodeProps<Node<ForeachGroupNodeData>> =>
  ({
    id: 'group-1',
    type: 'foreachGroup',
    data: {
      label: 'per-extension',
      stepType: 'foreach',
      ...data,
    },
    selected: false,
    dragging: false,
    isConnectable: false,
    zIndex: 0,
    xPos: 0,
    yPos: 0,
    targetPosition: 'top' as any,
    sourcePosition: 'bottom' as any,
  } as unknown as NodeProps<Node<ForeachGroupNodeData>>);

const renderGroup = (data: Partial<ForeachGroupNodeData> = {}) =>
  render(<WorkflowGraphForeachGroupNode {...makeNodeProps(data)} />);

describe('WorkflowGraphForeachGroupNode', () => {
  it('renders the deslugified label', () => {
    renderGroup({ label: 'per-extension', stepType: 'foreach' });
    expect(screen.getByTitle('Per Extension')).toBeInTheDocument();
    expect(screen.getByText('Per Extension')).toBeInTheDocument();
  });

  it('renders the refresh icon for foreach', () => {
    const { container } = renderGroup({ stepType: 'foreach' });
    expect(container.querySelector('[data-euiicon-type="refresh"]')).toBeInTheDocument();
  });

  it('renders the refresh icon for while', () => {
    const { container } = renderGroup({ stepType: 'while' });
    expect(container.querySelector('[data-euiicon-type="refresh"]')).toBeInTheDocument();
  });

  it('renders the icon inside the chip', () => {
    renderGroup();
    const chip = screen.getByTestId('workflowGraphForeachGroupChip');
    expect(chip.querySelector('[data-euiicon-type="refresh"]')).toBeInTheDocument();
  });

  describe('execution outcome colours', () => {
    // EuiIcon renders its `color` prop as a DOM attribute — use that to assert
    // that different execution states produce distinct colours. Each render is
    // isolated in its own container so querySelector never crosses renders.
    const iconColor = (status?: ExecutionStatus): string | null => {
      const { container } = renderGroup({
        stepExecution: status ? makeExecution(status) : undefined,
      });
      return (
        container
          .querySelector('[data-test-subj="workflowGraphForeachGroupChip"] [data-euiicon-type]')
          ?.getAttribute('color') ?? null
      );
    };

    it('chip icon colour differs between idle, COMPLETED, and FAILED', () => {
      const idle = iconColor();
      const completed = iconColor(ExecutionStatus.COMPLETED);
      const failed = iconColor(ExecutionStatus.FAILED);
      expect(completed).not.toBe(idle);
      expect(failed).not.toBe(idle);
      expect(completed).not.toBe(failed);
    });

    it('TIMED_OUT chip icon colour matches FAILED', () => {
      expect(iconColor(ExecutionStatus.TIMED_OUT)).toBe(iconColor(ExecutionStatus.FAILED));
    });

    it('RUNNING chip icon colour matches idle — running never recolours the chip', () => {
      expect(iconColor(ExecutionStatus.RUNNING)).toBe(iconColor());
    });

    it('treats CANCELLED as neutral, matching the step card', () => {
      // The old implementation tinted CANCELLED as failure (red chip). The
      // container now uses resolveExecutionState — same as step cards — which
      // explicitly buckets CANCELLED as neutral: not an effective execution
      // outcome. This test is the regression guard for that behaviour change.
      expect(iconColor(ExecutionStatus.CANCELLED)).toBe(iconColor());
    });
  });
});
