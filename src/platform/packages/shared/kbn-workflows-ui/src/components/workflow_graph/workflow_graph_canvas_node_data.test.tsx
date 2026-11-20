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
import type { PendingInsertVisual } from './pending_insert';
import type { NodeConfigWarningReason, RenderStepIcon } from './workflow_graph_actions_context';
import { WorkflowGraphCanvasWithoutProvider } from './workflow_graph_canvas';

// Integration-style checks for per-node volatile data (port targets, config
// warnings, pending error-path flag). Those used to travel through the shared
// actions context, which re-rendered every node on any change. They now ride on
// each node's `data`, so a change for node A must leave node B untouched.

interface MockFlowNode {
  readonly id: string;
  readonly type: string;
  readonly position: { x: number; y: number };
  readonly data: Record<string, unknown>;
  readonly selected?: boolean;
}

// Stable layout output (as the real hook produces between YAML edits).
const mockLayout: {
  nodes: MockFlowNode[];
  transformed: {
    nodeRefs: Record<string, { kind: 'step'; stepName: string }>;
    nodes: never[];
    edges: never[];
  };
} = {
  nodes: [
    {
      id: 'a',
      type: 'step',
      position: { x: 0, y: 0 },
      data: { label: 'step_a', stepType: 'http' },
    },
    {
      id: 'b',
      type: 'step',
      position: { x: 0, y: 150 },
      data: { label: 'step_b', stepType: 'console' },
    },
  ],
  transformed: {
    nodeRefs: {
      a: { kind: 'step', stepName: 'step_a' },
      b: { kind: 'step', stepName: 'step_b' },
    },
    nodes: [],
    edges: [],
  },
};

jest.mock('./use_workflow_layout', () => ({
  useWorkflowLayout: () => ({
    nodes: mockLayout.nodes,
    edges: [],
    transformed: mockLayout.transformed,
  }),
}));

let mockCapturedNodes: MockFlowNode[] = [];

// Render the real node components so memo / context behaviour is exercised.
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  ReactFlow: ({
    nodes,
    nodeTypes,
    children,
  }: {
    nodes: MockFlowNode[];
    nodeTypes: Record<string, React.ComponentType<Record<string, unknown>>>;
    children?: React.ReactNode;
  }) => {
    mockCapturedNodes = nodes;
    return (
      <div>
        {nodes.map((node) => {
          const NodeComponent = nodeTypes[node.type];
          return (
            <NodeComponent
              key={node.id}
              id={node.id}
              type={node.type}
              data={node.data}
              selected={Boolean(node.selected)}
              positionAbsoluteX={node.position.x}
              positionAbsoluteY={node.position.y}
              targetPosition="top"
              sourcePosition="bottom"
            />
          );
        })}
        {children}
      </div>
    );
  },
  Background: () => null,
  MiniMap: () => null,
  Panel: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  useUpdateNodeInternals: () => jest.fn(),
  useReactFlow: () => ({ zoomIn: jest.fn(), zoomOut: jest.fn() }),
  useStore: (selector: (s: { width: number; height: number }) => unknown) =>
    selector({ width: 0, height: 0 }),
  useNodesInitialized: () => false,
  ViewportPortal: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const makeWorkflow = (aFallback: boolean) => ({
  version: '1' as const,
  name: 'wf',
  enabled: true,
  triggers: [{ type: 'manual' as const }],
  steps: [
    {
      name: 'step_a',
      type: 'http',
      with: {},
      ...(aFallback
        ? { 'on-failure': { fallback: [{ name: 'fb', type: 'console', with: {} }] } }
        : {}),
    },
    { name: 'step_b', type: 'console', with: {} },
  ],
});

const edit = { onInsert: jest.fn(), onEditStep: jest.fn(), onDeleteNode: jest.fn() };
const onStepSelect = jest.fn();

interface Probe {
  readonly renderStepIcon: RenderStepIcon;
  readonly callsFor: (stepType: string) => number;
}

const createProbe = (): Probe => {
  const calls = new Map<string, number>();
  return {
    renderStepIcon: ({ stepType }) => {
      calls.set(stepType, (calls.get(stepType) ?? 0) + 1);
      return <span data-test-subj={`icon-${stepType}`} />;
    },
    callsFor: (stepType) => calls.get(stepType) ?? 0,
  };
};

