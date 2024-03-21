/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Droppable, DroppableProps } from './droppable';
import { Draggable } from './draggable';
import { dataTransfer, generateDragDropValue, renderWithDragDropContext } from './test_utils';
import { ReorderProvider } from './providers/reorder_provider';

jest.useFakeTimers({ legacyFakeTimers: true });

const originalOffsetHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientHeight'
) || { value: 0 };

const expectLabel = (label: string) =>
  expect.objectContaining({ humanData: expect.objectContaining({ label }) });

describe('Drag and drop reordering', () => {
  const onDrop = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  type MaximumThreeDroppablesProps = [
    Partial<DroppableProps>?,
    Partial<DroppableProps>?,
    Partial<DroppableProps>?
  ];

  const renderDragAndDropGroup = (
    propsOverrides: MaximumThreeDroppablesProps = [{}, {}, {}],
    contextOverrides = {}
  ) => {
    const values = propsOverrides.map((props, index) => {
      return props?.value ? props.value : generateDragDropValue(`${index}`);
    });
    const reorderableGroup = values.map((value) => ({ id: value.id }));

    const rtlRender = renderWithDragDropContext(
      <>
        <ReorderProvider dataTestSubj="domDragDrop">
          {propsOverrides.map((props, index) => {
            return (
              <Draggable
                key={index}
                value={values[index]}
                order={[index, 0]}
                dragType="move"
                reorderableGroup={reorderableGroup}
              >
                <Droppable
                  order={[index]}
                  onDrop={onDrop}
                  dropTypes={['reorder']}
                  {...props}
                  value={values[index]}
                  reorderableGroup={reorderableGroup}
                >
                  <button>Element no{index}</button>
                </Droppable>
              </Draggable>
            );
          })}
        </ReorderProvider>

        <Droppable
          order={[3, 0]}
          onDrop={onDrop}
          dropTypes={['duplicate_compatible']}
          value={generateDragDropValue()}
          reorderableGroup={reorderableGroup}
        >
          <button>Out of group</button>
        </Droppable>
      </>,
      undefined,
      contextOverrides
    );

    const droppables = screen.queryAllByTestId('domDragDrop-reorderableDropLayer');
    const droppable = droppables[0];
    const draggableKeyboardHandlers = screen.queryAllByTestId('domDragDrop-keyboardHandler');
    const droppableContainers = screen.queryAllByTestId('domDragDropContainer');
    return {
      ...rtlRender,
      droppableContainer: droppableContainers[0],
      startDragging: (index = 0) => {
        const draggable = screen.getByTestId(`domDragDrop_domDraggable_${index}`);
        fireEvent.dragStart(draggable, { dataTransfer });
        act(() => {
          jest.runAllTimers();
        });
      },
      drop: (droppableIndex = 0, options = {}) => {
        const dropEvent = new MouseEvent('drop', { ...options, bubbles: true });
        fireEvent(droppables[droppableIndex], dropEvent);
        act(() => {
          jest.runAllTimers();
        });
      },
      dragOver: (droppableIndex = 0, options = {}) => {
        fireEvent.dragOver(droppables[droppableIndex], options);

        act(() => {
          jest.runAllTimers();
        });
      },
      dragLeave: (droppableIndex = 0) => {
        fireEvent.dragLeave(droppables[droppableIndex]);
        act(() => {
          jest.runAllTimers();
        });
      },
      startDraggingByKeyboard: (index = 0) => {
        draggableKeyboardHandlers[index].focus();
        userEvent.keyboard('{enter}');
        act(() => {
          jest.runAllTimers();
        });
      },
      dropByKeyboard: () => {
        userEvent.keyboard('{enter}');
        act(() => {
          jest.runAllTimers();
        });
      },
      cancelByKeyboard: () => {
        userEvent.keyboard('{esc}');
        act(() => {
          jest.runAllTimers();
        });
      },
      reorderDownByKeyboard: () => {
        userEvent.keyboard('{arrowdown}');
        act(() => {
          jest.runAllTimers();
        });
      },
      reorderUpByKeyboard: () => {
        userEvent.keyboard('{arrowup}');
        act(() => {
          jest.runAllTimers();
        });
      },
      dragOverToNextByKeyboard: () => {
        userEvent.keyboard('{arrowright}');
        act(() => {
          jest.runAllTimers();
        });
      },
      dragOverToPreviousByKeyboard: () => {
        userEvent.keyboard('{arrowleft}');
        act(() => {
          jest.runAllTimers();
        });
      },
      pressModifierKey: (key: '{Shift}' | '{Alt}' | '{Ctrl}') => {
        userEvent.keyboard(key);
        act(() => {
          jest.runAllTimers();
        });
      },
      droppable,
      droppables,
    };
  };

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 40,
    });
  });

  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalOffsetHeight);
  });

  test('runs onDrop when the element is dropped', () => {
    const { startDragging, drop } = renderDragAndDropGroup();
    startDragging(0);
    drop(1);
    expect(onDrop).toBeCalled();
  });

  test('reordered elements get extra styling showing the new position', () => {
    const { startDragging, dragOver } = renderDragAndDropGroup();
    startDragging(0);
    dragOver(1);

    expect(screen.getAllByTestId('domDragDrop-translatableDrop')[1]).toHaveStyle({
      transform: 'translateY(-48px)',
    });
    expect(screen.getAllByTestId('domDragDrop-translatableDrop')[2]).not.toHaveStyle({
      transform: 'translateY(-48px)',
    });
    dragOver(2);
    expect(screen.getAllByTestId('domDragDrop-translatableDrop')[1]).toHaveStyle({
      transform: 'translateY(-48px)',
    });
    expect(screen.getAllByTestId('domDragDrop-translatableDrop')[2]).toHaveStyle({
      transform: 'translateY(-48px)',
    });
  });

  describe('keyboard mode', () => {
    test('doesn`t run onDrop when dropping into an original position without any other movements', () => {
      const { startDraggingByKeyboard, dropByKeyboard } = renderDragAndDropGroup();
      // 0 -> 0
      startDraggingByKeyboard(0);
      dropByKeyboard();
      expect(onDrop).not.toBeCalled();
    });
    test('doesn`t run onDrop when dropping into an original position after some movements', () => {
      const {
        startDraggingByKeyboard,
        dropByKeyboard,
        reorderDownByKeyboard,
        reorderUpByKeyboard,
      } = renderDragAndDropGroup();
      // 1 -> 1
      startDraggingByKeyboard(1);
      reorderDownByKeyboard();
      reorderUpByKeyboard();
      dropByKeyboard();
      expect(onDrop).not.toBeCalled();
    });
    test('doesn’t run onDrop when the movement is cancelled', () => {
      const { startDraggingByKeyboard, reorderDownByKeyboard, cancelByKeyboard } =
        renderDragAndDropGroup();
      // 1 -> x
      startDraggingByKeyboard(0);
      reorderDownByKeyboard();
      reorderDownByKeyboard();
      cancelByKeyboard();
      expect(onDrop).not.toBeCalled();
    });
    test('runs onDrop when the element is reordered and dropped', () => {
      const {
        startDraggingByKeyboard,
        dropByKeyboard,
        reorderDownByKeyboard,
        reorderUpByKeyboard,
      } = renderDragAndDropGroup();
      // 0--> 2
      startDraggingByKeyboard(0);
      reorderDownByKeyboard();
      reorderDownByKeyboard();
      dropByKeyboard();
      expect(onDrop).toBeCalledWith(expectLabel('0'), 'reorder');

      // 2 --> 0
      startDraggingByKeyboard(2);
      reorderUpByKeyboard();
      reorderUpByKeyboard();
      dropByKeyboard();
      expect(onDrop).toBeCalledWith(expectLabel('2'), 'reorder');
    });
    test('reordered elements get extra styling showing the new position from element 0 to element 2', () => {
      const { startDraggingByKeyboard, reorderDownByKeyboard } = renderDragAndDropGroup();
      // 0--> 2
      startDraggingByKeyboard(0);
      reorderDownByKeyboard();
      expect(screen.getAllByTestId('domDragDrop-reorderableDrag')[0]).toHaveStyle({
        transform: 'translateY(+48px)',
      });
      expect(screen.getAllByTestId('domDragDrop-translatableDrop')[1]).toHaveStyle({
        transform: 'translateY(-48px)',
      });
      expect(screen.getByText('Element no1')).toHaveClass('domDroppable--hover');
      reorderDownByKeyboard();
      expect(screen.getAllByTestId('domDragDrop-reorderableDrag')[0]).toHaveStyle({
        transform: 'translateY(+96px)',
      });
      expect(screen.getAllByTestId('domDragDrop-translatableDrop')[1]).toHaveStyle({
        transform: 'translateY(-48px)',
      });
      expect(screen.getAllByTestId('domDragDrop-translatableDrop')[2]).toHaveStyle({
        transform: 'translateY(-48px)',
      });
      expect(screen.getByText('Element no2')).toHaveClass('domDroppable--hover');
    });

    test('reordered elements get extra styling showing the new position from element 2 to element 0', () => {
      const { startDraggingByKeyboard, reorderUpByKeyboard } = renderDragAndDropGroup();
      // 2 --> 0
      startDraggingByKeyboard(2);
      reorderUpByKeyboard();
      expect(screen.getAllByTestId('domDragDrop-reorderableDrag')[2]).toHaveStyle({
        transform: 'translateY(-48px)',
      });
      expect(screen.getAllByTestId('domDragDrop-translatableDrop')[1]).toHaveStyle({
        transform: 'translateY(+48px)',
      });

      expect(screen.getByText('Element no1')).toHaveClass('domDroppable--hover');
      reorderUpByKeyboard();
      expect(screen.getAllByTestId('domDragDrop-reorderableDrag')[2]).toHaveStyle({
        transform: 'translateY(-96px)',
      });
      expect(screen.getAllByTestId('domDragDrop-translatableDrop')[1]).toHaveStyle({
        transform: 'translateY(+48px)',
      });
      expect(screen.getAllByTestId('domDragDrop-translatableDrop')[0]).toHaveStyle({
        transform: 'translateY(+48px)',
      });
      expect(screen.getByText('Element no0')).toHaveClass('domDroppable--hover');
    });

    test('reorders through all the drop targets and then stops at the last element', () => {
      const {
        startDraggingByKeyboard,
        reorderDownByKeyboard,
        cancelByKeyboard,
        reorderUpByKeyboard,
      } = renderDragAndDropGroup();
      startDraggingByKeyboard();
      reorderDownByKeyboard();
      reorderDownByKeyboard();
      reorderDownByKeyboard();
      reorderDownByKeyboard();

      expect(screen.getByText('Element no2')).toHaveClass('domDroppable--hover');
      cancelByKeyboard();
      startDraggingByKeyboard(2);
      reorderUpByKeyboard();
      reorderUpByKeyboard();
      reorderUpByKeyboard();
      reorderUpByKeyboard();
      expect(screen.getByText('Element no0')).toHaveClass('domDroppable--hover');
    });

    test('exits reordering and selects out of group target when hitting arrow left', () => {
      const {
        startDraggingByKeyboard,
        cancelByKeyboard,
        dragOverToPreviousByKeyboard,
        dragOverToNextByKeyboard,
      } = renderDragAndDropGroup();

      startDraggingByKeyboard();
      dragOverToNextByKeyboard();
      expect(screen.getByText('Out of group')).toHaveClass('domDroppable--hover');
      cancelByKeyboard();
      startDraggingByKeyboard();
      dragOverToPreviousByKeyboard();
      expect(screen.getByText('Out of group')).toHaveClass('domDroppable--hover');
    });
  });
});
