/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { Draggable } from './draggable';
import { Droppable } from './droppable';
import {
  generateDragDropValue,
  renderWithDragDropContext,
  dataTransfer,
  EXACT,
} from './test_utils';

jest.useFakeTimers({ legacyFakeTimers: true });

describe('Draggable', () => {
  const renderDraggable = (propsOverrides = {}) => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const rtlRender = renderWithDragDropContext(
      <>
        <Draggable
          dragType="move"
          value={generateDragDropValue('drag_this')}
          order={[2, 0, 1, 0]}
          {...propsOverrides}
        >
          <button>Drag this</button>
        </Draggable>
        <Droppable
          order={[2, 0, 1, 1]}
          value={generateDragDropValue()}
          onDrop={jest.fn()}
          dropTypes={['field_replace']}
        >
          <button>Drop here</button>
        </Droppable>
      </>
    );

    const draggable = screen.getByTestId('domDragDrop_domDraggable_drag_this');
    const draggableKeyboardHandler = screen.getByTestId('domDragDrop-keyboardHandler');
    const droppable = screen.getByTestId('domDragDrop-domDroppable');

    return {
      ...rtlRender,
      draggable,
      droppable,
      startDragging: () => {
        fireEvent.dragStart(draggable, { dataTransfer });
        act(() => {
          jest.runAllTimers();
        });
      },
      startDraggingByKeyboard: async () => {
        draggableKeyboardHandler.focus();
        await user.keyboard('{enter}');
        act(() => {
          jest.runAllTimers();
        });
      },
      dragOverToNextByKeyboard: async () => {
        await user.keyboard('{arrowright}');
        act(() => {
          jest.runAllTimers();
        });
      },
      endDragging: () => {
        fireEvent.dragEnd(draggable, { dataTransfer });
        act(() => {
          jest.runAllTimers();
        });
      },
      dragOver: () => {
        fireEvent.dragOver(droppable);
        act(() => {
          jest.runAllTimers();
        });
      },
    };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('makes component draggable', () => {
    const { draggable } = renderDraggable();
    expect(draggable).toHaveProperty('draggable', true);
  });

  test('removes selection on mouse down before dragging', async () => {
    const removeAllRanges = jest.fn();
    global.getSelection = jest.fn(() => ({ removeAllRanges } as unknown as Selection));
    const { draggable } = renderDraggable();
    fireEvent.mouseDown(draggable);
    expect(global.getSelection).toBeCalled();
    expect(removeAllRanges).toBeCalled();
  });

  test('on drag start, sets text in dataTransfer', async () => {
    const { startDragging } = renderDraggable();

    startDragging();
    expect(dataTransfer.setData).toBeCalledWith('text', 'drag_this');
  });
  test('className is added when draggable is being dragged', async () => {
    const { startDragging, draggable, endDragging } = renderDraggable({
      dragClassName: 'dragTest',
    });
    expect(draggable).toHaveClass('domDraggable', EXACT);
    startDragging();
    expect(draggable).toHaveClass('domDraggable domDraggable_active--move', EXACT);
    endDragging();
    expect(draggable).toHaveClass('domDraggable', EXACT);
  });

  describe('keyboard mode', () => {
    test('dragClassName is added to ghost when element is dragged', async () => {
      const { startDraggingByKeyboard, dragOverToNextByKeyboard, droppable } = renderDraggable({
        dragClassName: 'dragTest',
      });
      await startDraggingByKeyboard();
      await dragOverToNextByKeyboard();
      expect(droppable).toHaveClass('domDroppable domDroppable--active domDroppable--hover', EXACT);
      expect(within(screen.getByTestId('domDragDropContainer')).getByText('Drag this')).toHaveClass(
        'dragTest'
      );
    });
  });
});
