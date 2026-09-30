/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { InsertionPoints } from './compute_insertion_points';
import { PENDING_NODE_HEIGHT, PENDING_NODE_WIDTH } from './pending_insert';
import { WorkflowGraphActionsContext } from './workflow_graph_actions_context';
import { WorkflowGraphPendingNode } from './workflow_graph_pending_node';

const mockGetViewport = jest.fn(() => ({ x: 0, y: 0, zoom: 1 }));

jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  ViewportPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReactFlow: () => ({ getViewport: mockGetViewport }),
  useStore: (selector: (s: { width: number; height: number }) => unknown) =>
    selector({ width: 1000, height: 800 }),
}));

const insertionPoints: InsertionPoints = {
  byNodeId: new Map(),
  topLevelStepNodeIds: ['a'],
};

const nodes: Node[] = [
  {
    id: 'manual',
    type: 'trigger',
    position: { x: 0, y: 0 },
    width: PENDING_NODE_WIDTH,
    height: PENDING_NODE_HEIGHT,
    data: {},
  },
  {
    id: 'a',
    type: 'step',
    position: { x: 0, y: 100 },
    width: PENDING_NODE_WIDTH,
    height: PENDING_NODE_HEIGHT,
    data: {},
  },
];

const renderPending = (
  pending: React.ComponentProps<typeof WorkflowGraphPendingNode>['pending'],
  overrides?: {
    readonly nodes?: readonly Node[];
    readonly insertionPoints?: InsertionPoints;
  }
) =>
  render(
    <I18nProvider>
      <WorkflowGraphActionsContext.Provider value={{}}>
        <WorkflowGraphPendingNode
          pending={pending}
          nodes={overrides?.nodes ?? nodes}
          insertionPoints={overrides?.insertionPoints ?? insertionPoints}
          direction="TB"
        />
      </WorkflowGraphActionsContext.Provider>
    </I18nProvider>
  );

describe('WorkflowGraphPendingNode', () => {
  beforeEach(() => {
    mockGetViewport.mockReturnValue({ x: 0, y: 0, zoom: 1 });
  });

  it('renders an empty dashed card with step+error ports while choosing', () => {
    renderPending({ phase: 'choosing', context: { mode: 'step', sourceNodeId: 'a' } });
    const card = screen.getByTestId('workflowGraphPendingNode');
    expect(card).toHaveAttribute('data-phase', 'choosing');
    expect(screen.queryByTestId('workflowGraphPendingNodeChip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowGraphPendingNodeLabel')).not.toBeInTheDocument();
    expect(getComputedStyle(card).borderStyle).toBe('dashed');
    expect(screen.getByTestId('workflowGraphPendingNodeEdge')).toBeInTheDocument();
    expect(screen.getByTestId('workflowGraphPendingPort-step')).toBeInTheDocument();
    expect(screen.getByTestId('workflowGraphPendingPort-error')).toBeInTheDocument();
  });

  it('renders a solid selected card with icon and title while configuring', () => {
    renderPending({
      phase: 'configuring',
      context: { mode: 'step', sourceNodeId: 'a' },
      stepType: 'console',
      label: 'console_step',
    });
    expect(screen.getByTestId('workflowGraphPendingNode')).toHaveAttribute(
      'data-phase',
      'configuring'
    );
    expect(screen.getByTestId('workflowGraphPendingNodeChip')).toBeInTheDocument();
    expect(screen.getByTestId('workflowGraphPendingNodeLabel')).toHaveTextContent('Console Step');
    expect(getComputedStyle(screen.getByTestId('workflowGraphPendingNode')).borderStyle).toBe(
      'solid'
    );
    expect(screen.getByTestId('workflowGraphPendingNodeEdge')).toBeInTheDocument();
    expect(screen.getByTestId('workflowGraphPendingPort-step')).toBeInTheDocument();
    expect(screen.getByTestId('workflowGraphPendingPort-error')).toBeInTheDocument();
  });

  it('does not render a connector edge for error-path pending inserts (known deviation #4)', () => {
    // computePendingErrorBranchPlacement is stubbed to undefined until the
    // reservedLanes-based placement is wired up (ADR-0012 + known deviation #4).
    // The origin is undefined → no connector edge is rendered.
    renderPending({ phase: 'choosing', context: { mode: 'error', stepId: 'a' } });
    expect(screen.queryByTestId('workflowGraphPendingNodeEdge')).not.toBeInTheDocument();
  });

  it('centers the draft on an empty canvas without a connector edge', () => {
    renderPending(
      {
        phase: 'configuring',
        context: { mode: 'step' },
        stepType: 'ai.classify',
        label: 'ai_classify_step',
      },
      {
        nodes: [],
        insertionPoints: { byNodeId: new Map(), topLevelStepNodeIds: [] },
      }
    );
    const card = screen.getByTestId('workflowGraphPendingNode');
    expect(screen.queryByTestId('workflowGraphPendingNodeEdge')).not.toBeInTheDocument();
    expect(card.style.transform).toBe(
      `translate(${1000 / 2 - PENDING_NODE_WIDTH / 2}px, ${800 / 2 - PENDING_NODE_HEIGHT / 2}px)`
    );
  });

  it('centers a trigger draft on an empty canvas without a connector edge', () => {
    renderPending(
      {
        phase: 'configuring',
        context: { mode: 'trigger' },
        stepType: 'manual',
        label: 'Manual',
      },
      {
        nodes: [],
        insertionPoints: { byNodeId: new Map(), topLevelStepNodeIds: [] },
      }
    );
    const card = screen.getByTestId('workflowGraphPendingNode');
    expect(screen.queryByTestId('workflowGraphPendingNodeEdge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowGraphPendingPort-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowGraphPendingNodeLabel')).toHaveTextContent('Manual');
    expect(card.style.transform).toBe(
      `translate(${1000 / 2 - PENDING_NODE_WIDTH / 2}px, ${800 / 2 - PENDING_NODE_HEIGHT / 2}px)`
    );
  });
});
