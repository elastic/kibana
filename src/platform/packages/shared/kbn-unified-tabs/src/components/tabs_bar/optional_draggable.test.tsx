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
import { OptionalDroppable } from './optional_droppable';

const renderDraggableWithDroppable = (disableDragAndDrop: boolean = false) =>
  render(
    <OptionalDroppable
      disableDragAndDrop={disableDragAndDrop}
      onDragEnd={jest.fn()}
      onDragStart={jest.fn()}
    >
      <OptionalDraggable
        item={{
          id: 'test-tab-1',
          label: 'Test Tab',
        }}
        index={0}
        disableDragAndDrop={disableDragAndDrop}
      >
        {({ dragHandleProps, isDragging }) => (
          <>
            <div data-test-subj="test-is-dragging">isDragging: {isDragging.toString()}</div>
            <div data-test-subj="test-has-drag-props">
              {dragHandleProps ? 'hasDragProps' : 'noDragProps'}
            </div>
          </>
        )}
      </OptionalDraggable>
    </OptionalDroppable>
  );

describe('OptionalDraggable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders noDragProps when drag-and-drop is disabled', () => {
    renderDraggableWithDroppable(true);

    expect(screen.getByTestId('test-is-dragging')).toHaveTextContent('isDragging: false');
    expect(screen.getByTestId('test-has-drag-props')).toHaveTextContent('noDragProps');
  });

  it('renders hasDragProps when drag-and-drop is enabled', () => {
    renderDraggableWithDroppable(false);

    expect(screen.getByTestId('test-is-dragging')).toHaveTextContent('isDragging: false');
    expect(screen.getByTestId('test-has-drag-props')).toHaveTextContent('hasDragProps');
  });
});
