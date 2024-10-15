/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

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
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

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
      startDraggingByKeyboard: async (index = 0) => {
        draggableKeyboardHandlers[index].focus();
        await user.keyboard('[Enter]');
        act(() => {
          jest.runAllTimers();
        });
      },
      dropByKeyboard: async () => {
        await user.keyboard('[Enter]');
        act(() => {
          jest.runAllTimers();
        });
      },
      cancelByKeyboard: async () => {
        await user.keyboard('{Escape}');
        act(() => {
          jest.runAllTimers();
        });
      },
      reorderDownByKeyboard: async () => {
        await user.keyboard('[ArrowDown]');
        act(() => {
          jest.runAllTimers();
        });
      },
      reorderUpByKeyboard: async () => {
        await user.keyboard('[ArrowUp]');
        act(() => {
          jest.runAllTimers();
        });
      },
      dragOverToNextByKeyboard: async () => {
        await user.keyboard('[ArrowRight]');
        act(() => {
          jest.runAllTimers();
        });
      },
      dragOverToPreviousByKeyboard: async () => {
        await user.keyboard('[ArrowLeft]');
        act(() => {
          jest.runAllTimers();
        });
      },
      pressModifierKey: async (key: '{Shift>}' | '{Alt>}' | '{Control>}') => {
        await user.keyboard(key);
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
    test('doesn`t run onDrop when dropping into an original position without any other movements', async () => {
      const { startDraggingByKeyboard, dropByKeyboard } = renderDragAndDropGroup();
      // 0 -> 0
      await startDraggingByKeyboard(0);
      await dropByKeyboard();
      expect(onDrop).not.toBeCalled();
    });
    test('doesn`t run onDrop when dropping into an original position after some movements', async () => {
      const {
        startDraggingByKeyboard,
        dropByKeyboard,
        reorderDownByKeyboard,
        reorderUpByKeyboard,
      } = renderDragAndDropGroup();
      // 1 -> 1
      await startDraggingByKeyboard(1);
      await reorderDownByKeyboard();
      await reorderUpByKeyboard();
      await dropByKeyboard();
      expect(onDrop).not.toBeCalled();
    });
    test('doesn’t run onDrop when the movement is cancelled', async () => {
      const { startDraggingByKeyboard, reorderDownByKeyboard, cancelByKeyboard } =
        renderDragAndDropGroup();
      // 1 -> x
      await startDraggingByKeyboard(0);
      await reorderDownByKeyboard();
      await reorderDownByKeyboard();
      await cancelByKeyboard();
      expect(onDrop).not.toBeCalled();
    });
    test('runs onDrop when the element is reordered and dropped', async () => {
      const {
        startDraggingByKeyboard,
        dropByKeyboard,
        reorderDownByKeyboard,
        reorderUpByKeyboard,
      } = renderDragAndDropGroup();
      // 0--> 2
      await startDraggingByKeyboard(0);
      await reorderDownByKeyboard();
      await reorderDownByKeyboard();
      await dropByKeyboard();
      expect(onDrop).toBeCalledWith(expectLabel('0'), 'reorder');

      // 2 --> 0
      await startDraggingByKeyboard(2);
      await reorderUpByKeyboard();
      await reorderUpByKeyboard();
      await dropByKeyboard();
      expect(onDrop).toBeCalledWith(expectLabel('2'), 'reorder');
    });
    test('reordered elements get extra styling showing the new position from element 0 to element 2', async () => {
      const { startDraggingByKeyboard, reorderDownByKeyboard } = renderDragAndDropGroup();
      // 0--> 2
      await startDraggingByKeyboard(0);
      await reorderDownByKeyboard();
      expect(screen.getAllByTestId('domDragDrop-reorderableDrag')[0]).toHaveStyle({
        transform: 'translateY(+48px)',
      });
      expect(screen.getAllByTestId('domDragDrop-translatableDrop')[1]).toHaveStyle({
        transform: 'translateY(-48px)',
      });
      expect(screen.getByText('Element no1')).toHaveClass('domDroppable--hover');
      await reorderDownByKeyboard();
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

    test('reordered elements get extra styling showing the new position from element 2 to element 0', async () => {
      const { startDraggingByKeyboard, reorderUpByKeyboard } = renderDragAndDropGroup();
      // 2 --> 0
      await startDraggingByKeyboard(2);
      await reorderUpByKeyboard();
      expect(screen.getAllByTestId('domDragDrop-reorderableDrag')[2]).toHaveStyle({
        transform: 'translateY(-48px)',
      });
      expect(screen.getAllByTestId('domDragDrop-translatableDrop')[1]).toHaveStyle({
        transform: 'translateY(+48px)',
      });

      expect(screen.getByText('Element no1')).toHaveClass('domDroppable--hover');
      await reorderUpByKeyboard();
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

    test('reorders through all the drop targets and then stops at the last element', async () => {
      const {
        startDraggingByKeyboard,
        reorderDownByKeyboard,
        cancelByKeyboard,
        reorderUpByKeyboard,
      } = renderDragAndDropGroup();
      await startDraggingByKeyboard();
      await reorderDownByKeyboard();
      await reorderDownByKeyboard();
      await reorderDownByKeyboard();
      await reorderDownByKeyboard();

      expect(screen.getByText('Element no2')).toHaveClass('domDroppable--hover');
      await cancelByKeyboard();
      await startDraggingByKeyboard(2);
      await reorderUpByKeyboard();
      await reorderUpByKeyboard();
      await reorderUpByKeyboard();
      await reorderUpByKeyboard();
      expect(screen.getByText('Element no0')).toHaveClass('domDroppable--hover');
    });

    test('exits reordering and selects out of group target when hitting arrow left', async () => {
      const {
        startDraggingByKeyboard,
        cancelByKeyboard,
        dragOverToPreviousByKeyboard,
        dragOverToNextByKeyboard,
      } = renderDragAndDropGroup();

      await startDraggingByKeyboard();
      await dragOverToNextByKeyboard();
      expect(screen.getByText('Out of group')).toHaveClass('domDroppable--hover');
      await cancelByKeyboard();
      await startDraggingByKeyboard();
      await dragOverToPreviousByKeyboard();
      expect(screen.getByText('Out of group')).toHaveClass('domDroppable--hover');
    });
  });
});
