/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { OptionalDraggable } from './optional_draggable';

const mockItem = {
  id: 'test-tab-1',
  label: 'Test Tab',
};

const mockIndex = 0;

describe('OptionalDraggable', () => {
  it('renders children with isDragging=false when drag-and-drop is disabled', () => {
    const { container } = render(
      <OptionalDraggable item={mockItem} index={mockIndex} enableDragAndDrop={false}>
        {({ isDragging }) => (
          <div data-testid="test-content">isDragging: {isDragging.toString()}</div>
        )}
      </OptionalDraggable>
    );

    const content = screen.getByTestId('test-content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('isDragging: false');
    // Should not have EuiDraggable wrapper
    expect(container.querySelector('[data-testid="euiDraggableId"]')).not.toBeInTheDocument();
  });

  it('renders children when drag-and-drop is enabled with drag props', () => {
    const { container } = render(
      <OptionalDraggable item={mockItem} index={mockIndex} enableDragAndDrop={true}>
        {({ dragHandleProps, isDragging }) => (
          <div data-testid="test-content">
            isDragging: {isDragging.toString()}
            <br />
            {dragHandleProps ? 'hasDragProps' : 'noDragProps'}
          </div>
        )}
      </OptionalDraggable>
    );

    const content = screen.getByTestId('test-content');
    expect(content).toBeInTheDocument();
    // When enabled, should receive drag props from EuiDraggable
    expect(content).toHaveTextContent('isDragging: true');
    expect(content).toHaveTextContent('hasDragProps');
    // Should have EuiDraggable wrapper
    expect(container.querySelector('[data-testid="euiDraggableId"]')).toBeInTheDocument();
  });

  it('passes correct item id and index to EuiDraggable', () => {
    const { container } = render(
      <OptionalDraggable item={mockItem} index={2} enableDragAndDrop={true}>
        {() => <div data-testid="test-content">Content</div>}
      </OptionalDraggable>
    );

    const content = screen.getByTestId('test-content');
    expect(content).toBeInTheDocument();
    // EuiDraggable should be present in the tree
    expect(container.querySelector('[role="button"]')).toBeInTheDocument();
  });

  it('toggles between drag-enabled and drag-disabled states', () => {
    const { rerender } = render(
      <OptionalDraggable item={mockItem} index={mockIndex} enableDragAndDrop={true}>
        {({ isDragging }) => (
          <div data-testid="test-content">isDragging: {isDragging.toString()}</div>
        )}
      </OptionalDraggable>
    );

    expect(screen.getByTestId('test-content')).toHaveTextContent('isDragging: true');

    // Toggle to disabled
    rerender(
      <OptionalDraggable item={mockItem} index={mockIndex} enableDragAndDrop={false}>
        {({ isDragging }) => (
          <div data-testid="test-content">isDragging: {isDragging.toString()}</div>
        )}
      </OptionalDraggable>
    );

    expect(screen.getByTestId('test-content')).toHaveTextContent('isDragging: false');
  });
});
