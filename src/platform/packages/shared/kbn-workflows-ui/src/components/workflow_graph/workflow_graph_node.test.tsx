/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';
import {
  type WorkflowGraphActions,
  WorkflowGraphActionsContext,
} from './workflow_graph_actions_context';
import {
  resolveNodeColors,
  WorkflowGraphNode,
  type WorkflowGraphNodeData,
} from './workflow_graph_node';

// Stub @xyflow/react's Handle — it requires an internal React Flow context that
// isn't available in unit tests, and we're not testing connection logic here.
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom' },
}));

// Minimal NodeProps-shaped object for `WorkflowGraphNode`.
const makeNodeProps = (
  data: Partial<WorkflowGraphNodeData> = {},
  selected = false
): Parameters<typeof WorkflowGraphNode>[0] =>
  ({
    id: 'node-1',
    type: 'step',
    data: {
      label: 'Test Step',
      stepType: 'http',
      ...data,
    },
    selected,
    dragging: false,
    isConnectable: false,
    zIndex: 0,
    xPos: 0,
    yPos: 0,
    targetPosition: 'top' as any,
    sourcePosition: 'bottom' as any,
  } as any);

const renderNode = (
  data: Partial<WorkflowGraphNodeData> = {},
  selected = false,
  actions: WorkflowGraphActions = {}
) =>
  render(
    <WorkflowGraphActionsContext.Provider value={actions}>
      <WorkflowGraphNode {...makeNodeProps(data, selected)} />
    </WorkflowGraphActionsContext.Provider>
  );

