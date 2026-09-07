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

const mockOnDrag = jest.fn();

const renderOptionalDroppable = (disableDragAndDrop: boolean) => {
  render(
    <OptionalDroppable
      disableDragAndDrop={disableDragAndDrop}
      onDragEnd={mockOnDrag}
      onDragStart={mockOnDrag}
    >
      <div data-test-subj="test-content">Test Content</div>
    </OptionalDroppable>
  );

  const testId = !disableDragAndDrop
    ? 'unifiedTabs_droppable_enabled'
    : 'unifiedTabs_droppable_disabled';
  const container = screen.getByTestId(testId);
  const testContent = container.querySelector('[data-test-subj="test-content"]');

  return { container, testContent };
};

describe('OptionalDroppable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children in a plain div when drag-and-drop is disabled', () => {
    const { container, testContent } = renderOptionalDroppable(false);

    expect(container).toBeInTheDocument();
    expect(testContent).toBeInTheDocument();
  });

  it('renders children wrapped with drag-drop context when enabled', () => {
    const { container, testContent } = renderOptionalDroppable(true);

    expect(container).toBeInTheDocument();
    expect(testContent).toBeInTheDocument();
  });
});
