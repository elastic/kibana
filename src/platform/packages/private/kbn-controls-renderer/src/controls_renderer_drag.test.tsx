/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { EuiThemeProvider } from '@elastic/eui';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CONTROL_WIDTH_MEDIUM, OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import type { PinnedControlLayoutState } from '@kbn/controls-schemas';

import { ControlsRenderer } from './controls_renderer';
import type { ControlsLayout, ControlsRendererParentApi } from './types';

/**
 * Unlike `controls_renderer.test.tsx`, this suite renders the real `ControlPanel` and `DragHandle`,
 * so the `setDragHandles` -> native event listener integration with the flex layout is exercised.
 * Only the embeddable (the control's contents) is stubbed.
 */
jest.mock('@kbn/embeddable-plugin/public', () => ({
  ...jest.requireActual('@kbn/embeddable-plugin/public'),
  EmbeddableRenderer: ({ maybeId }: { maybeId: string }) => (
    <div data-test-subj="mockEmbeddableRenderer">{maybeId}</div>
  ),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn().mockImplementation(() => ({
    services: {
      uiActions: {
        getTriggerCompatibleActions: jest.fn().mockResolvedValue([]),
        getFrequentlyChangingActionsForTrigger: jest.fn().mockResolvedValue([]),
        getTrigger: jest.fn().mockResolvedValue({}),
      },
    },
  })),
}));

const PANEL_SPACING = 300;

const getControl = (order: number): PinnedControlLayoutState =>
  ({
    type: OPTIONS_LIST_CONTROL,
    order,
    width: CONTROL_WIDTH_MEDIUM,
    grow: false,
  } as PinnedControlLayoutState);

const getControls = (): ControlsLayout => ({
  controls: { control1: getControl(0), control2: getControl(1), control3: getControl(2) },
});

const getParentApi = (viewMode: 'edit' | 'view' = 'edit') =>
  ({
    viewMode$: new BehaviorSubject(viewMode),
    children$: new BehaviorSubject({}),
    registerChildApi: jest.fn(),
    getSerializedStateForChild: jest.fn().mockReturnValue({ type: OPTIONS_LIST_CONTROL }),
  } as unknown as ControlsRendererParentApi & { viewMode$: BehaviorSubject<string> });

const onControlsChanged = jest.fn();

const renderControls = (
  controls: ControlsLayout,
  parentApi: ControlsRendererParentApi = getParentApi()
) => {
  const getElement = (nextControls: ControlsLayout) => (
    <ControlsRenderer
      controls={nextControls}
      onControlsChanged={onControlsChanged}
      parentApi={parentApi}
    />
  );
  const { rerender, ...rest } = render(getElement(controls), { wrapper: EuiThemeProvider });
  return { ...rest, parentApi, rerender: (next: ControlsLayout) => rerender(getElement(next)) };
};

const getPanel = (id: string) =>
  screen
    .getAllByTestId('mockEmbeddableRenderer')
    .find((element) => element.textContent === id)
    ?.closest('.kbnFlexPanel') as HTMLElement;

const getPanelIdsInOrder = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.kbnFlexPanel')).map(
    (panel) => within(panel).getByTestId('mockEmbeddableRenderer').textContent
  );

const queryHandle = (id: string) =>
  within(getPanel(id)).queryByRole('button', { name: /move control/i });

const getHandle = (id: string) => {
  const handle = queryHandle(id);
  if (!handle) throw new Error(`no drag handle for ${id}`);
  return handle;
};

const getLastControls = (): ControlsLayout['controls'] => {
  const { calls } = onControlsChanged.mock;
  return calls[calls.length - 1][0].controls;
};

const getOrders = (controls: ControlsLayout['controls']) =>
  Object.fromEntries(Object.entries(controls).map(([id, { order }]) => [id, order]));

/**
 * jsdom does no layout, so give each panel a rect based on its `order` (or its `left` style while
 * it is being dragged, which is when the flex layout takes it out of the flow).
 */
