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
import type { NodePortTargets } from './compute_insertion_points';
import {
  WorkflowGraphActionsContext,
  type WorkflowGraphEditActions,
} from './workflow_graph_actions_context';
import {
  ERROR_PORT_ALONG,
  PORT_HIT_SIZE,
  WorkflowGraphConnectionPorts,
} from './workflow_graph_connection_ports';

const edit: WorkflowGraphEditActions = {
  onInsert: jest.fn(),
  onEditStep: jest.fn(),
  onDeleteNode: jest.fn(),
};
/** Positioning / reveal styles live on the EuiToolTip anchor wrapping the button. */
const portAnchor = (testId: string): HTMLElement => {
  const button = screen.getByTestId(testId);
  const anchor = button.parentElement;
  if (!anchor) throw new Error(`Missing tooltip anchor for ${testId}`);
  return anchor;
};

describe('WorkflowGraphConnectionPorts', () => {
  it('keeps a ≥44px hit target straddling the bottom edge (pin on the border)', () => {
    const ports: NodePortTargets = {
      step: { index: 1, sourceNodeId: 'a' },
      errorStepId: 'a',
    };
    render(
      <div style={{ position: 'relative', width: 300, height: 64 }}>
        <WorkflowGraphConnectionPorts
          ports={ports}
          edit={edit}
          nodeHovered={false}
          direction="TB"
        />
      </div>
    );
    const wrap = screen.getByTestId('workflowGraphConnectionPorts');
    expect(wrap).toHaveAttribute('data-direction', 'TB');
    expect(getComputedStyle(wrap).height).toBe('0px');
    expect(getComputedStyle(wrap).width).toBe('100%');

    const errorAnchor = portAnchor('workflowGraphPort-error');
    expect(getComputedStyle(errorAnchor).width).toBe(`${PORT_HIT_SIZE}px`);
    expect(getComputedStyle(errorAnchor).height).toBe(`${PORT_HIT_SIZE}px`);
    expect(PORT_HIT_SIZE).toBeGreaterThanOrEqual(44);
    // Hit-target center sits on the bottom border (straddle).
    expect(getComputedStyle(errorAnchor).bottom).toBe(`-${PORT_HIT_SIZE / 2}px`);
    expect(getComputedStyle(errorAnchor).left).toBe(ERROR_PORT_ALONG);
    // Add step lives on wires — not on the node edge.
    expect(screen.queryByTestId('workflowGraphPort-step')).toBeNull();
  });

  it('hides the error port at rest and reveals it on node hover', () => {
    const ports: NodePortTargets = {
      step: { index: 1, sourceNodeId: 'a' },
      errorStepId: 'a',
    };
    const { rerender } = render(
      <div style={{ position: 'relative', width: 300, height: 64 }}>
        <WorkflowGraphConnectionPorts
          ports={ports}
          edit={edit}
          nodeHovered={false}
          direction="TB"
        />
      </div>
    );
    const errorAnchor = portAnchor('workflowGraphPort-error');
    expect(getComputedStyle(errorAnchor).opacity).toBe('0');
    expect(getComputedStyle(errorAnchor).pointerEvents).toBe('none');

    rerender(
      <div style={{ position: 'relative', width: 300, height: 64 }}>
        <WorkflowGraphConnectionPorts
          ports={ports}
          edit={edit}
          nodeHovered
          direction="TB"
        />
      </div>
    );
    expect(getComputedStyle(errorAnchor).opacity).toBe('1');
    expect(getComputedStyle(errorAnchor).pointerEvents).toBe('auto');
  });

  it('keeps the failure port on the bottom edge in LR', () => {
    const ports: NodePortTargets = {
      step: { index: 1, sourceNodeId: 'a' },
      errorStepId: 'a',
    };
    render(
      <div style={{ position: 'relative', width: 300, height: 64 }}>
        <WorkflowGraphConnectionPorts
          ports={ports}
          edit={edit}
          nodeHovered={false}
          direction="LR"
        />
      </div>
    );
    const wrap = screen.getByTestId('workflowGraphConnectionPorts');
    expect(wrap).toHaveAttribute('data-direction', 'LR');
    expect(getComputedStyle(wrap).height).toBe('0px');
    expect(getComputedStyle(wrap).width).toBe('100%');
    const errorAnchor = portAnchor('workflowGraphPort-error');
    expect(getComputedStyle(errorAnchor).left).toBe(ERROR_PORT_ALONG);
    expect(getComputedStyle(errorAnchor).bottom).toBe(`-${PORT_HIT_SIZE / 2}px`);
  });

  it('fires error context on error port click', () => {
    const onInsert = jest.fn();
    const ports: NodePortTargets = {
      step: { index: 2, path: [{ stepIndex: 0, branch: 'steps' }], sourceNodeId: 'a' },
      errorStepId: 'a',
    };
    render(
      <WorkflowGraphConnectionPorts
        ports={ports}
        edit={{ ...edit, onInsert }}
        nodeHovered
        direction="TB"
      />
    );
    fireEvent.click(screen.getByTestId('workflowGraphPort-error'));
    expect(onInsert).toHaveBeenCalledWith(
      { mode: 'error', stepId: 'a' },
      expect.objectContaining({ left: expect.any(Number) })
    );
  });

  it('shows an explainer tooltip after a 1s hover dwell', () => {
    jest.useFakeTimers();
    const ports: NodePortTargets = {
      step: { index: 1, sourceNodeId: 'a' },
      errorStepId: 'a',
    };
    render(
      <div style={{ position: 'relative', width: 300, height: 64 }}>
        <WorkflowGraphConnectionPorts
          ports={ports}
          edit={edit}
          nodeHovered
          direction="TB"
        />
      </div>
    );
    const anchor = portAnchor('workflowGraphPort-error');
    fireEvent.mouseEnter(anchor);
    expect(screen.queryByText('Add failure step')).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(999);
    });
    expect(screen.queryByText('Add failure step')).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByText('Add failure step')).toBeInTheDocument();
    fireEvent.mouseLeave(anchor);
    expect(screen.queryByText('Add failure step')).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it('renders a persistent connected error port when a fallback route exists', () => {
    const ports: NodePortTargets = {
      step: { index: 1, sourceNodeId: 'a' },
      errorConnected: true,
    };
    render(
      <div style={{ position: 'relative', width: 300, height: 64 }}>
        <WorkflowGraphConnectionPorts
          ports={ports}
          edit={edit}
          nodeHovered={false}
          direction="TB"
        />
      </div>
    );
    const connected = screen.getByTestId('workflowGraphPort-errorConnected');
    expect(connected).toBeInTheDocument();
    expect(getComputedStyle(connected).opacity).toBe('1');
    expect(screen.queryByTestId('workflowGraphPort-error')).not.toBeInTheDocument();
  });

  it('keeps the error port active while an error-path insert is in progress', () => {
    const ports: NodePortTargets = {
      step: { index: 1, sourceNodeId: 'a' },
      errorStepId: 'a',
    };
    render(
      <WorkflowGraphActionsContext.Provider
        value={{
          pendingInsert: { phase: 'choosing', context: { mode: 'error', stepId: 'a' } },
        }}
      >
        <div style={{ position: 'relative', width: 300, height: 64 }}>
          <WorkflowGraphConnectionPorts
            ports={ports}
            edit={edit}
            nodeHovered={false}
            direction="TB"
          />
        </div>
      </WorkflowGraphActionsContext.Provider>
    );
    const errorPort = screen.getByTestId('workflowGraphPort-error');
    expect(getComputedStyle(portAnchor('workflowGraphPort-error')).opacity).toBe('1');
    expect(errorPort).toHaveAttribute('data-port-active', 'true');
  });

  it('renders nothing when there is no failure port to show', () => {
    const ports: NodePortTargets = {
      then: { index: 0, path: [{ stepIndex: 0, branch: 'steps' }], sourceNodeId: 'gate' },
      else: { index: 0, path: [{ stepIndex: 0, branch: 'else' }], sourceNodeId: 'gate' },
    };
    const { container } = render(
      <WorkflowGraphConnectionPorts ports={ports} edit={edit} nodeHovered direction="TB" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
