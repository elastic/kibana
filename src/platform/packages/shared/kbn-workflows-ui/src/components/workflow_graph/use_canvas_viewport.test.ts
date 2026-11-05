/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import type { InternalNode, Node, ReactFlowInstance } from '@xyflow/react';
import { useCanvasViewport } from './use_canvas_viewport';
import { INITIAL_ZOOM } from './viewport_framing';

// The canvas is measured (the store knows its size) from the start. Whether React Flow reports
// the nodes as initialized is the part a test must control: in the app it stays false until a
// later node update, which is how the home frame used to fire on the first node click.
const mockStore = { width: 1000, height: 800 };
let mockNodesInitialized = false;
jest.mock('@xyflow/react', () => ({
  useStore: (selector: (state: typeof mockStore) => number) => selector(mockStore),
  useNodesInitialized: () => mockNodesInitialized,
}));

const NODE_WIDTH = 300;
const NODE_HEIGHT = 80;
const PANEL_INSET = 416;

// `inner` sits in the `loop` group: its `position` is relative to the group, while React Flow's
// internal node knows where it really is on the canvas.
const ABSOLUTE = { x: 140, y: 1160 };
const makeNode = (overrides: Partial<Node> & Pick<Node, 'id'>): Node => ({
  position: { x: 0, y: 0 },
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
  data: {},
  ...overrides,
});
const nodes = [
  makeNode({ id: 'trigger' }),
  makeNode({ id: 'loop', position: { x: 100, y: 1000 }, width: 600, height: 400 }),
  makeNode({ id: 'inner', parentId: 'loop', position: { x: 40, y: 160 } }),
];

const makeInstance = (zoom: number) =>
  ({
    setCenter: jest.fn(),
    getZoom: jest.fn(() => zoom),
    getNode: jest.fn((id: string) => nodes.find((node) => node.id === id)),
    getInternalNode: jest.fn((id: string) => {
      const node = nodes.find((candidate) => candidate.id === id);
      if (!node) return undefined;
      const positionAbsolute = id === 'inner' ? ABSOLUTE : node.position;
      return {
        ...node,
        measured: { width: NODE_WIDTH, height: NODE_HEIGHT },
        internals: { positionAbsolute },
      } as unknown as InternalNode;
    }),
    fitBounds: jest.fn(),
    fitView: jest.fn(),
  } as unknown as jest.Mocked<ReactFlowInstance>);

const baseParams = {
  nodes,
  direction: 'TB' as const,
  hasWorkflowStructure: true,
  fitView: false,
  fitViewOptions: undefined,
  defaultViewport: undefined,
  selectedNodePanelInset: undefined as number | undefined,
  panelFocusNodeId: undefined as string | undefined,
  onReady: undefined,
};

/** Where the viewport is centred to show `inner` beside a panel `PANEL_INSET` wide. */
const focusTarget = (zoom: number) => ({
  x: ABSOLUTE.x + NODE_WIDTH / 2 + PANEL_INSET / (2 * zoom),
  y: ABSOLUTE.y + NODE_HEIGHT / 2,
});

describe('useCanvasViewport', () => {
  beforeEach(() => {
    mockNodesInitialized = false;
  });

  it('frames the home view once the canvas is measured, without waiting for nodes to report as initialized', () => {
    const instance = makeInstance(INITIAL_ZOOM);
    const { result } = renderHook(() => useCanvasViewport(baseParams));

    act(() => result.current.handleInit(instance));

    expect(instance.setCenter).toHaveBeenCalledTimes(1);
    expect(instance.setCenter).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), {
      zoom: INITIAL_ZOOM,
      duration: 0,
    });
  });

  it('brings a clicked node inside a group beside the panel, by where it really is on the canvas', () => {
    const instance = makeInstance(INITIAL_ZOOM);
    const { result, rerender } = renderHook((params) => useCanvasViewport(params), {
      initialProps: baseParams,
    });
    act(() => result.current.handleInit(instance));

    instance.getZoom.mockReturnValue(0.5);
    rerender({ ...baseParams, panelFocusNodeId: 'inner', selectedNodePanelInset: PANEL_INSET });

    const { x, y } = focusTarget(0.5);
    expect(instance.setCenter).toHaveBeenLastCalledWith(x, y, { zoom: 0.5, duration: 220 });
  });

  it('keeps the user’s zoom when a node is clicked and the panel opens', () => {
    const instance = makeInstance(INITIAL_ZOOM);
    const { result, rerender } = renderHook((params) => useCanvasViewport(params), {
      initialProps: baseParams,
    });
    act(() => result.current.handleInit(instance));

    // The user zooms out, then clicks a node: the panel opens and the node is brought beside it.
    instance.getZoom.mockReturnValue(0.5);
    const clicked = { ...baseParams, panelFocusNodeId: 'inner', selectedNodePanelInset: 416 };
    rerender(clicked);
    const callsAfterClick = instance.setCenter.mock.calls.length;

    // React Flow reporting the nodes as initialized (it does so on the first node update) must not
    // re-apply the home frame over the zoom and position the user chose.
    mockNodesInitialized = true;
    rerender(clicked);

    expect(instance.setCenter.mock.calls.slice(callsAfterClick)).toEqual([]);
  });

  it('opens centred on the node that is already selected when the page loads with one', () => {
    const instance = makeInstance(INITIAL_ZOOM);
    const { result } = renderHook(() =>
      useCanvasViewport({
        ...baseParams,
        panelFocusNodeId: 'inner',
        selectedNodePanelInset: PANEL_INSET,
      })
    );

    act(() => result.current.handleInit(instance));

    // Not the home frame, which would show the top of the graph with the node out of sight.
    const { x, y } = focusTarget(INITIAL_ZOOM);
    expect(instance.setCenter).toHaveBeenCalledWith(x, y, { zoom: INITIAL_ZOOM, duration: 0 });
    expect(instance.setCenter).toHaveBeenCalledTimes(1);
  });
});
