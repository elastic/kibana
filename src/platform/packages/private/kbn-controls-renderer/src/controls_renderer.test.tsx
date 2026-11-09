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
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  CONTROL_WIDTH_LARGE,
  CONTROL_WIDTH_MEDIUM,
  CONTROL_WIDTH_SMALL,
  OPTIONS_LIST_CONTROL,
} from '@kbn/controls-constants';
import type { PinnedControlLayoutState } from '@kbn/controls-schemas';

import { ControlsRenderer } from './controls_renderer';
import type { ControlsLayout, ControlsRendererParentApi } from './types';
import { CONTROL_WIDTH_PIXELS } from './utils';

// the control itself is not under test; render a placeholder so only the layout is exercised
jest.mock('./components/control_panel', () => ({
  ControlPanel: ({ control: { id } }: { control: { id: string } }) => (
    <div data-test-subj={`control-${id}`}>{`control ${id}`}</div>
  ),
}));

const getControl = (
  order: number,
  overrides: Partial<PinnedControlLayoutState> = {}
): PinnedControlLayoutState =>
  ({
    type: OPTIONS_LIST_CONTROL,
    order,
    width: CONTROL_WIDTH_MEDIUM,
    grow: false,
    ...overrides,
  } as PinnedControlLayoutState);

const getControls = (
  overrides: { [id: string]: Partial<PinnedControlLayoutState> } = {}
): ControlsLayout => ({
  controls: {
    control1: getControl(0, overrides.control1),
    control2: getControl(1, overrides.control2),
  },
});

