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
  useWorkflowLayout: () => ({ nodes: mockNodes, edges: [] }),
}));

// Replace React Flow with light stand-ins: `ReactFlow` captures the `onInit`
// callback and renders its children; the store hooks return our controllable
// measured dimensions. jsdom never lays the canvas out, so injecting the
// dimensions through `useStore`/`useNodesInitialized` is the only way to
// exercise the "measured vs. not-yet-measured" branch.
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  ReactFlow: ({
    onInit,
    children,
  }: {
    onInit?: (i: unknown) => void;
    children?: React.ReactNode;
  }) => {
    mockCapturedOnInit = onInit;
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
}));

const makeInstance = () => ({ setCenter: jest.fn(), fitView: jest.fn(), fitBounds: jest.fn() });

const baseProps = {
  workflow: undefined,
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
});

// mockNodes: minX=0 minY=0 maxX=200 maxY=214 → centerX=100, centerY=107.
// jsdom never performs layout so wrapperRef.current.clientWidth/clientHeight are
// always 0, making both wrapperWidth/wrapperHeight terms contribute 0.
// TOP_PADDING=80, INITIAL_ZOOM=1.
//
// TB formula (vertical, unchanged): setCenter(centerX, minY + 0/2 - 80, …)
//                                 = setCenter(100, -80, …)
// LR formula (horizontal, the fix): setCenter(minX + 0/2 - 80, centerY, …)
//                                  = setCenter(-80, 107, …)
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
    // x: minX + wrapperWidth/2 − TOP_PADDING = 0 + 0 − 80 = −80 (trigger anchored left)
    // y: centerY = (minY + maxY) / 2 = (0 + 214) / 2 = 107 (graph centred vertically)
    expect(instance.setCenter).toHaveBeenCalledWith(-80, 107, { zoom: 1, duration: 200 });
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