const mockRects = () =>
  jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      const rect = (left: number, width: number, height: number, top = 0) =>
        ({ left, right: left + width, top, bottom: top + height, width, height } as DOMRect);

      if (this.classList.contains('kbnFlex')) return rect(0, 1000, 500);
      const panel = this.closest<HTMLElement>('.kbnFlexPanel');
      if (!panel) return rect(0, 0, 0);

      const domIndex = Array.from(
        panel.parentElement?.querySelectorAll(':scope > .kbnFlexPanel') ?? []
      ).indexOf(panel);
      const order = panel.style.order ? parseInt(panel.style.order, 10) - 1 : domIndex;
      const isFloating = panel.style.position === 'fixed';
      const left = isFloating ? parseFloat(panel.style.left) : order * PANEL_SPACING;
      const top = isFloating ? parseFloat(panel.style.top) || 0 : 0;
      return panel === this ? rect(left, 200, 32, top) : rect(left, 0, 0, top);
    });

const mouseDrag = (id: string, { to }: { to: number }) => {
  const from = getPanel(id).getBoundingClientRect().left;
  fireEvent.mouseDown(getHandle(id), { clientX: from, clientY: 0, button: 0 });
  fireEvent.mouseMove(document, { clientX: to, clientY: 0 });
  fireEvent.mouseUp(document);
};

const touchDrag = (id: string, { to }: { to: number }) => {
  const handle = getHandle(id);
  const from = getPanel(id).getBoundingClientRect().left;
  fireEvent.touchStart(handle, { touches: [{ clientX: from, clientY: 0 }] });
  fireEvent.touchMove(handle, { touches: [{ clientX: to, clientY: 0 }] });
  fireEvent.touchEnd(handle);
};

