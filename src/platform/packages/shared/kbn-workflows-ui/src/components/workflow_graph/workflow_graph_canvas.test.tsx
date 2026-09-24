/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { WorkflowGraphCanvasWithoutProvider } from './workflow_graph_canvas';

// Mutable state driving the mocked React Flow store. `let mock*` names are the
// only identifiers a jest factory may close over; they're read at render time
// (long after module init), so no TDZ issue.
let mockStoreWidth = 0;
let mockStoreHeight = 0;
let mockNodesInitialized = false;
let mockCapturedOnInit: ((instance: unknown) => void) | undefined;

// A minimal two-node layout (trigger + one step). graphBounds derived from this:
// minX=0, minY=0, maxX=200, maxY=214 => centerX=100.
const mockNodes = [
  { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, width: 200, height: 64, data: {} },
  { id: 'step1', type: 'step', position: { x: 0, y: 150 }, width: 200, height: 64, data: {} },
];
const EXPECTED_CENTER_X = 100;

jest.mock('./use_workflow_layout', () => ({
  useWorkflowLayout: () => ({
    nodes: mockNodes,
    edges: [],
    transformed: { nodeRefs: {}, edges: [], nodes: [] },
  }),
}));

// Replace React Flow with light stand-ins: `ReactFlow` captures the `onInit`
// callback and interaction props, and renders its children; the store hooks
// return our controllable measured dimensions. jsdom never lays the canvas
// out, so injecting the dimensions through `useStore`/`useNodesInitialized`
// is the only way to exercise the "measured vs. not-yet-measured" branch.
let mockCapturedReactFlowProps: Record<string, unknown> | undefined;

jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  ReactFlow: ({
    onInit,
    children,
    ...rest
  }: {
    onInit?: (i: unknown) => void;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => {
    mockCapturedOnInit = onInit;
    mockCapturedReactFlowProps = rest;
    return <div data-test-subj="reactflow-mock">{children}</div>;
  },
  Background: () => null,
  MiniMap: () => null,
  Panel: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Handle: () => null,
  useReactFlow: () => ({ zoomIn: jest.fn(), zoomOut: jest.fn() }),
  useStore: (selector: (s: { width: number; height: number }) => unknown) =>
    selector({ width: mockStoreWidth, height: mockStoreHeight }),
  useNodesInitialized: () => mockNodesInitialized,
  ViewportPortal: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const makeInstance = () => ({ setCenter: jest.fn(), fitView: jest.fn(), fitBounds: jest.fn() });

/** Flush the double-rAF used when centering after empty → structure. */
const flushHomeViewportRaf = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
};

/** Workflow with at least one trigger — navigation chrome is visible. */
const structuredWorkflow = {
  version: '1' as const,
  name: 'structured',
  enabled: true,
  triggers: [{ type: 'manual' as const }],
  steps: [],
};

/** Empty creation state — no trigger and no steps. */
const emptyWorkflow = {
  version: '1' as const,
  name: 'empty',
  enabled: true,
  triggers: [],
  steps: [],
};

const baseProps = {
  workflow: structuredWorkflow,
  isYamlValid: true,
  onStepSelect: jest.fn(),
} as const;

const measureCanvas = () => {
  mockStoreWidth = 1200;
  mockStoreHeight = 900;
  mockNodesInitialized = true;
};

describe('WorkflowGraphCanvas initial centering', () => {
  beforeEach(() => {
    mockStoreWidth = 0;
    mockStoreHeight = 0;
    mockNodesInitialized = false;
    mockCapturedOnInit = undefined;
    mockCapturedReactFlowProps = undefined;
  });

  it('does not center the viewport until the canvas has been measured', () => {
    const instance = makeInstance();
    const { rerender } = render(<WorkflowGraphCanvasWithoutProvider {...baseProps} />);

    // React Flow fires onInit before its ResizeObserver measures the container.
    act(() => mockCapturedOnInit!(instance));
    expect(instance.setCenter).not.toHaveBeenCalled();

    // Once the store reports real dimensions, centering runs.
    measureCanvas();
    rerender(<WorkflowGraphCanvasWithoutProvider {...baseProps} />);

    expect(instance.setCenter).toHaveBeenCalledTimes(1);
    expect(instance.setCenter).toHaveBeenCalledWith(
      EXPECTED_CENTER_X,
      expect.any(Number),
      expect.objectContaining({ zoom: 1 })
    );
  });

  it('centers exactly once even as dimensions keep updating', () => {
    const instance = makeInstance();
    const { rerender } = render(<WorkflowGraphCanvasWithoutProvider {...baseProps} />);
    act(() => mockCapturedOnInit!(instance));

    measureCanvas();
    rerender(<WorkflowGraphCanvasWithoutProvider {...baseProps} />);
    expect(instance.setCenter).toHaveBeenCalledTimes(1);

    // A later resize (e.g. window resize) must not re-center over the user.
    mockStoreWidth = 1600;
    mockStoreHeight = 1000;
    rerender(<WorkflowGraphCanvasWithoutProvider {...baseProps} />);
    expect(instance.setCenter).toHaveBeenCalledTimes(1);
  });

  it('centers once under React StrictMode', () => {
    const instance = makeInstance();
    measureCanvas();
    const { rerender } = render(
      <React.StrictMode>
        <WorkflowGraphCanvasWithoutProvider {...baseProps} />
      </React.StrictMode>
    );
    act(() => mockCapturedOnInit!(instance));
    rerender(
      <React.StrictMode>
        <WorkflowGraphCanvasWithoutProvider {...baseProps} />
      </React.StrictMode>
    );

    expect(instance.setCenter).toHaveBeenCalledTimes(1);
  });

  it('signals ready without manual centering when fitView is set', () => {
    const onReady = jest.fn();
    const instance = makeInstance();
    measureCanvas();
    render(<WorkflowGraphCanvasWithoutProvider {...baseProps} fitView onReady={onReady} />);

    act(() => mockCapturedOnInit!(instance));

    expect(instance.setCenter).not.toHaveBeenCalled();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('does not re-center over a restored defaultViewport', () => {
    const onReady = jest.fn();
    const instance = makeInstance();
    measureCanvas();
    render(
      <WorkflowGraphCanvasWithoutProvider
        {...baseProps}
        defaultViewport={{ x: 10, y: 20, zoom: 1.5 }}
        onReady={onReady}
      />
    );

    act(() => mockCapturedOnInit!(instance));

    expect(instance.setCenter).not.toHaveBeenCalled();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('centers when the first node appears on an empty canvas', async () => {
    const saved = mockNodes.splice(0, mockNodes.length);
    const instance = makeInstance();
    measureCanvas();
    const { rerender } = render(
      <WorkflowGraphCanvasWithoutProvider {...baseProps} workflow={emptyWorkflow} />
    );
    act(() => mockCapturedOnInit!(instance));
    rerender(<WorkflowGraphCanvasWithoutProvider {...baseProps} workflow={emptyWorkflow} />);
    expect(instance.setCenter).not.toHaveBeenCalled();

    mockNodes.push(...saved);
    rerender(<WorkflowGraphCanvasWithoutProvider {...baseProps} />);
    await flushHomeViewportRaf();

    expect(instance.setCenter).toHaveBeenCalledTimes(1);
    expect(instance.setCenter).toHaveBeenCalledWith(
      EXPECTED_CENTER_X,
      expect.any(Number),
      expect.objectContaining({ zoom: 1, duration: 200 })
    );
  });

  it('centers after nodes initialize when the canvas started empty', async () => {
    const saved = mockNodes.splice(0, mockNodes.length);
    const instance = makeInstance();
    mockStoreWidth = 1200;
    mockStoreHeight = 900;
    mockNodesInitialized = false;

    const { rerender } = render(
      <WorkflowGraphCanvasWithoutProvider {...baseProps} workflow={emptyWorkflow} />
    );
    act(() => mockCapturedOnInit!(instance));

    mockNodes.push(...saved);
    rerender(<WorkflowGraphCanvasWithoutProvider {...baseProps} />);
    expect(instance.setCenter).not.toHaveBeenCalled();

    mockNodesInitialized = true;
    rerender(<WorkflowGraphCanvasWithoutProvider {...baseProps} />);
    await flushHomeViewportRaf();

    expect(instance.setCenter).toHaveBeenCalledTimes(1);
    expect(instance.setCenter).toHaveBeenCalledWith(
      EXPECTED_CENTER_X,
      expect.any(Number),
      expect.objectContaining({ duration: 200 })
    );
  });
});

// mockNodes: trigger at (0,0) 200×64 → home frame centerX=100, centerY=32, minY=0.
// measureCanvas() sets store width=1200 height=900. TOP_PADDING=80, INITIAL_ZOOM=1.
//
// TB: setCenter(centerX, minY + height/2 - TOP_PADDING) = setCenter(100, 370)
// LR: setCenter(minX + width/2 - TOP_PADDING, centerY) = setCenter(520, 32)
// ─── Unified viewport contract ────────────────────────────────────────────────
// The first time the graph is shown (initial centering) and clicking "Reset zoom"
// must land on exactly the same (x, y) position. Only the animation duration
// differs: 0 ms for the instant initial placement, 200 ms for the button.
describe('WorkflowGraphCanvas initial centering and Reset zoom are equivalent', () => {
  beforeEach(() => {
    mockStoreWidth = 0;
    mockStoreHeight = 0;
    mockNodesInitialized = false;
    mockCapturedOnInit = undefined;
  });

  it('TB layout: first open and Reset zoom call setCenter with the same (x, y)', () => {
    const instance = makeInstance();
    measureCanvas();
    const { rerender } = render(
      <WorkflowGraphCanvasWithoutProvider {...baseProps} showZoomControls />
    );
    act(() => mockCapturedOnInit!(instance));
    rerender(<WorkflowGraphCanvasWithoutProvider {...baseProps} showZoomControls />);

    expect(instance.setCenter).toHaveBeenCalledTimes(1);
    const [initialX, initialY] = instance.setCenter.mock.calls[0];

    instance.setCenter.mockClear();

    fireEvent.click(screen.getByTestId('workflowCanvas-reset-zoom'));

    expect(instance.setCenter).toHaveBeenCalledTimes(1);
    const [resetX, resetY] = instance.setCenter.mock.calls[0];

    expect(resetX).toBe(initialX);
    expect(resetY).toBe(initialY);
    expect(initialX).toBe(100);
    expect(initialY).toBe(370);
  });

  it('LR layout: first open and Reset zoom call setCenter with the same (x, y)', () => {
    const instance = makeInstance();
    measureCanvas();
    const { rerender } = render(
      <WorkflowGraphCanvasWithoutProvider {...baseProps} showZoomControls direction="LR" />
    );
    act(() => mockCapturedOnInit!(instance));
    rerender(<WorkflowGraphCanvasWithoutProvider {...baseProps} showZoomControls direction="LR" />);

    expect(instance.setCenter).toHaveBeenCalledTimes(1);
    const [initialX, initialY] = instance.setCenter.mock.calls[0];

    instance.setCenter.mockClear();

    fireEvent.click(screen.getByTestId('workflowCanvas-reset-zoom'));

    expect(instance.setCenter).toHaveBeenCalledTimes(1);
    const [resetX, resetY] = instance.setCenter.mock.calls[0];

    expect(resetX).toBe(initialX);
    expect(resetY).toBe(initialY);
    expect(initialX).toBe(520);
    expect(initialY).toBe(32);
  });
});

describe('WorkflowGraphCanvas Reset zoom button', () => {
  beforeEach(() => {
    mockStoreWidth = 0;
    mockStoreHeight = 0;
    mockNodesInitialized = false;
    mockCapturedOnInit = undefined;
  });

  // Dimension fixtures are kept at 0 so the initial-centering effect (gated on
  // measuredWidth > 0) stays dormant — the only setCenter call is from the click.

  it('resets to trigger-near-top for TB (vertical) layout', () => {
    const instance = makeInstance();
    render(<WorkflowGraphCanvasWithoutProvider {...baseProps} showZoomControls />);
    act(() => mockCapturedOnInit!(instance));

    fireEvent.click(screen.getByTestId('workflowCanvas-reset-zoom'));

    expect(instance.setCenter).toHaveBeenCalledTimes(1);
    expect(instance.setCenter).toHaveBeenCalledWith(100, -80, { zoom: 1, duration: 200 });
  });

  it('resets to trigger-near-left for LR (horizontal) layout', () => {
    const instance = makeInstance();
    render(<WorkflowGraphCanvasWithoutProvider {...baseProps} showZoomControls direction="LR" />);
    act(() => mockCapturedOnInit!(instance));

    fireEvent.click(screen.getByTestId('workflowCanvas-reset-zoom'));

    expect(instance.setCenter).toHaveBeenCalledTimes(1);
    // Unmeasured canvas (width/height 0): x = minX − TOP_PADDING; y = trigger centerY.
    expect(instance.setCenter).toHaveBeenCalledWith(-80, 32, { zoom: 1, duration: 200 });
  });
});

describe('WorkflowGraphCanvas home framing uses the trigger rank', () => {
  beforeEach(() => {
    mockStoreWidth = 0;
    mockStoreHeight = 0;
    mockNodesInitialized = false;
    mockCapturedOnInit = undefined;
  });

  it('centers on triggers even when a wide downstream branch shifts the full AABB', () => {
    // Trigger centred; a wide step far to the right would pull full-graph centerX away.
    mockNodes.length = 0;
    mockNodes.push(
      { id: 'trigger', type: 'trigger', position: { x: 100, y: 0 }, width: 200, height: 64, data: {} },
      { id: 'step1', type: 'step', position: { x: 800, y: 150 }, width: 400, height: 64, data: {} }
    );
    const instance = makeInstance();
    measureCanvas();
    const { rerender } = render(
      <WorkflowGraphCanvasWithoutProvider {...baseProps} showZoomControls />
    );
    act(() => mockCapturedOnInit!(instance));
    rerender(<WorkflowGraphCanvasWithoutProvider {...baseProps} showZoomControls />);

    // Trigger centerX = 100 + 200/2 = 200 (not full AABB center ~650).
    expect(instance.setCenter).toHaveBeenCalledWith(200, 370, { zoom: 1, duration: 0 });

    // Restore default mock nodes for later suites.
    mockNodes.length = 0;
    mockNodes.push(
      { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, width: 200, height: 64, data: {} },
      { id: 'step1', type: 'step', position: { x: 0, y: 150 }, width: 200, height: 64, data: {} }
    );
  });
});

describe('WorkflowGraphCanvas Fit to view button', () => {
  beforeEach(() => {
    mockStoreWidth = 0;
    mockStoreHeight = 0;
    mockNodesInitialized = false;
    mockCapturedOnInit = undefined;
  });

  it('calls fitBounds with graph bounds when the fit-to-view button is clicked', () => {
    const instance = makeInstance();
    render(<WorkflowGraphCanvasWithoutProvider {...baseProps} showZoomControls />);
    act(() => mockCapturedOnInit!(instance));

    fireEvent.click(screen.getByTestId('workflowCanvas-fit-view'));

    expect(instance.fitBounds).toHaveBeenCalledTimes(1);
    expect(instance.fitBounds).toHaveBeenCalledWith(
      { x: 0, y: 0, width: 200, height: 214 },
      { duration: 200, padding: 0.08 }
    );
  });
});

describe('WorkflowGraphCanvas minimap collapse', () => {
  beforeEach(() => {
    mockStoreWidth = 0;
    mockStoreHeight = 0;
    mockNodesInitialized = false;
    mockCapturedOnInit = undefined;
    mockCapturedReactFlowProps = undefined;
  });

  it('collapses the minimap and restores it from the expand control', () => {
    render(<WorkflowGraphCanvasWithoutProvider {...baseProps} />);

    fireEvent.click(screen.getByTestId('workflowCanvas-collapse-minimap'));
    expect(screen.queryByTestId('workflowCanvas-collapse-minimap')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowCanvas-expand-minimap')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowCanvas-expand-minimap'));
    expect(screen.getByTestId('workflowCanvas-collapse-minimap')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowCanvas-expand-minimap')).not.toBeInTheDocument();
  });

  it('does not render minimap controls when the minimap is disabled', () => {
    render(<WorkflowGraphCanvasWithoutProvider {...baseProps} showMinimap={false} />);
    expect(screen.queryByTestId('workflowCanvas-collapse-minimap')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowCanvas-expand-minimap')).not.toBeInTheDocument();
  });
});

describe('WorkflowGraphCanvas creation-state chrome', () => {
  const edit = {
    onInsert: jest.fn(),
    onEditStep: jest.fn(),
    onDeleteNode: jest.fn(),
  };

  beforeEach(() => {
    mockStoreWidth = 0;
    mockStoreHeight = 0;
    mockNodesInitialized = false;
    mockCapturedOnInit = undefined;
    mockCapturedReactFlowProps = undefined;
  });

  it('hides zoom and minimap and disables pan/zoom when the workflow has no structure', () => {
    render(
      <WorkflowGraphCanvasWithoutProvider
        {...baseProps}
        workflow={emptyWorkflow}
        showZoomControls
        edit={edit}
      />
    );

    expect(screen.queryByTestId('workflowCanvas-navChrome-zoom')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowCanvas-navChrome-minimap')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowCanvas-zoom-in')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowCanvas-collapse-minimap')).not.toBeInTheDocument();
    expect(mockCapturedReactFlowProps?.panOnDrag).toBe(false);
    expect(mockCapturedReactFlowProps?.panOnScroll).toBe(false);
    expect(mockCapturedReactFlowProps?.zoomOnPinch).toBe(false);
    expect(screen.getByTestId('workflowGraphEmptyAddTrigger')).toBeInTheDocument();
  });

  it('shows navigation chrome and enables pan/zoom once structure exists', () => {
    render(<WorkflowGraphCanvasWithoutProvider {...baseProps} showZoomControls />);

    expect(screen.getByTestId('workflowCanvas-navChrome-zoom')).toBeInTheDocument();
    expect(screen.getByTestId('workflowCanvas-navChrome-minimap')).toBeInTheDocument();
    expect(screen.getByTestId('workflowCanvas-zoom-in')).toBeInTheDocument();
    expect(screen.getByTestId('workflowCanvas-collapse-minimap')).toBeInTheDocument();
    expect(mockCapturedReactFlowProps?.panOnDrag).toBe(true);
    expect(mockCapturedReactFlowProps?.panOnScroll).toBe(true);
    expect(mockCapturedReactFlowProps?.zoomOnPinch).toBe(true);
  });

  it('shows chrome for trigger-only workflows', () => {
    render(
      <WorkflowGraphCanvasWithoutProvider
        {...baseProps}
        workflow={{ ...structuredWorkflow, steps: [] }}
        showZoomControls
      />
    );
    expect(screen.getByTestId('workflowCanvas-navChrome-zoom')).toBeInTheDocument();
    expect(screen.getByTestId('workflowCanvas-navChrome-minimap')).toBeInTheDocument();
  });

  it('renders a custom emptyState when the workflow has no structure', () => {
    const edit = {
      onInsert: jest.fn(),
      onEditStep: jest.fn(),
      onDeleteNode: jest.fn(),
    };
    render(
      <WorkflowGraphCanvasWithoutProvider
        {...baseProps}
        workflow={emptyWorkflow}
        edit={edit}
        emptyState={<div data-test-subj="customEmptyState">Create me</div>}
      />
    );
    expect(screen.getByTestId('customEmptyState')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowGraphEmptyAddTrigger')).not.toBeInTheDocument();
  });

  it('hides the empty state while a pending insert draft is on the canvas', () => {
    const edit = {
      onInsert: jest.fn(),
      onEditStep: jest.fn(),
      onDeleteNode: jest.fn(),
    };
    measureCanvas();
    render(
      <WorkflowGraphCanvasWithoutProvider
        {...baseProps}
        workflow={emptyWorkflow}
        edit={edit}
        emptyState={<div data-test-subj="customEmptyState">Create me</div>}
        pendingInsert={{
          phase: 'configuring',
          context: { mode: 'step', index: 0 },
          stepType: 'console',
          label: 'console_step',
        }}
      />
    );
    expect(screen.queryByTestId('customEmptyState')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowGraphPendingNode')).toBeInTheDocument();
  });
});
