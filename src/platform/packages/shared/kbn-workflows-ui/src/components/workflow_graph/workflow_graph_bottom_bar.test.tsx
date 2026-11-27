/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { WorkflowDetailBottomBar } from './workflow_graph_bottom_bar';

const defaultProps = {
  editorView: 'yaml' as const,
  onEditorViewChange: jest.fn(),
};

describe('WorkflowDetailBottomBar', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Unmount before flushing timers so pending state updates have no component to target.
    cleanup();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders the bar container', () => {
    render(<WorkflowDetailBottomBar {...defaultProps} />);
    expect(screen.getByTestId('workflowDetailBottomBar')).toBeInTheDocument();
  });

  it('renders the view-toggle buttons for graph and yaml views', () => {
    render(<WorkflowDetailBottomBar {...defaultProps} showViewToggle={true} />);
    expect(screen.getByTestId('workflowEditorViewToggle-graph')).toBeInTheDocument();
    expect(screen.getByTestId('workflowEditorViewToggle-yaml')).toBeInTheDocument();
  });

  it('calls onEditorViewChange with graph when graph toggle is clicked', async () => {
    const onEditorViewChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <WorkflowDetailBottomBar
        editorView="yaml"
        onEditorViewChange={onEditorViewChange}
        showViewToggle={true}
      />
    );

    await user.click(screen.getByTestId('workflowEditorViewToggle-graph'));
    expect(onEditorViewChange).toHaveBeenCalledWith('graph');
  });

  it('calls onEditorViewChange with yaml when yaml toggle is clicked', async () => {
    const onEditorViewChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <WorkflowDetailBottomBar
        editorView="graph"
        onEditorViewChange={onEditorViewChange}
        showViewToggle={true}
      />
    );

    await user.click(screen.getByTestId('workflowEditorViewToggle-yaml'));
    expect(onEditorViewChange).toHaveBeenCalledWith('yaml');
  });

  it('hides the view toggle when showViewToggle is false', () => {
    render(<WorkflowDetailBottomBar {...defaultProps} showViewToggle={false} />);
    expect(screen.queryByTestId('workflowEditorViewToggle-graph')).toBeNull();
    expect(screen.queryByTestId('workflowEditorViewToggle-yaml')).toBeNull();
  });

  it('auto-collapses after 5 seconds', () => {
    render(<WorkflowDetailBottomBar {...defaultProps} />);

    // The bar container is always present; opacity/pointerEvents are driven by CSS.
    expect(screen.getByTestId('workflowDetailBottomBar')).toBeInTheDocument();

    // Advance past the 5s collapse timer.
    act(() => {
      jest.advanceTimersByTime(5001);
    });

    // The collapsed pill (aria-label "Show toolbar") should now be visible.
    expect(screen.getByRole('button', { name: 'Show toolbar' })).toBeInTheDocument();
  });

  it('does NOT auto-collapse when disableAutoCollapse is true', () => {
    render(<WorkflowDetailBottomBar {...defaultProps} disableAutoCollapse={true} />);

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    // The pill is rendered but has pointerEvents: none and opacity: 0 when expanded.
    // We verify the toggle buttons are still accessible (expanded state).
    expect(screen.getByTestId('workflowEditorViewToggle-graph')).toBeInTheDocument();
  });

  it('expands when mouse enters the collapsed pill', async () => {
    render(<WorkflowDetailBottomBar {...defaultProps} />);

    // Collapse the bar.
    act(() => {
      jest.advanceTimersByTime(5001);
    });

    const pill = screen.getByRole('button', { name: 'Show toolbar' });
    // Mouse-enter the pill to expand.
    act(() => {
      pill.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });

    // After expand, the view-toggle buttons are accessible again.
    expect(screen.getByTestId('workflowEditorViewToggle-graph')).toBeInTheDocument();
  });

  it('mouseLeave on expanded bar triggers a 600ms deferred collapse', () => {
    render(<WorkflowDetailBottomBar {...defaultProps} />);

    // First collapse via auto-timer then expand again.
    act(() => {
      jest.advanceTimersByTime(5001);
    });
    const pill = screen.getByRole('button', { name: 'Show toolbar' });
    act(() => {
      pill.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });

    // Now leave the expanded bar.
    const expandedInner = screen.getByTestId('workflowDetailBottomBarContent');
    act(() => {
      expandedInner.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    });

    // Before 600ms: should still be expanded (toggle buttons still accessible).
    act(() => {
      jest.advanceTimersByTime(599);
    });
    expect(screen.getByTestId('workflowEditorViewToggle-graph')).toBeInTheDocument();

    // After 600ms: bar has collapsed.
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByRole('button', { name: 'Show toolbar' })).toBeInTheDocument();
  });

  it('renders testWorkflowButton when provided', () => {
    render(
      <WorkflowDetailBottomBar
        {...defaultProps}
        testWorkflowButton={
          <button type="button" data-test-subj="run-btn">
            {'Run'}
          </button>
        }
      />
    );
    expect(screen.getByTestId('run-btn')).toBeInTheDocument();
  });

  it('shows the actions slot in both yaml and graph views', () => {
    const slot = (
      <button type="button" data-test-subj="actions-slot">
        {'Actions'}
      </button>
    );
    const { rerender } = render(
      <WorkflowDetailBottomBar {...defaultProps} editorView="yaml" yamlActionsSlot={slot} />
    );
    expect(screen.getByTestId('actions-slot')).toBeInTheDocument();

    rerender(
      <WorkflowDetailBottomBar {...defaultProps} editorView="graph" yamlActionsSlot={slot} />
    );
    expect(screen.getByTestId('actions-slot')).toBeInTheDocument();
  });
});