const getParentApi = (viewMode: 'edit' | 'view' = 'edit') =>
  ({
    viewMode$: new BehaviorSubject(viewMode),
    children$: new BehaviorSubject({}),
    registerChildApi: jest.fn(),
    getSerializedStateForChild: jest.fn(),
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
  screen.getByTestId(`control-${id}`).closest('.kbnFlexPanel') as HTMLElement;

const getPanelIdsInOrder = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.kbnFlexPanel')).map((panel) =>
    within(panel)
      .getByText(/control /)
      .textContent?.replace('control ', '')
  );

describe('ControlsRenderer', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    window.HTMLElement.prototype.scrollTo = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when there are no controls', () => {
    const { container } = renderControls({ controls: {} });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each control in order with the pixel width of its width option', () => {
    renderControls(
      getControls({
        control1: { order: 1, width: CONTROL_WIDTH_SMALL },
        control2: { order: 0, width: CONTROL_WIDTH_LARGE, grow: true },
      })
    );
    expect(getPanelIdsInOrder()).toEqual(['control2', 'control1']);
    expect(getPanel('control1')).toHaveStyle({
      width: `${CONTROL_WIDTH_PIXELS[CONTROL_WIDTH_SMALL]}px`,
      'flex-grow': '0',
    });
    expect(getPanel('control2')).toHaveStyle({
      width: `${CONTROL_WIDTH_PIXELS[CONTROL_WIDTH_LARGE]}px`,
      'flex-grow': '1',
    });
  });

  it('defaults to the medium width when a control has no width', () => {
    renderControls({
      controls: { control1: getControl(0, { width: undefined }) },
    });
    expect(getPanel('control1')).toHaveStyle({
      width: `${CONTROL_WIDTH_PIXELS[CONTROL_WIDTH_MEDIUM]}px`,
    });
  });

  it('does not report a change on initial render', () => {
    renderControls(getControls());
    expect(onControlsChanged).not.toHaveBeenCalled();
  });

  describe('controls being added', () => {
    it('renders a newly added control without reporting a change', () => {
      const initial = getControls();
      const { rerender } = renderControls(initial);

      rerender({
        controls: { ...initial.controls, control3: getControl(2, { width: CONTROL_WIDTH_SMALL }) },
      });

      expect(getPanelIdsInOrder()).toEqual(['control1', 'control2', 'control3']);
      expect(getPanel('control3')).toHaveStyle({
        width: `${CONTROL_WIDTH_PIXELS[CONTROL_WIDTH_SMALL]}px`,
      });
      expect(onControlsChanged).not.toHaveBeenCalled();
    });

    it('renders several controls added one after another without reporting changes', () => {
      let controls: ControlsLayout = { controls: { control1: getControl(0) } };
      const { rerender } = renderControls(controls);

      ['control2', 'control3', 'control4'].forEach((id, index) => {
        controls = { controls: { ...controls.controls, [id]: getControl(index + 1) } };
        rerender(controls);
      });

      expect(getPanelIdsInOrder()).toEqual(['control1', 'control2', 'control3', 'control4']);
      expect(onControlsChanged).not.toHaveBeenCalled();
    });

    it('renders the controls when the first control is added to an empty group', () => {
      const { rerender } = renderControls({ controls: {} });
      rerender(getControls());
      expect(getPanelIdsInOrder()).toEqual(['control1', 'control2']);
      expect(onControlsChanged).not.toHaveBeenCalled();
    });

    it('stops rendering removed controls without reporting a change', () => {
      const { rerender } = renderControls(getControls());
      rerender({ controls: { control2: getControl(1) } });
      expect(getPanelIdsInOrder()).toEqual(['control2']);
      expect(onControlsChanged).not.toHaveBeenCalled();
    });
  });

  describe('control width changing', () => {
    it('updates the rendered width without reporting a change', () => {
      const initial = getControls();
      const { rerender } = renderControls(initial);

      rerender({
        controls: {
          ...initial.controls,
          control1: { ...initial.controls.control1, width: CONTROL_WIDTH_SMALL },
        },
      });
      expect(getPanel('control1')).toHaveStyle({
        width: `${CONTROL_WIDTH_PIXELS[CONTROL_WIDTH_SMALL]}px`,
      });
      expect(getPanel('control2')).toHaveStyle({
        width: `${CONTROL_WIDTH_PIXELS[CONTROL_WIDTH_MEDIUM]}px`,
      });

      rerender({
        controls: {
          ...initial.controls,
          control1: { ...initial.controls.control1, width: CONTROL_WIDTH_LARGE },
        },
      });
      expect(getPanel('control1')).toHaveStyle({
        width: `${CONTROL_WIDTH_PIXELS[CONTROL_WIDTH_LARGE]}px`,
      });
      expect(onControlsChanged).not.toHaveBeenCalled();
    });

    it('updates flex grow without reporting a change', () => {
      const initial = getControls();
      const { rerender } = renderControls(initial);
      rerender({
        controls: {
          ...initial.controls,
          control1: { ...initial.controls.control1, grow: true },
        },
      });
      expect(getPanel('control1')).toHaveStyle({ 'flex-grow': '1' });
      expect(onControlsChanged).not.toHaveBeenCalled();
    });

    it('does not report a change when rerendered with an equal (but new) controls object', () => {
      const { rerender } = renderControls(getControls());
      rerender(getControls());
      rerender(getControls());
      expect(onControlsChanged).not.toHaveBeenCalled();
    });

    it('does not report a change when only the `onControlsChanged` callback changes', () => {
      const parentApi = getParentApi();
      const { rerender } = render(
        <ControlsRenderer
          controls={getControls()}
          onControlsChanged={jest.fn()}
          parentApi={parentApi}
        />,
        { wrapper: EuiThemeProvider }
      );
      const nextCallback = jest.fn();
      rerender(
        <ControlsRenderer
          controls={getControls()}
          onControlsChanged={nextCallback}
          parentApi={parentApi}
        />
      );
      expect(nextCallback).not.toHaveBeenCalled();
    });

    it('keeps rendering the latest state when changes arrive in quick succession', () => {
      const initial = getControls();
      const { rerender } = renderControls(initial);

      const widths = [CONTROL_WIDTH_SMALL, CONTROL_WIDTH_LARGE, CONTROL_WIDTH_MEDIUM] as const;
      widths.forEach((width) => {
        rerender({
          controls: { ...initial.controls, control1: { ...initial.controls.control1, width } },
        });
      });

      expect(getPanel('control1')).toHaveStyle({
        width: `${CONTROL_WIDTH_PIXELS[CONTROL_WIDTH_MEDIUM]}px`,
      });
      expect(onControlsChanged).not.toHaveBeenCalled();
    });
  });

  describe('user interaction', () => {
    const resizeWithKeyboard = async (id: string) => {
      const handle = within(getPanel(id)).getByLabelText(/resize panel/i);
      handle.focus();
      await userEvent.keyboard('[Enter]');
      await userEvent.keyboard('[ArrowRight]');
      await userEvent.keyboard('[Enter]');
    };

    it('reports the snapped width as a control width option when a resize is committed', async () => {
      renderControls(getControls());

      // jsdom has no layout, so one arrow press resizes to a few px, which snaps to the smallest width
      await resizeWithKeyboard('control1');

      expect(onControlsChanged).toHaveBeenCalledTimes(1);
      const [{ controls }] = onControlsChanged.mock.calls[0];
      expect(controls.control1.width).toBe(CONTROL_WIDTH_SMALL);
      expect(controls.control2).toEqual(getControls().controls.control2);
    });

    it('does not report a change when the control is resized back to its current width', async () => {
      renderControls(getControls({ control1: { width: CONTROL_WIDTH_SMALL } }));
      await resizeWithKeyboard('control1');
      expect(onControlsChanged).not.toHaveBeenCalled();
    });

    it('does not report a change when a resize is cancelled', async () => {
      renderControls(getControls());
      within(getPanel('control1'))
        .getByLabelText(/resize panel/i)
        .focus();
      await userEvent.keyboard('[Enter]');
      await userEvent.keyboard('[ArrowRight]');
      await userEvent.keyboard('{Escape}');

      expect(onControlsChanged).not.toHaveBeenCalled();
      expect(getPanel('control1')).toHaveStyle({
        width: `${CONTROL_WIDTH_PIXELS[CONTROL_WIDTH_MEDIUM]}px`,
      });
    });

    it('settles on the parent state after a resize is reported and fed back in', async () => {
      const initial = getControls();
      const { rerender } = renderControls(initial);
      await resizeWithKeyboard('control1');

      const [[resized]] = onControlsChanged.mock.calls;
      rerender(resized);
      rerender(resized);

      expect(getPanel('control1')).toHaveStyle({
        width: `${CONTROL_WIDTH_PIXELS[CONTROL_WIDTH_SMALL]}px`,
      });
      expect(onControlsChanged).toHaveBeenCalledTimes(1);
    });

    it('does not let the user resize in view mode, and allows it once editing starts', async () => {
      const parentApi = getParentApi('view');
      renderControls(getControls(), parentApi);

      await resizeWithKeyboard('control1');
      expect(onControlsChanged).not.toHaveBeenCalled();

      act(() => parentApi.viewMode$.next('edit'));
      await resizeWithKeyboard('control1');
      expect(onControlsChanged).toHaveBeenCalledTimes(1);
    });
  });
});