describe('WorkflowGraphNode', () => {
  it('renders the deslugified step label in the accessible name', () => {
    renderNode({ label: 'my-step', stepType: 'http' });
    expect(screen.getByRole('button', { name: /My Step/ })).toBeInTheDocument();
  });

  it('includes the stepType in the accessible name', () => {
    renderNode({ label: 'fetch-data', stepType: 'elasticsearch' });
    expect(screen.getByRole('button', { name: /Fetch Data/ })).toBeInTheDocument();
  });

  it('shows "Completed successfully" status label on success', () => {
    renderNode({
      stepExecution: {
        id: 'e1',
        stepId: 'node-1',
        status: ExecutionStatus.COMPLETED,
      } as any,
    });
    expect(screen.getByLabelText('Completed successfully')).toBeInTheDocument();
  });

  it('shows "Failed" status label on failure', () => {
    renderNode({
      stepExecution: {
        id: 'e1',
        stepId: 'node-1',
        status: ExecutionStatus.FAILED,
      } as any,
    });
    expect(screen.getByLabelText('Failed')).toBeInTheDocument();
  });

  it('shows "Failed" status label on TIMED_OUT', () => {
    renderNode({
      stepExecution: {
        id: 'e1',
        stepId: 'node-1',
        status: ExecutionStatus.TIMED_OUT,
      } as any,
    });
    expect(screen.getByLabelText('Failed')).toBeInTheDocument();
  });

  it('shows "Running" status label for RUNNING', () => {
    renderNode({
      stepExecution: {
        id: 'e1',
        stepId: 'node-1',
        status: ExecutionStatus.RUNNING,
      } as any,
    });
    expect(screen.getByLabelText('Running')).toBeInTheDocument();
  });

  it('shows "Running" status label for WAITING_FOR_CHILD (foreach waiting on iterations)', () => {
    renderNode({
      stepExecution: {
        id: 'e1',
        stepId: 'node-1',
        status: ExecutionStatus.WAITING_FOR_CHILD,
      } as any,
    });
    expect(screen.getByLabelText('Running')).toBeInTheDocument();
  });

  it('shows no status icon for CANCELLED (neutral — not effective execution)', () => {
    renderNode({
      stepExecution: {
        id: 'e1',
        stepId: 'node-1',
        status: ExecutionStatus.CANCELLED,
      } as any,
    });
    expect(screen.queryByLabelText('Running')).toBeNull();
    expect(screen.queryByLabelText('Completed successfully')).toBeNull();
    expect(screen.queryByLabelText('Failed')).toBeNull();
  });

  it('shows no status icon for SKIPPED', () => {
    renderNode({
      stepExecution: {
        id: 'e1',
        stepId: 'node-1',
        status: ExecutionStatus.SKIPPED,
      } as any,
    });
    expect(screen.queryByLabelText('Running')).toBeNull();
    expect(screen.queryByLabelText('Completed successfully')).toBeNull();
    expect(screen.queryByLabelText('Failed')).toBeNull();
  });

  it('renders the retry badge when step has retry max-attempts', () => {
    renderNode({
      step: { retry: { 'max-attempts': 3 } },
    });
    expect(screen.getByTestId('workflowGraphNodeRetryBadge')).toBeInTheDocument();
  });

  it('renders the retry badge from on-failure.retry', () => {
    renderNode({
      step: { 'on-failure': { retry: { 'max-attempts': 2 } } },
    });
    expect(screen.getByTestId('workflowGraphNodeRetryBadge')).toBeInTheDocument();
  });

  it('does NOT render the retry badge when max-attempts is absent', () => {
    renderNode({ step: {} });
    expect(screen.queryByTestId('workflowGraphNodeRetryBadge')).toBeNull();
  });

  it('does not show run action in read-only mode', () => {
    renderNode({}, false, { onStepRun: jest.fn(), canRunSteps: false });

    fireEvent.mouseEnter(screen.getByRole('button', { name: /Test Step/ }));

    expect(screen.queryByTestId('workflowGraphNodeRunStep')).toBeNull();
  });

  it('shows run action when step runs are enabled', () => {
    renderNode({}, false, { onStepRun: jest.fn(), canRunSteps: true });

    fireEvent.mouseEnter(screen.getByRole('button', { name: /Test Step/ }));

    expect(screen.getByTestId('workflowGraphNodeRunStep')).toBeInTheDocument();
  });

  it('calls onStepSelect with the node id when Enter is pressed', () => {
    const onStepSelect = jest.fn();
    renderNode({}, false, { onStepSelect });

    const node = screen.getByRole('button', { name: /Test Step/ });
    fireEvent.keyDown(node, { key: 'Enter' });
    expect(onStepSelect).toHaveBeenCalledWith('node-1');
  });

  it('calls onStepSelect with the node id when Space is pressed', () => {
    const onStepSelect = jest.fn();
    renderNode({}, false, { onStepSelect });

    const node = screen.getByRole('button', { name: /Test Step/ });
    fireEvent.keyDown(node, { key: ' ' });
    expect(onStepSelect).toHaveBeenCalledWith('node-1');
  });

  it('does not call onStepSelect on other key presses', () => {
    const onStepSelect = jest.fn();
    renderNode({}, false, { onStepSelect });

    const node = screen.getByRole('button', { name: /Test Step/ });
    fireEvent.keyDown(node, { key: 'Escape' });
    expect(onStepSelect).not.toHaveBeenCalled();
  });

  it('includes execution status in the accessible name when an execution exists', () => {
    renderNode({
      label: 'step-x',
      stepExecution: {
        id: 'e2',
        stepId: 'node-1',
        status: ExecutionStatus.FAILED,
      } as any,
    });
    const node = screen.getByRole('button');
    expect(node.getAttribute('aria-label')).toContain(ExecutionStatus.FAILED);
  });

  it('renders a compact preview without the step label text', () => {
    const { queryByTitle } = renderNode({ label: 'hidden-label', preview: true });
    // In preview mode the outer div is an aria-label'd div, not a role=button,
    // and there is no label text rendered as a <span>.
    expect(queryByTitle('hidden-label')).toBeNull();
  });
});

