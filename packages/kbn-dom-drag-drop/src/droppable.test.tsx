/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Droppable } from './droppable';
import { Draggable } from './draggable';
import {
  dataTransfer,
  generateDragDropValue,
  renderWithDragDropContext,
  EXACT,
} from './test_utils';

jest.useFakeTimers({ legacyFakeTimers: true });

const draggableValue = generateDragDropValue('drag_this');

describe('Droppable', () => {
  const onDrop = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderTestComponents = (propsOverrides = [{}]) => {
    const rtlRender = renderWithDragDropContext(
      <>
        <Draggable dragType="move" value={draggableValue} order={[2, 0, 0, 0]}>
          <button>Drag this</button>
        </Draggable>
        {propsOverrides.map((propOverrides, index) => (
          <Droppable
            key={index}
            order={[2, 0, index + 2, 0]}
            value={generateDragDropValue()}
            onDrop={onDrop}
            dropTypes={undefined}
            {...propOverrides}
          >
            <button>Drop here</button>
          </Droppable>
        ))}
      </>
    );

    const draggable = screen.getByTestId('domDragDrop_domDraggable_drag_this');
    const droppables = screen.queryAllByTestId('domDragDrop-domDroppable');
    const droppable = droppables[0];
    const draggableKeyboardHandler = screen.getByTestId('domDragDrop-keyboardHandler');
    const droppableContainers = screen.queryAllByTestId('domDragDropContainer');
    return {
      ...rtlRender,
      draggable,
      droppableContainer: droppableContainers[0],
      startDragging: () => {
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
        // const dropEvent = new MouseEvent('dragOver', options);
        // fireEvent(droppables[droppableIndex], dropEvent);

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
      startDraggingByKeyboard: () => {
        draggableKeyboardHandler.focus();
        userEvent.keyboard('{enter}');
        act(() => {
          jest.runAllTimers();
        });
      },
      dropByKeyboard: () => {
        draggableKeyboardHandler.focus();
        userEvent.keyboard('{enter}');
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

  test('receives additional classname when is active dropType', () => {
    const { droppable, startDragging } = renderTestComponents([{ dropTypes: ['field_add'] }]);

    expect(droppable).toHaveClass('domDroppable', EXACT);
    startDragging();
    expect(droppable).toHaveClass('domDroppable domDroppable--active', EXACT);
  });
  test('receives additional classname when is active dropType and has custom class', () => {
    const { droppable, startDragging } = renderTestComponents([
      {
        dropTypes: ['field_add'],
        getAdditionalClassesOnEnter: () => 'customClassOnEnter',
        getAdditionalClassesOnDroppable: () => 'customClassOnActive',
      },
    ]);

    expect(droppable).toHaveClass('domDroppable', EXACT);
    startDragging();
    expect(droppable).toHaveClass('domDroppable domDroppable--active customClassOnActive', EXACT);
  });
  test('receives additional classname when is active dropType and has custom class on enter until dragleave', () => {
    const { droppable, startDragging, dragOver, dragLeave } = renderTestComponents([
      {
        dropTypes: ['field_add'],
        getAdditionalClassesOnEnter: () => 'customClassOnEnter',
        getAdditionalClassesOnDroppable: () => 'customClassOnActive',
      },
    ]);

    expect(droppable).toHaveClass('domDroppable', EXACT);
    startDragging();
    dragOver();
    expect(droppable).toHaveClass(
      'domDroppable domDroppable--active domDroppable--hover customClassOnActive customClassOnEnter',
      EXACT
    );
    dragLeave();
    expect(droppable).toHaveClass('domDroppable domDroppable--active customClassOnActive', EXACT);
  });
  test('receives additional classname when is active dropType and has custom class on enter until drop', () => {
    const { droppable, startDragging, dragOver, drop } = renderTestComponents([
      {
        dropTypes: ['field_add'],
        getAdditionalClassesOnEnter: () => 'customClassOnEnter',
        getAdditionalClassesOnDroppable: () => 'customClassOnActive',
      },
    ]);

    expect(droppable).toHaveClass('domDroppable', EXACT);
    startDragging();
    dragOver();
    expect(droppable).toHaveClass(
      'domDroppable domDroppable--active domDroppable--hover customClassOnActive customClassOnEnter',
      EXACT
    );
    drop();
    expect(droppable).toHaveClass('domDroppable', EXACT);
  });
  test('gets special styling when another item is dragged if droppable doesnt have dropTypes', () => {
    const { droppable, startDragging } = renderTestComponents();
    startDragging();
    expect(droppable).toHaveClass('domDroppable domDroppable--notAllowed', EXACT);
  });

  test('drop function is not called on dropTypes undefined', async () => {
    const { drop, startDragging } = renderTestComponents();
    startDragging();
    drop();
    expect(onDrop).not.toHaveBeenCalled();
  });

  test('onDrop callback is executed when dropping', async () => {
    const { startDragging, drop } = renderTestComponents([
      {
        dropTypes: ['field_add'],
        onDrop,
      },
    ]);
    startDragging();
    drop();
    expect(onDrop).toBeCalledWith(
      expect.objectContaining({ humanData: expect.objectContaining({ label: 'drag_this' }) }),
      'field_add'
    );
  });

  describe('keyboard mode', () => {
    test('drop targets get highlighted when pressing arrow keys and draggable get action class too', () => {
      const {
        droppables,
        startDraggingByKeyboard,
        dropByKeyboard,
        dragOverToNextByKeyboard,
        draggable,
      } = renderTestComponents([{ dropTypes: ['field_add'] }, { dropTypes: ['field_add'] }]);
      startDraggingByKeyboard();

      expect(draggable).toHaveClass('domDraggable', EXACT);
      expect(droppables[0]).toHaveClass('domDroppable domDroppable--active', EXACT);
      expect(droppables[1]).toHaveClass('domDroppable domDroppable--active', EXACT);

      dragOverToNextByKeyboard();
      expect(draggable).toHaveClass(
        'domDraggable domDraggable_dragover_keyboard--move domDraggable_dragover_keyboard--copy',
        EXACT
      );
      expect(droppables[0]).toHaveClass(
        'domDroppable domDroppable--active domDroppable--hover',
        EXACT
      );
      expect(droppables[1]).toHaveClass('domDroppable domDroppable--active', EXACT);
      dragOverToNextByKeyboard();
      expect(droppables[0]).toHaveClass('domDroppable domDroppable--active', EXACT);
      expect(droppables[1]).toHaveClass(
        'domDroppable domDroppable--active domDroppable--hover',
        EXACT
      );
      dropByKeyboard();
      expect(draggable).toHaveClass('domDraggable', EXACT);
      expect(droppables[0]).toHaveClass('domDroppable', EXACT);
      expect(droppables[1]).toHaveClass('domDroppable', EXACT);
    });
    test('executes onDrop callback when drops on drop target', () => {
      const firstDroppableOnDrop = jest.fn();
      const secondDroppableOnDrop = jest.fn();
      const { startDraggingByKeyboard, dropByKeyboard, dragOverToNextByKeyboard } =
        renderTestComponents([
          { dropTypes: ['field_add'], onDrop: firstDroppableOnDrop },
          { dropTypes: ['field_add'], onDrop: secondDroppableOnDrop },
        ]);
      startDraggingByKeyboard();
      // goes to first target
      dragOverToNextByKeyboard();
      // goes to second target
      dragOverToNextByKeyboard();
      // drops on second target
      dropByKeyboard();
      expect(firstDroppableOnDrop).not.toBeCalled();
      expect(secondDroppableOnDrop).toHaveBeenCalledWith(draggableValue, 'field_add');
    });
    test('adds ghost to droppable when element is dragged over', async () => {
      const { startDraggingByKeyboard, droppables, draggable, dragOverToNextByKeyboard } =
        renderTestComponents([{ dropTypes: ['field_add'] }, { dropTypes: ['field_add'] }]);
      startDraggingByKeyboard();
      dragOverToNextByKeyboard();
      expect(droppables[0]).toHaveClass(
        'domDroppable domDroppable--active domDroppable--hover',
        EXACT
      );
      const domDragDropContainers = screen.queryAllByTestId('domDragDropContainer');

      const ghostElement = within(domDragDropContainers[0]).getByText('Drag this');

      expect(ghostElement).toHaveClass('domDraggable_ghost', EXACT);
      expect(ghostElement.textContent).toEqual(draggable.textContent);
    });
  });

  describe('multiple drop targets', () => {
    test('renders extra drop targets', () => {
      const { droppables } = renderTestComponents([
        {
          dropTypes: ['move_compatible', 'duplicate_compatible', 'swap_compatible'],
          getCustomDropTarget: (dropType: string) => <div className="extraDrop">{dropType}</div>,
        },
      ]);
      expect(droppables).toHaveLength(3);
    });
    test('extra drop targets appear when dragging over and disappear when hoveredDropTarget changes', () => {
      const { dragLeave, dragOver, startDragging, droppableContainer } = renderTestComponents([
        {
          dropTypes: ['move_compatible', 'duplicate_compatible', 'swap_compatible'],
          getCustomDropTarget: (dropType: string) => <div className="extraDrop">{dropType}</div>,
        },
      ]);
      startDragging();
      expect(droppableContainer).toHaveClass('domDroppable__container', { exact: true });
      dragOver();
      expect(droppableContainer).toHaveClass(
        'domDroppable__container domDroppable__container-active',
        { exact: true }
      );
      expect(screen.queryAllByTestId('domDragDropExtraTargets')[0]).toHaveClass(
        'domDroppable__extraTargets-visible'
      );
      dragLeave();
      expect(screen.queryAllByTestId('domDragDropExtraTargets')[0]).not.toHaveClass(
        'domDroppable__extraTargets-visible'
      );
    });

    test('correct dropTarget is highlighted within drop targets with the same value and different dropTypes', () => {
      const { startDragging, dragOver, droppables, dragLeave } = renderTestComponents([
        {
          dropTypes: ['move_compatible', 'duplicate_compatible', 'swap_compatible'],
          getCustomDropTarget: (dropType: string) => <div className="extraDrop">{dropType}</div>,
        },
      ]);
      startDragging();
      dragOver(1);
      expect(droppables[0]).toHaveClass('domDroppable domDroppable--active', EXACT);
      expect(droppables[1]).toHaveClass(
        'domDroppable domDroppable--active domDroppable--hover extraDrop',
        EXACT
      );
      expect(droppables[2]).toHaveClass('domDroppable domDroppable--active extraDrop', EXACT);
      dragLeave(1);
      expect(droppables[0]).toHaveClass('domDroppable domDroppable--active', EXACT);
      expect(droppables[1]).toHaveClass('domDroppable domDroppable--active extraDrop', EXACT);
      expect(droppables[2]).toHaveClass('domDroppable domDroppable--active extraDrop', EXACT);
    });

    test('onDrop callback is executed when dropping on extra drop target', () => {
      const { startDragging, dragOver, drop } = renderTestComponents([
        {
          dropTypes: ['move_compatible', 'duplicate_compatible', 'swap_compatible'],
          onDrop,
          getCustomDropTarget: (dropType: string) => <div className="extraDrop">{dropType}</div>,
        },
      ]);
      startDragging();
      dragOver();
      drop();
      expect(onDrop).toBeCalledWith(draggableValue, 'move_compatible');
      startDragging();
      dragOver(1);
      drop(1);
      expect(onDrop).toBeCalledWith(draggableValue, 'duplicate_compatible');
      startDragging();
      dragOver(2);
      drop(2);
      expect(onDrop).toBeCalledWith(draggableValue, 'swap_compatible');
    });
    test('pressing Alt or Shift when dragging over the main drop target sets extra drop target as active', () => {
      const { startDragging, dragOver, drop } = renderTestComponents([
        {
          dropTypes: ['move_compatible', 'duplicate_compatible', 'swap_compatible'],
          onDrop,
          getCustomDropTarget: (dropType: string) => <div className="extraDrop">{dropType}</div>,
        },
      ]);
      startDragging();
      dragOver(0, { altKey: true });
      drop(0, { altKey: true });
      expect(onDrop).toBeCalledWith(draggableValue, 'duplicate_compatible');

      startDragging();
      dragOver(0, { shiftKey: true });
      drop(0, { shiftKey: true });
      expect(onDrop).toBeCalledWith(draggableValue, 'swap_compatible');
    });
    test('pressing Alt or Shift when dragging over the extra drop target does nothing', () => {
      const { startDragging, dragOver, drop } = renderTestComponents([
        {
          dropTypes: ['move_compatible', 'duplicate_compatible', 'swap_compatible'],
          onDrop,
          getCustomDropTarget: (dropType: string) => <div className="extraDrop">{dropType}</div>,
        },
      ]);
      startDragging();
      dragOver(1, { shiftKey: true });
      drop(1, { shiftKey: true });
      expect(onDrop).toBeCalledWith(draggableValue, 'duplicate_compatible');
    });
    describe('keyboard mode', () => {
      test('user can go through all the drop targets ', () => {
        const { startDraggingByKeyboard, dragOverToNextByKeyboard, droppables, pressModifierKey } =
          renderTestComponents([
            {
              dropTypes: ['move_compatible', 'duplicate_compatible', 'swap_compatible'],
              getCustomDropTarget: (dropType: string) => (
                <div className="extraDrop">{dropType}</div>
              ),
            },
            {
              dropTypes: ['move_compatible'],
              getCustomDropTarget: (dropType: string) => (
                <div className="extraDrop">{dropType}</div>
              ),
            },
          ]);
        startDraggingByKeyboard();
        dragOverToNextByKeyboard();
        expect(droppables[0]).toHaveClass('domDroppable--hover');
        pressModifierKey('{Alt}');
        expect(droppables[1]).toHaveClass('domDroppable--hover');
        pressModifierKey('{Shift}');
        expect(droppables[2]).toHaveClass('domDroppable--hover');
        dragOverToNextByKeyboard();
        expect(droppables[3]).toHaveClass('domDroppable--hover');
        dragOverToNextByKeyboard();
        // we circled back to the draggable (no drop target is selected)
        dragOverToNextByKeyboard();
        expect(droppables[0]).toHaveClass('domDroppable--hover');
      });
      test('user can go through all the drop targets in reverse direction', () => {
        const {
          startDraggingByKeyboard,
          dragOverToPreviousByKeyboard,
          droppables,
          pressModifierKey,
        } = renderTestComponents([
          {
            dropTypes: ['move_compatible', 'duplicate_compatible', 'swap_compatible'],
            getCustomDropTarget: (dropType: string) => <div className="extraDrop">{dropType}</div>,
          },
          {
            dropTypes: ['move_compatible'],
            getCustomDropTarget: (dropType: string) => <div className="extraDrop">{dropType}</div>,
          },
        ]);
        startDraggingByKeyboard();
        dragOverToPreviousByKeyboard();
        expect(droppables[3]).toHaveClass('domDroppable--hover');
        dragOverToPreviousByKeyboard();
        expect(droppables[0]).toHaveClass('domDroppable--hover');
        pressModifierKey('{Alt}');
        expect(droppables[1]).toHaveClass('domDroppable--hover');
        pressModifierKey('{Shift}');
        expect(droppables[2]).toHaveClass('domDroppable--hover');
        dragOverToPreviousByKeyboard();
        // we circled back to the draggable (no drop target is selected)
        dragOverToPreviousByKeyboard();
        expect(droppables[3]).toHaveClass('domDroppable--hover');
      });
      test('user can drop on extra drop targets', () => {
        const {
          startDraggingByKeyboard,
          dragOverToNextByKeyboard,
          dropByKeyboard,
          pressModifierKey,
        } = renderTestComponents([
          {
            dropTypes: ['move_compatible', 'duplicate_compatible', 'swap_compatible'],
            onDrop,
            getCustomDropTarget: (dropType: string) => <div className="extraDrop">{dropType}</div>,
          },
        ]);
        startDraggingByKeyboard();
        dragOverToNextByKeyboard();
        dropByKeyboard();
        expect(onDrop).toHaveBeenCalledWith(draggableValue, 'move_compatible');
        onDrop.mockClear();

        startDraggingByKeyboard();
        dragOverToNextByKeyboard();
        pressModifierKey('{Alt}');
        dropByKeyboard();
        expect(onDrop).toHaveBeenCalledWith(draggableValue, 'duplicate_compatible');
        onDrop.mockClear();

        startDraggingByKeyboard();
        dragOverToNextByKeyboard();
        pressModifierKey('{Shift}');
        dropByKeyboard();
        expect(onDrop).toHaveBeenCalledWith(draggableValue, 'swap_compatible');
      });
    });
  });
});
