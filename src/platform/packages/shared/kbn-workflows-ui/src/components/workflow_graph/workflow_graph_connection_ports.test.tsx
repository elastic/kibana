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
import type { WorkflowGraphEditActions } from './workflow_graph_actions_context';
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
      step: { sourceNodeId: 'a', stepName: 'step_a' },
      fallbackTarget: { stepName: 'step_a', nodeId: 'a' },
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
      step: { sourceNodeId: 'a', stepName: 'step_a' },
      fallbackTarget: { stepName: 'step_a', nodeId: 'a' },
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
        <WorkflowGraphConnectionPorts ports={ports} edit={edit} nodeHovered direction="TB" />
      </div>
    );
    expect(getComputedStyle(errorAnchor).opacity).toBe('1');
    expect(getComputedStyle(errorAnchor).pointerEvents).toBe('auto');
  });

  it('reveals the failure port from parent hover / focus-within via CSS, not React state', () => {
    const ports: NodePortTargets = {
      step: { sourceNodeId: 'a', stepName: 'step_a' },
      fallbackTarget: { stepName: 'step_a', nodeId: 'a' },
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
    const selectors = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .map((rule) => (rule instanceof CSSStyleRule ? rule.selectorText : ''));
    // The pseudo-class must apply to the parent (`:hover > .wrapper …`), not to the
    // wrapper itself (`.wrapper:hover > .wrapper …`), which could never match.
    expect(
      selectors.some((selector) =>
        /(^|,\s*)\*?:hover\s*>.*\.workflowGraphPortAnchor/.test(selector)
      )
    ).toBe(true);
    expect(
      selectors.some((selector) =>
        /(^|,\s*)\*?:focus-within\s*>.*\.workflowGraphPortAnchor/.test(selector)
      )
    ).toBe(true);
    expect(portAnchor('workflowGraphPort-error')).toHaveClass('workflowGraphPortAnchor');
  });

  it('keeps the failure port on the bottom edge in LR', () => {
    const ports: NodePortTargets = {
      step: { sourceNodeId: 'a', stepName: 'step_a' },
      fallbackTarget: { stepName: 'step_a', nodeId: 'a' },
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

  it('fires fallback context on error port click', () => {
    const onInsert = jest.fn();
    const ports: NodePortTargets = {
      step: { sourceNodeId: 'a', stepName: 'step_a' },
      fallbackTarget: { stepName: 'step_a', nodeId: 'a' },
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
      { mode: 'fallback', stepName: 'step_a' },
      expect.objectContaining({ left: expect.any(Number) })
    );
  });

  it('shows an explainer tooltip after a 1s hover dwell', () => {
    jest.useFakeTimers();
    const ports: NodePortTargets = {
      step: { sourceNodeId: 'a', stepName: 'step_a' },
      fallbackTarget: { stepName: 'step_a', nodeId: 'a' },
    };
    render(
      <div style={{ position: 'relative', width: 300, height: 64 }}>
        <WorkflowGraphConnectionPorts ports={ports} edit={edit} nodeHovered direction="TB" />
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

  it('shows the explainer tooltip on keyboard focus and hides it on blur', () => {
    const ports: NodePortTargets = {
      step: { sourceNodeId: 'a', stepName: 'step_a' },
      fallbackTarget: { stepName: 'step_a', nodeId: 'a' },
    };
    render(
      <div style={{ position: 'relative', width: 300, height: 64 }}>
        <WorkflowGraphConnectionPorts ports={ports} edit={edit} nodeHovered direction="TB" />
      </div>
    );
    const button = screen.getByTestId('workflowGraphPort-error');
    expect(screen.queryByText('Add failure step')).not.toBeInTheDocument();
    act(() => {
      button.focus();
    });
    expect(screen.getByText('Add failure step')).toBeInTheDocument();
    act(() => {
      button.blur();
    });
    expect(screen.queryByText('Add failure step')).not.toBeInTheDocument();
  });

  describe('pin styles', () => {
    const renderPin = (props: { nodeHovered: boolean; creatingError?: boolean }) => {
      render(
        <div style={{ position: 'relative', width: 300, height: 64 }}>
          <WorkflowGraphConnectionPorts
            ports={{
              step: { sourceNodeId: 'a', stepName: 'step_a' },
              fallbackTarget: { stepName: 'step_a', nodeId: 'a' },
            }}
            edit={edit}
            direction="TB"
            {...props}
          />
        </div>
      );
      const pin = screen
        .getByTestId('workflowGraphPort-error')
        .querySelector('.workflowGraphPortPin');
      if (!(pin instanceof HTMLElement)) throw new Error('Missing port pin');
      const iconWrapper = pin.firstElementChild;
      if (!(iconWrapper instanceof HTMLElement)) throw new Error('Missing pin icon wrapper');
      const { width, height, backgroundColor, boxShadow } = getComputedStyle(pin);
      return {
        width,
        height,
        backgroundColor,
        boxShadow,
        iconOpacity: getComputedStyle(iconWrapper).opacity,
      };
    };

    it('is a small dot with a hidden icon at rest', () => {
      expect(renderPin({ nodeHovered: false })).toEqual(
        expect.objectContaining({ width: '8px', height: '8px', iconOpacity: '0' })
      );
    });

    it('keeps the same small dot when only the node is hovered', () => {
      expect(renderPin({ nodeHovered: true })).toEqual(
        expect.objectContaining({ width: '8px', height: '8px', iconOpacity: '0' })
      );
    });

    it('expands the pin and shows its icon while an error-path insert is in progress', () => {
      const active = renderPin({ nodeHovered: false, creatingError: true });
      expect(active).toEqual(
        expect.objectContaining({ width: '20px', height: '20px', iconOpacity: '1' })
      );
    });

    it('expands the pin on hover / focus-visible', () => {
      renderPin({ nodeHovered: false });
      const hoverRule = Array.from(document.styleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules))
        .find(
          (rule): rule is CSSStyleRule =>
            rule instanceof CSSStyleRule &&
            /:hover \.workflowGraphPortPin(,|$)/.test(rule.selectorText)
        );
      expect(hoverRule?.style.width).toBe('20px');
      expect(hoverRule?.style.height).toBe('20px');
    });
  });

  it('renders a persistent connected error port when a fallback route exists', () => {
    const ports: NodePortTargets = {
      step: { sourceNodeId: 'a', stepName: 'step_a' },
      fallbackConnected: true,
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
      step: { sourceNodeId: 'a', stepName: 'step_a' },
      fallbackTarget: { stepName: 'step_a', nodeId: 'a' },
    };
    render(
      <div style={{ position: 'relative', width: 300, height: 64 }}>
        <WorkflowGraphConnectionPorts
          ports={ports}
          edit={edit}
          nodeHovered={false}
          creatingError
          direction="TB"
        />
      </div>
    );
    const errorPort = screen.getByTestId('workflowGraphPort-error');
    expect(getComputedStyle(portAnchor('workflowGraphPort-error')).opacity).toBe('1');
    expect(errorPort).toHaveAttribute('data-port-active', 'true');
  });

  it('renders nothing when there is no failure port to show', () => {
    const ports: NodePortTargets = {
      branches: new Map([
        ['steps', { slot: { kind: 'steps' as const }, ownerStepName: 'gate', isTerminal: false }],
        ['else', { slot: { kind: 'else' as const }, ownerStepName: 'gate', isTerminal: false }],
      ]),
    };
    const { container } = render(
      <WorkflowGraphConnectionPorts ports={ports} edit={edit} nodeHovered direction="TB" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