describe('ControlsRenderer drag and drop through the control drag handles', () => {
  let rectSpy: jest.SpyInstance;

  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    window.HTMLElement.prototype.scrollTo = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    rectSpy = mockRects();
  });

  afterEach(() => {
    rectSpy.mockRestore();
  });

  it('renders a real drag handle for each control when editing', () => {
    renderControls(getControls());
    ['control1', 'control2', 'control3'].forEach((id) => {
      expect(getHandle(id)).toHaveClass('kbnFlexPanel--dragHandle');
    });
    // the flex layout's own default handle is not used for custom handles
    expect(screen.queryByLabelText(/drag to move/i)).not.toBeInTheDocument();
  });

  it('reorders the controls with the mouse and emits the new order once', () => {
    renderControls(getControls());

    mouseDrag('control1', { to: 2 * PANEL_SPACING + 100 });

    expect(getPanelIdsInOrder()).toEqual(['control2', 'control3', 'control1']);
    expect(onControlsChanged).toHaveBeenCalledTimes(1);
    expect(getOrders(getLastControls())).toEqual({ control1: 2, control2: 0, control3: 1 });
  });

  it('restores the original order when Escape is pressed during a mouse drag', () => {
    renderControls(getControls());

    const handle = getHandle('control1');
    fireEvent.mouseDown(handle, { clientX: 0, clientY: 0, button: 0 });
    fireEvent.mouseMove(document, { clientX: 2 * PANEL_SPACING + 100, clientY: 0 });
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    fireEvent.mouseUp(document);

    expect(getPanelIdsInOrder()).toEqual(['control1', 'control2', 'control3']);
    expect(onControlsChanged).not.toHaveBeenCalled();

    // listeners were torn down, so further pointer movement does nothing
    fireEvent.mouseMove(document, { clientX: 2 * PANEL_SPACING + 100, clientY: 0 });
    expect(getPanelIdsInOrder()).toEqual(['control1', 'control2', 'control3']);
  });

  it('reorders the controls with touch and emits the new order once', () => {
    renderControls(getControls());

    touchDrag('control3', { to: -100 });

    expect(getPanelIdsInOrder()).toEqual(['control3', 'control1', 'control2']);
    expect(onControlsChanged).toHaveBeenCalledTimes(1);
    expect(getOrders(getLastControls())).toEqual({ control1: 1, control2: 2, control3: 0 });
  });

  it('does not emit when a control is dropped back in its original position', () => {
    renderControls(getControls());
    mouseDrag('control2', { to: PANEL_SPACING });
    expect(getPanelIdsInOrder()).toEqual(['control1', 'control2', 'control3']);
    expect(onControlsChanged).not.toHaveBeenCalled();
  });

  it('keeps the handles wired up after the parent feeds the new order back in', () => {
    const { rerender } = renderControls(getControls());

    mouseDrag('control1', { to: 2 * PANEL_SPACING + 100 });
    const [[firstChange]] = onControlsChanged.mock.calls;
    rerender(firstChange);
    expect(getPanelIdsInOrder()).toEqual(['control2', 'control3', 'control1']);

    // the handles must now drive the *new* interaction callbacks, not stale ones
    touchDrag('control3', { to: -100 });
    expect(getPanelIdsInOrder()).toEqual(['control3', 'control2', 'control1']);
    expect(onControlsChanged).toHaveBeenCalledTimes(2);
    expect(getOrders(getLastControls())).toEqual({ control1: 2, control2: 1, control3: 0 });
  });

  it('keeps the handles wired up when a control is added', () => {
    const initial = getControls();
    const { rerender } = renderControls(initial);

    rerender({ controls: { ...initial.controls, control4: getControl(3) } });
    mouseDrag('control4', { to: -100 });

    expect(getPanelIdsInOrder()).toEqual(['control4', 'control1', 'control2', 'control3']);
    expect(getOrders(getLastControls())).toEqual({
      control1: 1,
      control2: 2,
      control3: 3,
      control4: 0,
    });
  });

  describe('view and edit mode transitions', () => {
    it('has no drag handles in view mode, and registers them once editing starts', async () => {
      const parentApi = getParentApi('view');
      renderControls(getControls(), parentApi);
      expect(queryHandle('control1')).not.toBeInTheDocument();

      act(() => parentApi.viewMode$.next('edit'));
      // the control panel batches its view mode updates, so the handle shows up asynchronously
      await waitFor(() => expect(queryHandle('control1')).toBeInTheDocument());
      expect(getHandle('control1')).toHaveClass('kbnFlexPanel--dragHandle');

      mouseDrag('control1', { to: 2 * PANEL_SPACING + 100 });
      expect(getPanelIdsInOrder()).toEqual(['control2', 'control3', 'control1']);
      expect(getOrders(getLastControls())).toEqual({ control1: 2, control2: 0, control3: 1 });
    });

    it('registers the handles again after leaving and re-entering edit mode', async () => {
      const parentApi = getParentApi('edit');
      renderControls(getControls(), parentApi);
      const firstHandle = getHandle('control1');

      act(() => parentApi.viewMode$.next('view'));
      await waitFor(() => expect(firstHandle).not.toBeInTheDocument());
      expect(queryHandle('control1')).not.toBeInTheDocument();

      act(() => parentApi.viewMode$.next('edit'));
      await waitFor(() => expect(queryHandle('control1')).toBeInTheDocument());
      const newHandle = getHandle('control1');
      expect(newHandle).not.toBe(firstHandle);

      touchDrag('control1', { to: 2 * PANEL_SPACING + 100 });
      expect(getPanelIdsInOrder()).toEqual(['control2', 'control3', 'control1']);
      expect(onControlsChanged).toHaveBeenCalledTimes(1);
      expect(getOrders(getLastControls())).toEqual({ control1: 2, control2: 0, control3: 1 });
    });

    it('does not reorder anything while in view mode', () => {
      renderControls(getControls(), getParentApi('view'));
      fireEvent.mouseDown(getPanel('control1'), { clientX: 0, clientY: 0, button: 0 });
      fireEvent.mouseMove(document, { clientX: 2 * PANEL_SPACING + 100, clientY: 0 });
      fireEvent.mouseUp(document);
      expect(getPanelIdsInOrder()).toEqual(['control1', 'control2', 'control3']);
      expect(onControlsChanged).not.toHaveBeenCalled();
    });
  });

  it('still reorders with the keyboard through the same handle', async () => {
    renderControls(getControls());
    act(() => getHandle('control1').focus());
    await userEvent.keyboard('[Enter]');
    await userEvent.keyboard('[ArrowRight]');
    await userEvent.keyboard('[Enter]');

    expect(getPanelIdsInOrder()).toEqual(['control2', 'control1', 'control3']);
    expect(getOrders(getLastControls())).toEqual({ control1: 1, control2: 0, control3: 2 });
  });
});
