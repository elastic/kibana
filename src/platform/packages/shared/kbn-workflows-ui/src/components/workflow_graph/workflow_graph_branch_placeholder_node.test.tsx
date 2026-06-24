/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Tests for WorkflowGraphBranchPlaceholderNode.
 *
 * Verifies:
 *  1. A bridge line is rendered to fill the gap between the two handles.
 *  2. The bridge uses EDGE_STROKE_DEFAULT so it matches surrounding edges.
 *  3. The bridge is not itself a click/pointer target (pointerEvents: none).
 */

import { cleanup, render } from '@testing-library/react';
import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import React from 'react';

// Mock @xyflow/react — only Handle is used by the component under test.
// The mock renders a minimal div so the test DOM is inspectable.
jest.mock('@xyflow/react', () => ({
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}-${position}`} />
  ),
}));

import { WorkflowGraphBranchPlaceholderNode } from './workflow_graph_branch_placeholder_node';
import { EDGE_STROKE_DEFAULT } from './workflow_graph_edge';

// Minimal NodeProps stub — only the positional fields matter here.
function makeNodeProps(overrides: Partial<NodeProps> = {}): NodeProps {
  return {
    id: 'ph-1',
    type: 'placeholder',
    data: { branch: 'else' },
    selected: false,
    isConnectable: false,
    zIndex: 0,
    xPos: 0,
    yPos: 0,
    dragging: false,
    targetPosition: Position.Top,
    sourcePosition: Position.Bottom,
    ...overrides,
  } as NodeProps;
}

afterEach(cleanup);

describe('WorkflowGraphBranchPlaceholderNode — bridge line', () => {
  it('renders a bridge div between the two handles', () => {
    const { container } = render(<WorkflowGraphBranchPlaceholderNode {...makeNodeProps()} />);
    const divs = container.querySelectorAll('div');
    // Expect at least one non-handle div (the bridge line).
    // Handle mock renders divs with data-testid; the bridge has no testid.
    const bridge = Array.from(divs).find((d) => !d.dataset.testid && d.style.background !== '');
    expect(bridge).toBeTruthy();
  });

  it('bridge line uses EDGE_STROKE_DEFAULT for its background color', () => {
    // jsdom normalises hex colours to rgb(…), so we convert EDGE_STROKE_DEFAULT
    // (#rrggbb) to the rgb() string jsdom would produce for comparison.
    const hex = EDGE_STROKE_DEFAULT.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const expectedRgb = `rgb(${r}, ${g}, ${b})`;

    const { container } = render(<WorkflowGraphBranchPlaceholderNode {...makeNodeProps()} />);
    const divs = container.querySelectorAll('div');
    const bridge = Array.from(divs).find((d) => !d.dataset.testid && d.style.background !== '');
    // Accept both the original hex (in case jsdom is updated) and the rgb form.
    const actual = bridge?.style.background ?? '';
    expect(actual === EDGE_STROKE_DEFAULT || actual === expectedRgb).toBe(true);
  });

  it('bridge line has pointerEvents: none so it is not a click target', () => {
    const { container } = render(<WorkflowGraphBranchPlaceholderNode {...makeNodeProps()} />);
    const divs = container.querySelectorAll('div');
    const bridge = Array.from(divs).find((d) => !d.dataset.testid && d.style.background !== '');
    expect(bridge?.style.pointerEvents).toBe('none');
  });
});
