/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowGraphEditActions } from './workflow_graph_actions_context';
import { WorkflowGraphCanvasWithoutProvider } from './workflow_graph_canvas';

jest.mock('./ensure_eui_icons', () => ({ ensureWorkflowGraphEuiIcons: jest.fn() }));

const mockNodes = [
  { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, width: 200, height: 64, data: {} },
  { id: 'step1', type: 'step', position: { x: 0, y: 150 }, width: 200, height: 64, data: {} },
];

jest.mock('./use_workflow_layout', () => ({
  useWorkflowLayout: () => ({
    nodes: mockNodes,
    edges: [],
    transformed: { nodeRefs: {}, edges: [], nodes: [], forkNodeToJoinId: new Map() },
  }),
}));

// The slide itself is covered by `use_insert_layout_animation.test.ts`; here the
// canvas only needs to react to `isSliding`.
let mockIsSliding = false;
jest.mock('./use_insert_layout_animation', () => ({
  ...jest.requireActual('./use_insert_layout_animation'),
  useInsertLayoutAnimation: ({ nodes, edges }: { nodes: unknown[]; edges: unknown[] }) => ({
    nodes,
    edges,
    isSliding: mockIsSliding,
  }),
}));

const mockOverlayRender = jest.fn();
jest.mock('./workflow_graph_edit_overlays', () => ({
  WorkflowGraphEditOverlays: () => {
    mockOverlayRender();
    return <div data-test-subj="editOverlays" />;
  },
  WorkflowGraphEmptyAddTrigger: () => null,
}));

jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-test-subj="reactflow-mock">{children}</div>
  ),
  Background: () => null,
  MiniMap: () => null,
  Panel: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Handle: () => null,
  useReactFlow: () => ({
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  }),
  useStore: (selector: (s: { width: number; height: number }) => unknown) =>
    selector({ width: 0, height: 0 }),
  useNodesInitialized: () => false,
  ViewportPortal: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const workflow: WorkflowYaml = {
  version: '1',
  name: 'wf',
  enabled: true,
  triggers: [{ type: 'manual' }],
  steps: [{ name: 'step1', type: 'console', with: { message: 'hi' } }],
};

const edit: WorkflowGraphEditActions = {
  onInsert: jest.fn(),
  onEditStep: jest.fn(),
  onDeleteNode: jest.fn(),
};

const renderCanvas = () =>
  render(
    <WorkflowGraphCanvasWithoutProvider
      workflow={workflow}
      isYamlValid
      onStepSelect={jest.fn()}
      edit={edit}
    />
  );

describe('WorkflowGraphCanvas edit overlays during the insert slide', () => {
  beforeEach(() => {
    mockIsSliding = false;
    mockOverlayRender.mockClear();
  });

  it('shows the edit overlays when no slide is running', () => {
    renderCanvas();

    expect(screen.getByTestId('editOverlays')).toBeInTheDocument();
  });

  it('does not mount (or recompute) the edit overlays while nodes are sliding', () => {
    mockIsSliding = true;
    renderCanvas();

    expect(screen.queryByTestId('editOverlays')).not.toBeInTheDocument();
    expect(mockOverlayRender).not.toHaveBeenCalled();
  });

  it('brings the overlays back once the slide ends', () => {
    mockIsSliding = true;
    const { rerender } = renderCanvas();
    expect(screen.queryByTestId('editOverlays')).not.toBeInTheDocument();

    mockIsSliding = false;
    rerender(
      <WorkflowGraphCanvasWithoutProvider
        workflow={workflow}
        isYamlValid
        onStepSelect={jest.fn()}
        edit={edit}
      />
    );

    expect(screen.getByTestId('editOverlays')).toBeInTheDocument();
  });
});