describe('WorkflowDetailBottomBar keyboard access', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  const collapse = () =>
    act(() => {
      jest.advanceTimersByTime(5001);
    });

  it('takes the collapsed bar controls out of the tab order and a11y tree', () => {
    render(<WorkflowDetailBottomBar {...defaultProps} />);
    expect(screen.getByTestId('workflowEditorViewToggle-graph')).toBeVisible();

    collapse();

    expect(getComputedStyle(screen.getByTestId('workflowDetailBottomBarContent')).visibility).toBe(
      'hidden'
    );
  });

  it('lands on the pill first when tabbing into a collapsed bar, then into the revealed bar', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<WorkflowDetailBottomBar {...defaultProps} />);
    collapse();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Show toolbar' })).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('workflowEditorViewToggle-graph')).toHaveFocus();
  });

  it('keeps the bar expanded while focus is inside it', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<WorkflowDetailBottomBar {...defaultProps} />);
    collapse();

    await user.tab();
    await user.tab();
    // The pill blurred on the way in, which used to arm the 600ms collapse.
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const toggle = screen.getByTestId('workflowEditorViewToggle-graph');
    expect(toggle).toHaveFocus();
    expect(toggle).toBeVisible();
  });

  it('collapses once focus leaves the bar', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <div>
        <WorkflowDetailBottomBar {...defaultProps} />
        <button type="button" data-test-subj="outside">
          {'outside'}
        </button>
      </div>
    );
    collapse();

    await user.tab();
    await user.tab();
    // Move through the remaining bar controls to the outside button.
    await user.tab();
    await user.tab();
    expect(screen.getByTestId('outside')).toHaveFocus();
    act(() => {
      jest.advanceTimersByTime(601);
    });

    expect(screen.getByTestId('workflowEditorViewToggle-graph')).not.toBeVisible();
  });
});

describe('WorkflowDetailBottomBar compact tools menu', () => {
  const originalResizeObserver = global.ResizeObserver;

  beforeEach(() => {
    // Report a narrow container so the bar renders its compact (⋮) tools menu.
    class NarrowResizeObserver {
      constructor(
        private readonly callback: (entries: Array<{ contentRect: { width: number } }>) => void
      ) {}

      observe() {
        this.callback([{ contentRect: { width: 500 } }]);
      }

      unobserve() {}

      disconnect() {}
    }
    Object.defineProperty(global, 'ResizeObserver', {
      value: NarrowResizeObserver,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'ResizeObserver', {
      value: originalResizeObserver,
      configurable: true,
      writable: true,
    });
  });

  it('renders items with an href as links that keep their target', async () => {
    const user = userEvent.setup();
    render(
      <WorkflowDetailBottomBar
        {...defaultProps}
        toolsMenuItems={[
          {
            iconType: 'documentation',
            label: 'Docs',
            href: 'https://example.com/docs',
            target: '_blank',
          },
          { iconType: 'gear', label: 'Settings', onClick: jest.fn() },
        ]}
      />
    );

    await user.click(screen.getByTestId('workflowBottomBarToolsMenu'));

    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link).toHaveAttribute('href', 'https://example.com/docs');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });
});
