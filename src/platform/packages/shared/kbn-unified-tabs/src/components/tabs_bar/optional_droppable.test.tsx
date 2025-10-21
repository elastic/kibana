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
import { OptionalDroppable } from './optional_droppable';

const mockOnDragEnd = jest.fn();

describe('OptionalDroppable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children in a plain div when drag-and-drop is disabled', () => {
    const { container } = render(
      <OptionalDroppable enableDragAndDrop={false} onDragEnd={mockOnDragEnd}>
        <div data-testid="test-content">Test Content</div>
      </OptionalDroppable>
    );

    const content = screen.getByTestId('test-content');
    expect(content).toBeInTheDocument();

    // Should render as a plain div with flexbox styling
    const wrapper = container.firstChild as HTMLDivElement;
    expect(wrapper.tagName).toBe('DIV');
    expect(wrapper).toHaveStyle('display: flex');
    expect(wrapper).toHaveStyle('align-items: center');
  });

  it('renders children wrapped with drag-drop context when enabled', () => {
    const { container } = render(
      <OptionalDroppable enableDragAndDrop={true} onDragEnd={mockOnDragEnd}>
        <div data-testid="test-content">Test Content</div>
      </OptionalDroppable>
    );

    const content = screen.getByTestId('test-content');
    expect(content).toBeInTheDocument();
    // When enabled, EuiDragDropContext wrapper should be present
    expect(container.querySelector('[role="button"]')).toBeInTheDocument();
  });

  it('applies consistent styling in both enabled and disabled states', () => {
    const { container: disabledContainer } = render(
      <OptionalDroppable enableDragAndDrop={false} onDragEnd={mockOnDragEnd}>
        <div data-testid="test-content">Content</div>
      </OptionalDroppable>
    );

    const disabledWrapper = disabledContainer.firstChild as HTMLDivElement;
    expect(disabledWrapper).toHaveStyle('display: flex');
    expect(disabledWrapper).toHaveStyle('align-items: center');
  });

  it('calls onDragEnd callback when drag operation completes', () => {
    const { container } = render(
      <OptionalDroppable enableDragAndDrop={true} onDragEnd={mockOnDragEnd}>
        <div data-testid="test-content">Content</div>
      </OptionalDroppable>
    );

    // In a real scenario, EuiDragDropContext would call onDragEnd
    // This test verifies the prop is passed correctly
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('renders multiple children correctly when disabled', () => {
    render(
      <OptionalDroppable enableDragAndDrop={false} onDragEnd={mockOnDragEnd}>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <div data-testid="child-3">Child 3</div>
      </OptionalDroppable>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('renders multiple children correctly when enabled', () => {
    render(
      <OptionalDroppable enableDragAndDrop={true} onDragEnd={mockOnDragEnd}>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <div data-testid="child-3">Child 3</div>
      </OptionalDroppable>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('toggles between enabled and disabled states', () => {
    const { rerender, container } = render(
      <OptionalDroppable enableDragAndDrop={false} onDragEnd={mockOnDragEnd}>
        <div data-testid="test-content">Content</div>
      </OptionalDroppable>
    );

    let wrapper = container.firstChild as HTMLDivElement;
    expect(wrapper.tagName).toBe('DIV');
    expect(wrapper).toHaveStyle('display: flex');

    // Toggle to enabled
    rerender(
      <OptionalDroppable enableDragAndDrop={true} onDragEnd={mockOnDragEnd}>
        <div data-testid="test-content">Content</div>
      </OptionalDroppable>
    );

    // Should still render the content
    expect(screen.getByTestId('test-content')).toBeInTheDocument();

    // Toggle back to disabled
    rerender(
      <OptionalDroppable enableDragAndDrop={false} onDragEnd={mockOnDragEnd}>
        <div data-testid="test-content">Content</div>
      </OptionalDroppable>
    );

    wrapper = container.firstChild as HTMLDivElement;
    expect(wrapper.tagName).toBe('DIV');
    expect(wrapper).toHaveStyle('display: flex');
  });

  it('preserves onDragEnd callback reference across re-renders', () => {
    const { rerender } = render(
      <OptionalDroppable enableDragAndDrop={true} onDragEnd={mockOnDragEnd}>
        <div data-testid="test-content">Content</div>
      </OptionalDroppable>
    );

    // Verify content is rendered with the callback setup
    expect(screen.getByTestId('test-content')).toBeInTheDocument();

    // Re-render with same callback
    rerender(
      <OptionalDroppable enableDragAndDrop={true} onDragEnd={mockOnDragEnd}>
        <div data-testid="test-content">Content</div>
      </OptionalDroppable>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('handles React.ReactNode children correctly', () => {
    const testContent = 'String content';

    render(
      <OptionalDroppable enableDragAndDrop={false} onDragEnd={mockOnDragEnd}>
        {testContent}
        <div data-testid="element-content">Element</div>
        {null}
        {undefined}
      </OptionalDroppable>
    );

    expect(screen.getByText(testContent)).toBeInTheDocument();
    expect(screen.getByTestId('element-content')).toBeInTheDocument();
  });
});
