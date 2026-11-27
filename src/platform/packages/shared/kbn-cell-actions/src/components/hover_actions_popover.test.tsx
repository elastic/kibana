/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import type { EuiPopoverProps } from '@elastic/eui';
import { CellActionsProvider } from '../context';
import { makeAction } from '../mocks/helpers';
import type { CellActionExecutionContext } from '../types';
import { HoverActionsPopover } from './hover_actions_popover';

// EUI's focus trap does not report outside clicks in jsdom, so the click boundary is tested through the
// handler that the component hands to the hover popover.
const mockEuiPopoverProps: EuiPopoverProps[] = [];
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const ActualEuiPopover = actual.EuiPopover;
  return {
    ...actual,
    EuiPopover: (props: EuiPopoverProps) => {
      mockEuiPopoverProps.push(props);
      return <ActualEuiPopover {...props} />;
    },
  };
});

const defaultProps = {
  anchorPosition: 'rightCenter' as const,
  disabledActionTypes: [],
  visibleCellActions: 4,
  actionContext: {
    trigger: { id: 'triggerId' },
    data: [
      {
        field: { name: 'fieldName' },
      },
    ],
  } as CellActionExecutionContext,
  showActionTooltips: false,
};
describe('HoverActionsPopover', () => {
  const TestComponent = () => <span data-test-subj="test-component" />;
  jest.useFakeTimers();

  it('renders the children', () => {
    const getActions = () => Promise.resolve([]);
    const { getByTestId } = render(
      <CellActionsProvider getTriggerCompatibleActions={getActions}>
        <HoverActionsPopover {...defaultProps}>
          <TestComponent />
        </HoverActionsPopover>
      </CellActionsProvider>
    );
    expect(getByTestId('test-component')).toBeInTheDocument();
  });

  it('renders actions when hovered', async () => {
    const action = makeAction('test-action');
    const getActionsPromise = Promise.resolve([action]);
    const getActions = () => getActionsPromise;

    const { queryByTestId, getByTestId } = render(
      <CellActionsProvider getTriggerCompatibleActions={getActions}>
        <HoverActionsPopover {...defaultProps}>
          <TestComponent />
        </HoverActionsPopover>
      </CellActionsProvider>
    );

    await hoverElement(getByTestId('test-component'), async () => {
      await getActionsPromise;
      jest.runAllTimers();
    });

    expect(queryByTestId('actionItem-test-action')).toBeInTheDocument();
  });

  it('hide actions when mouse stops hovering', async () => {
    const action = makeAction('test-action');
    const getActionsPromise = Promise.resolve([action]);
    const getActions = () => getActionsPromise;

    const { queryByTestId, getByTestId } = render(
      <CellActionsProvider getTriggerCompatibleActions={getActions}>
        <HoverActionsPopover {...defaultProps}>
          <TestComponent />
        </HoverActionsPopover>
      </CellActionsProvider>
    );

    await hoverElement(getByTestId('test-component'), async () => {
      await getActionsPromise;
      jest.runAllTimers();
    });

    // Mouse leaves hover state
    await act(async () => {
      fireEvent.mouseLeave(getByTestId('test-component'));
    });

    expect(queryByTestId('actionItem-test-action')).not.toBeInTheDocument();
  });

  it('renders extra actions button', async () => {
    const actions = [makeAction('test-action-1'), makeAction('test-action-2')];
    const getActionsPromise = Promise.resolve(actions);
    const getActions = () => getActionsPromise;

    const { getByTestId } = render(
      <CellActionsProvider getTriggerCompatibleActions={getActions}>
        <HoverActionsPopover {...defaultProps} visibleCellActions={1}>
          <TestComponent />
        </HoverActionsPopover>
      </CellActionsProvider>
    );

    await hoverElement(getByTestId('test-component'), async () => {
      await getActionsPromise;
      jest.runAllTimers();
    });

    expect(getByTestId('showExtraActionsButton')).toBeInTheDocument();
  });

  it('shows extra actions when extra actions button is clicked', async () => {
    const actions = [makeAction('test-action-1'), makeAction('test-action-2')];
    const getActionsPromise = Promise.resolve(actions);
    const getActions = () => getActionsPromise;

    const { getByTestId } = render(
      <CellActionsProvider getTriggerCompatibleActions={getActions}>
        <HoverActionsPopover {...defaultProps} visibleCellActions={1}>
          <TestComponent />
        </HoverActionsPopover>
      </CellActionsProvider>
    );

    await hoverElement(getByTestId('test-component'), async () => {
      await getActionsPromise;
      jest.runAllTimers();
    });

    act(() => {
      fireEvent.click(getByTestId('showExtraActionsButton'));
    });

    expect(getByTestId('actionItem-test-action-2')).toBeInTheDocument();
  });

  it('does not render visible actions if extra actions are already rendered', async () => {
    const actions = [
      makeAction('test-action-1'),
      // extra actions
      makeAction('test-action-2'),
      makeAction('test-action-3'),
    ];
    const getActionsPromise = Promise.resolve(actions);
    const getActions = () => getActionsPromise;

    const { getByTestId, queryByTestId } = render(
      <CellActionsProvider getTriggerCompatibleActions={getActions}>
        <HoverActionsPopover {...defaultProps} visibleCellActions={2}>
          <TestComponent />
        </HoverActionsPopover>
      </CellActionsProvider>
    );

    await hoverElement(getByTestId('test-component'), async () => {
      await getActionsPromise;
      jest.runAllTimers();
    });

    act(() => {
      fireEvent.click(getByTestId('showExtraActionsButton'));
    });

    await hoverElement(getByTestId('test-component'), async () => {
      await getActionsPromise;
      jest.runAllTimers();
    });

    expect(queryByTestId('actionItem-test-action-1')).not.toBeInTheDocument();
    expect(queryByTestId('actionItem-test-action-2')).toBeInTheDocument();
    expect(queryByTestId('actionItem-test-action-3')).toBeInTheDocument();
  });
  it('does not add css positioning when anchorPosition = downCenter', async () => {
    const getActionsPromise = Promise.resolve([makeAction('test-action')]);
    const getActions = () => getActionsPromise;

    const { getByTestId } = render(
      <CellActionsProvider getTriggerCompatibleActions={getActions}>
        <HoverActionsPopover {...defaultProps} anchorPosition="downCenter">
          <TestComponent />
        </HoverActionsPopover>
      </CellActionsProvider>
    );

    await hoverElement(getByTestId('test-component'), async () => {
      await getActionsPromise;
      jest.runAllTimers();
    });

    expect(Object.values(getByTestId('hoverActionsPopover').style).includes('margin-top')).toEqual(
      false
    );
  });
  it('adds css positioning when anchorPosition = rightCenter', async () => {
    const getActionsPromise = Promise.resolve([makeAction('test-action')]);
    const getActions = () => getActionsPromise;

    const { getByTestId } = render(
      <CellActionsProvider getTriggerCompatibleActions={getActions}>
        <HoverActionsPopover {...defaultProps} anchorPosition="rightCenter">
          <TestComponent />
        </HoverActionsPopover>
      </CellActionsProvider>
    );

    await hoverElement(getByTestId('test-component'), async () => {
      await getActionsPromise;
      jest.runAllTimers();
    });

    expect(Object.values(getByTestId('hoverActionsPopover').style).includes('margin-top')).toEqual(
      true
    );
  });

  describe('lazy mounting of the popovers', () => {
    const POPOVER_SELECTOR = '.euiPopover';
    const EXTRA_ACTIONS_ANCHOR_SELECTOR = '[data-test-subj="extraActionsPopOverWithAnchor"]';

    const renderHoverActionsPopover = (
      actions = [makeAction('test-action')],
      visibleCellActions = defaultProps.visibleCellActions
    ) => {
      const getActionsPromise = Promise.resolve(actions);
      const view = render(
        <CellActionsProvider getTriggerCompatibleActions={() => getActionsPromise}>
          <HoverActionsPopover {...defaultProps} visibleCellActions={visibleCellActions}>
            <TestComponent />
          </HoverActionsPopover>
        </CellActionsProvider>
      );

      const hover = () =>
        hoverElement(view.getByTestId('test-component'), async () => {
          await getActionsPromise;
          jest.runAllTimers();
        });

      return { ...view, hover };
    };

    it('does not mount any popover before the first hover', () => {
      const { container, getByTestId } = renderHoverActionsPopover();

      expect(getByTestId('test-component')).toBeInTheDocument();
      expect(container.querySelector(POPOVER_SELECTOR)).toBeNull();
      expect(document.querySelector(EXTRA_ACTIONS_ANCHOR_SELECTOR)).toBeNull();
    });

    it('does not mount the popovers when the pointer leaves before the hover intent delay', async () => {
      const { container, getByTestId } = renderHoverActionsPopover();

      await act(async () => {
        fireEvent.mouseEnter(getByTestId('test-component'));
        fireEvent.mouseLeave(getByTestId('test-component'));
        jest.runAllTimers();
      });

      expect(getByTestId('test-component')).toBeInTheDocument();
      expect(container.querySelector(POPOVER_SELECTOR)).toBeNull();
      expect(document.querySelector(EXTRA_ACTIONS_ANCHOR_SELECTOR)).toBeNull();
    });

    it('does nothing when the mouse leaves before any hover', async () => {
      const { container, getByTestId } = renderHoverActionsPopover();

      await act(async () => {
        fireEvent.mouseLeave(getByTestId('test-component'));
      });

      expect(getByTestId('test-component')).toBeInTheDocument();
      expect(container.querySelector(POPOVER_SELECTOR)).toBeNull();
    });

    it('mounts the popovers on the first hover and keeps rendering the content', async () => {
      const { container, getByTestId, hover } = renderHoverActionsPopover();

      await hover();

      expect(container.querySelector(POPOVER_SELECTOR)).not.toBeNull();
      expect(document.querySelector(EXTRA_ACTIONS_ANCHOR_SELECTOR)).not.toBeNull();
      expect(getByTestId('test-component')).toBeInTheDocument();
    });

    it('keeps the same content node when the popovers get mounted', async () => {
      const { getByTestId, hover } = renderHoverActionsPopover();
      const content = getByTestId('test-component');

      await hover();

      expect(getByTestId('test-component')).toBe(content);
    });

    it('keeps the local state of the content when the popovers get mounted', async () => {
      const Counter = () => {
        const [count, setCount] = React.useState(0);
        return (
          <button type="button" data-test-subj="counter" onClick={() => setCount((c) => c + 1)}>
            {count}
          </button>
        );
      };
      const getActionsPromise = Promise.resolve([makeAction('test-action')]);
      const { getByTestId } = render(
        <CellActionsProvider getTriggerCompatibleActions={() => getActionsPromise}>
          <HoverActionsPopover {...defaultProps}>
            <Counter />
          </HoverActionsPopover>
        </CellActionsProvider>
      );
      fireEvent.click(getByTestId('counter'));
      fireEvent.click(getByTestId('counter'));
      expect(getByTestId('counter')).toHaveTextContent('2');

      await hoverElement(getByTestId('counter'), async () => {
        await getActionsPromise;
        jest.runAllTimers();
      });

      expect(document.querySelector(POPOVER_SELECTOR)).not.toBeNull();
      expect(getByTestId('counter')).toHaveTextContent('2');
    });

    it('keeps the actions open on a click inside the content and closes them on any other click', async () => {
      const { queryByTestId, getByTestId, hover } = renderHoverActionsPopover();
      await hover();
      expect(queryByTestId('actionItem-test-action')).toBeInTheDocument();
      const getOnClickOutside = () => {
        const hoverPopoverProps = mockEuiPopoverProps.filter(
          (props) => props?.focusTrapProps?.onClickOutside
        );
        return hoverPopoverProps[hoverPopoverProps.length - 1].focusTrapProps!.onClickOutside!;
      };

      act(() => getOnClickOutside()({ target: getByTestId('test-component') } as unknown as MouseEvent));
      expect(queryByTestId('actionItem-test-action')).toBeInTheDocument();

      act(() => getOnClickOutside()({ target: document.body } as unknown as MouseEvent));
      expect(queryByTestId('actionItem-test-action')).not.toBeInTheDocument();
    });

    it('keeps rendering the content when the actions popover closes', async () => {
      const { queryByTestId, getByTestId, hover } = renderHoverActionsPopover();

      await hover();
      expect(queryByTestId('actionItem-test-action')).toBeInTheDocument();

      await act(async () => {
        fireEvent.mouseLeave(getByTestId('test-component'));
      });

      expect(queryByTestId('actionItem-test-action')).not.toBeInTheDocument();
      expect(getByTestId('test-component')).toBeInTheDocument();
    });

    it('keeps rendering the content when the extra actions are shown', async () => {
      const { getByTestId, hover } = renderHoverActionsPopover(
        [makeAction('test-action-1'), makeAction('test-action-2')],
        1
      );

      await hover();

      act(() => {
        fireEvent.click(getByTestId('showExtraActionsButton'));
      });

      expect(getByTestId('actionItem-test-action-2')).toBeInTheDocument();
      expect(getByTestId('test-component')).toBeInTheDocument();
    });

    it('keeps the same popovers mounted when leaving and re-entering', async () => {
      const { container, getByTestId, hover } = renderHoverActionsPopover();

      await hover();
      const popover = container.querySelector(POPOVER_SELECTOR);
      const extraActionsAnchor = document.querySelector(EXTRA_ACTIONS_ANCHOR_SELECTOR);
      expect(popover).not.toBeNull();
      expect(extraActionsAnchor).not.toBeNull();

      await act(async () => {
        fireEvent.mouseLeave(getByTestId('test-component'));
      });
      await hover();

      expect(container.querySelector(POPOVER_SELECTOR)).toBe(popover);
      expect(document.querySelector(EXTRA_ACTIONS_ANCHOR_SELECTOR)).toBe(extraActionsAnchor);
    });

    it('does not mount the extra actions popover more than once when hovered several times', async () => {
      const { hover } = renderHoverActionsPopover();

      await hover();
      await hover();

      expect(
        document.querySelectorAll('[data-test-subj="extraActionsPopOverWithAnchor"]')
      ).toHaveLength(1);
      expect(document.querySelectorAll(EXTRA_ACTIONS_ANCHOR_SELECTOR)).toHaveLength(1);
    });
  });
});

const hoverElement = async (element: Element, waitForChange: () => Promise<unknown>) => {
  await act(async () => {
    fireEvent.mouseEnter(element);
    await waitForChange();
  });
};