const renderCanvas = (
  probe: Probe,
  overrides: {
    workflow?: ReturnType<typeof makeWorkflow>;
    nodeConfigWarnings?: ReadonlyMap<string, NodeConfigWarningReason>;
    pendingInsert?: PendingInsertVisual;
  } = {}
) => {
  const element = (props: typeof overrides) => (
    <WorkflowGraphCanvasWithoutProvider
      workflow={props.workflow ?? makeWorkflow(false)}
      isYamlValid
      onStepSelect={onStepSelect}
      edit={edit}
      suppressInsertionControls
      showMinimap={false}
      renderStepIcon={probe.renderStepIcon}
      nodeConfigWarnings={props.nodeConfigWarnings}
      pendingInsert={props.pendingInsert}
    />
  );
  const view = render(element(overrides));
  return {
    rerenderWith: (next: typeof overrides) => view.rerender(element(next)),
  };
};

const nodeById = (id: string): MockFlowNode => {
  const found = mockCapturedNodes.find((node) => node.id === id);
  if (!found) throw new Error(`node ${id} not rendered`);
  return found;
};

describe('WorkflowGraphCanvas per-node edit data', () => {
  it('re-renders only the affected node when a config warning changes', () => {
    const probe = createProbe();
    const { rerenderWith } = renderCanvas(probe);
    const bRendersBefore = probe.callsFor('console');
    const bBefore = nodeById('b');
    expect(bRendersBefore).toBeGreaterThan(0);

    rerenderWith({ nodeConfigWarnings: new Map([['a', 'incomplete' as const]]) });

    expect(screen.getAllByTestId('workflowGraphNodeIncomplete')).toHaveLength(1);
    expect(probe.callsFor('console')).toBe(bRendersBefore);
    expect(nodeById('b')).toBe(bBefore);
    expect(nodeById('a').data.configWarning).toBe('incomplete');
  });

  it('re-renders only the origin node when an error-path insert starts', () => {
    const probe = createProbe();
    const { rerenderWith } = renderCanvas(probe);
    const bRendersBefore = probe.callsFor('console');
    const bBefore = nodeById('b');

    rerenderWith({ pendingInsert: { phase: 'choosing', context: { mode: 'error', stepId: 'a' } } });

    const activePorts = screen
      .getAllByTestId('workflowGraphPort-error')
      .filter((port) => port.getAttribute('data-port-active') === 'true');
    expect(activePorts).toHaveLength(1);
    expect(nodeById('a').data.creatingErrorPath).toBe(true);
    expect(nodeById('b').data.creatingErrorPath).toBeUndefined();
    expect(probe.callsFor('console')).toBe(bRendersBefore);
    expect(nodeById('b')).toBe(bBefore);
  });

  it('keeps unchanged nodes referentially stable when a YAML edit recomputes the ports', () => {
    const probe = createProbe();
    const { rerenderWith } = renderCanvas(probe);
    const bRendersBefore = probe.callsFor('console');
    const bBefore = nodeById('b');
    const bPortsBefore = nodeById('b').data.portTargets;
    const aPortsBefore = nodeById('a').data.portTargets;
    expect(bPortsBefore).toBeDefined();

    // Fresh workflow object => fresh insertion-point entries for every node,
    // but only step_a's ports actually differ (fallback is now connected).
    rerenderWith({ workflow: makeWorkflow(true) });

    expect(nodeById('a').data.portTargets).not.toBe(aPortsBefore);
    expect(nodeById('b').data.portTargets).toBe(bPortsBefore);
    expect(nodeById('b')).toBe(bBefore);
    expect(probe.callsFor('console')).toBe(bRendersBefore);

    // A same-content workflow re-parse changes nothing at all.
    const aPortsAfter = nodeById('a').data.portTargets;
    rerenderWith({ workflow: makeWorkflow(true) });
    expect(nodeById('a').data.portTargets).toBe(aPortsAfter);
    expect(nodeById('b').data.portTargets).toBe(bPortsBefore);
  });

  it('does not decorate nodes in read-only mode', () => {
    const probe = createProbe();
    render(
      <WorkflowGraphCanvasWithoutProvider
        workflow={makeWorkflow(false)}
        isYamlValid
        onStepSelect={onStepSelect}
        showMinimap={false}
        renderStepIcon={probe.renderStepIcon}
      />
    );
    expect(nodeById('a')).toBe(mockLayout.nodes[0]);
    expect(nodeById('b')).toBe(mockLayout.nodes[1]);
  });
});
