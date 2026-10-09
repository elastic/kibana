/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { Handle } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ERROR_PORT_ALONG } from './port_geometry';
import { WorkflowGraphActionsContext } from './workflow_graph_actions_context';
import type { WorkflowGraphEditActions } from './workflow_graph_actions_context';
import { WorkflowGraphForeachGroupNode } from './workflow_graph_foreach_group_node';

// Stub @xyflow/react's Handle as a spy — records calls so handle ids can be
// asserted, but has no React Flow context requirements.
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  Handle: jest.fn().mockReturnValue(null),
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

const mockHandle = Handle as unknown as jest.Mock;

describe('WorkflowGraphForeachGroupNode', () => {
  beforeEach(() => {
    mockHandle.mockClear();
  });

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

  it('renders a fallback handle so failure edges from foreach/while containers are not dropped', () => {
    renderGroup();
    const ids = mockHandle.mock.calls.map((args: [{ id?: string }]) => args[0]?.id).filter(Boolean);
    expect(ids).toContain('fallback');
  });

  it('positions the fallback handle at ERROR_PORT_ALONG, matching the red anchor', () => {
    renderGroup();
    const fallbackCall = mockHandle.mock.calls.find(
      (args: [{ id?: string }]) => args[0]?.id === 'fallback'
    );
    expect(fallbackCall?.[0].style).toMatchObject({ left: ERROR_PORT_ALONG });
    expect(fallbackCall?.[0].style.right).toBeUndefined();
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

  describe('empty-body add-first-step button', () => {
    const editActions: WorkflowGraphEditActions = {
      onInsert: jest.fn(),
      onEditStep: jest.fn(),
      onDeleteNode: jest.fn(),
    };

    const renderWithEdit = (data: Partial<ForeachGroupNodeData> = {}) =>
      render(
        <WorkflowGraphActionsContext.Provider value={{ edit: editActions }}>
          <WorkflowGraphForeachGroupNode {...makeNodeProps(data)} />
        </WorkflowGraphActionsContext.Provider>
      );

    it('renders the + button when hasBodySteps is false and edit is available', () => {
      renderWithEdit({ hasBodySteps: false } as any);
      expect(screen.getByTestId('workflowGraphForeachGroupAddFirstStep')).toBeInTheDocument();
    });

    it('does not render the + button when hasBodySteps is true', () => {
      renderWithEdit({ hasBodySteps: true } as any);
      expect(screen.queryByTestId('workflowGraphForeachGroupAddFirstStep')).not.toBeInTheDocument();
    });

    it('does not render the + button in read-only mode (no edit context)', () => {
      // The dashed body area is always shown for empty containers, but the
      // interactive + button requires edit context.
      renderGroup({ hasBodySteps: false } as any);
      expect(screen.queryByTestId('workflowGraphForeachGroupAddFirstStep')).not.toBeInTheDocument();
    });

    it('stops propagation on the + click so it cannot bubble into ReactFlow onNodeClick', () => {
      // If the click reaches ReactFlow's React synthetic event system it selects the
      // foreach and opens its edit panel, running replaceStepFragment on the foreach.
      // We wrap the component in a div with a React onClick to simulate onNodeClick,
      // then assert it never fires when the + button is clicked.
      const parentClickSpy = jest.fn();
      render(
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div onClick={parentClickSpy}>
          <WorkflowGraphActionsContext.Provider value={{ edit: editActions }}>
            <WorkflowGraphForeachGroupNode {...makeNodeProps({ hasBodySteps: false } as any)} />
          </WorkflowGraphActionsContext.Provider>
        </div>
      );
      fireEvent.click(screen.getByTestId('workflowGraphForeachGroupAddFirstStep'));
      // The click must not reach the React parent — if it did, ReactFlow's onNodeClick
      // would select the foreach and trigger its edit panel, deleting the foreach node.
      expect(parentClickSpy).not.toHaveBeenCalled();
    });
  });

  describe('3-dots action menu', () => {
    const editActions: WorkflowGraphEditActions = {
      onInsert: jest.fn(),
      onEditStep: jest.fn(),
      onDeleteNode: jest.fn(),
    };

    const renderWithEdit = (data: Partial<ForeachGroupNodeData> = {}) =>
      render(
        <WorkflowGraphActionsContext.Provider value={{ edit: editActions }}>
          <WorkflowGraphForeachGroupNode {...makeNodeProps(data)} />
        </WorkflowGraphActionsContext.Provider>
      );

    beforeEach(() => {
      (editActions.onEditStep as jest.Mock).mockClear();
      (editActions.onDeleteNode as jest.Mock).mockClear();
    });

    it('renders the 3-dots button in edit mode', () => {
      renderWithEdit();
      expect(screen.getByTestId('workflowGraphForeachGroupMenuButton')).toBeInTheDocument();
    });

    it('does not render the 3-dots button in read-only mode', () => {
      renderGroup();
      expect(screen.queryByTestId('workflowGraphForeachGroupMenuButton')).not.toBeInTheDocument();
    });

    it('calls onEditStep when Edit step is clicked', () => {
      renderWithEdit();
      fireEvent.click(screen.getByTestId('workflowGraphForeachGroupMenuButton'));
      fireEvent.click(screen.getByTestId('workflowGraphForeachGroupMenuEdit'));
      expect(editActions.onEditStep).toHaveBeenCalledWith('group-1');
    });

    it('calls onDeleteNode when Delete step is clicked', () => {
      renderWithEdit();
      fireEvent.click(screen.getByTestId('workflowGraphForeachGroupMenuButton'));
      fireEvent.click(screen.getByTestId('workflowGraphForeachGroupMenuDelete'));
      expect(editActions.onDeleteNode).toHaveBeenCalledWith('group-1');
    });
  });
});