describe('resolveNodeColors', () => {
  // Proxy returns the token name as its value — assertions stay readable.
  const theme = {
    colors: new Proxy({}, { get: (_t, prop) => (typeof prop === 'string' ? prop : String(prop)) }),
    border: { radius: { medium: 'medium-radius', small: 'small-radius' } },
  } as any;

  const idle = { isRunning: false, isSuccess: false, isFailed: false };
  const running = { isRunning: true, isSuccess: false, isFailed: false };
  const success = { isRunning: false, isSuccess: true, isFailed: false };
  const failed = { isRunning: false, isSuccess: false, isFailed: true };

  describe('cardBorderColor', () => {
    it('is neutral (borderBasePlain) when idle — no selection gate', () => {
      expect(resolveNodeColors(theme, 'external', idle).cardBorderColor).toBe('borderBasePlain');
    });

    it('is neutral when running — running never recolours the card border', () => {
      expect(resolveNodeColors(theme, 'external', running).cardBorderColor).toBe('borderBasePlain');
    });

    it('is success when completed, regardless of family', () => {
      expect(resolveNodeColors(theme, 'trigger', success).cardBorderColor).toBe('success');
      expect(resolveNodeColors(theme, 'external', success).cardBorderColor).toBe('success');
    });

    it('is danger when failed, regardless of family', () => {
      expect(resolveNodeColors(theme, 'code', failed).cardBorderColor).toBe('danger');
    });
  });

  describe('chip outcome overrides', () => {
    it('chip switches to success tokens on COMPLETED', () => {
      const { chip } = resolveNodeColors(theme, 'trigger', success);
      expect(chip.fill).toBe('backgroundBaseSuccess');
      expect(chip.border).toBe('success');
      expect(chip.icon).toBe('success');
    });

    it('chip switches to danger tokens on FAILED', () => {
      const { chip } = resolveNodeColors(theme, 'brand', failed);
      expect(chip.fill).toBe('backgroundBaseDanger');
      expect(chip.border).toBe('danger');
      expect(chip.icon).toBe('danger');
    });

    it('chip uses family colours when idle', () => {
      const { chip } = resolveNodeColors(theme, 'trigger', idle);
      expect(chip.fill).toBe('backgroundBaseAccent');
      expect(chip.border).toBe('borderBaseAccent');
      expect(chip.icon).toBe('textAccent');
    });

    it('chip uses family colours when running (outcome: none)', () => {
      const { chip } = resolveNodeColors(theme, 'flow', running);
      expect(chip.fill).toBe('backgroundBaseAccentSecondary');
    });
  });

  describe('forceFill', () => {
    it('is false when idle — brand logos keep their natural palette', () => {
      expect(resolveNodeColors(theme, 'brand', idle).forceFill).toBe(false);
    });

    it('is false when running', () => {
      expect(resolveNodeColors(theme, 'brand', running).forceFill).toBe(false);
    });

    it('is true when completed — every chip including brand gets recoloured', () => {
      expect(resolveNodeColors(theme, 'brand', success).forceFill).toBe(true);
    });

    it('is true when failed', () => {
      expect(resolveNodeColors(theme, 'external', failed).forceFill).toBe(true);
    });
  });

  describe('hasStatusIcon', () => {
    it('is false when idle', () => {
      expect(resolveNodeColors(theme, 'external', idle).hasStatusIcon).toBe(false);
    });

    it('is true when running', () => {
      expect(resolveNodeColors(theme, 'external', running).hasStatusIcon).toBe(true);
    });

    it('is true when completed', () => {
      expect(resolveNodeColors(theme, 'external', success).hasStatusIcon).toBe(true);
    });

    it('is true when failed', () => {
      expect(resolveNodeColors(theme, 'external', failed).hasStatusIcon).toBe(true);
    });
  });

  describe('retry badge tokens', () => {
    it('uses warning tokens for the retry badge', () => {
      const c = resolveNodeColors(theme, 'external', idle);
      expect(c.retryBadgeBg).toBe('backgroundBaseWarning');
      expect(c.retryBadgeBorderColor).toBe('borderBaseWarning');
      expect(c.retryBadgeColor).toBe('textWarning');
    });
  });
});
