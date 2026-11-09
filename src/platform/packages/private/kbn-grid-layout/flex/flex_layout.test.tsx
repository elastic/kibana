/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { GridLayoutProps } from './flex_layout';
import { FlexLayout } from './flex_layout';
import type { FlexLayoutData, GridSettings } from './types';

const PANEL_WIDTH = 200;

const getLayout = (
  overrides: { [id: string]: Partial<FlexLayoutData[string]> } = {}
): FlexLayoutData => {
  const layout: FlexLayoutData = {};
  ['panel1', 'panel2', 'panel3'].forEach((id, order) => {
    layout[id] = { type: 'panel', id, order, grow: false, width: PANEL_WIDTH, ...overrides[id] };
  });
  return layout;
};

const gridSettings: GridSettings = {
  gutterSize: 50,
  rowHeight: 100,
  columnCount: 1,
  keyboardDragTopLimit: 0,
};

const onLayoutChange = jest.fn();

const renderPanelContents = (panelId: string) => <div>{`panel content ${panelId}`}</div>;

type PropsOverrides = Partial<
  Omit<GridLayoutProps, 'useCustomDragHandle' | 'renderPanelContents'>
> & {
  useCustomDragHandle?: boolean;
  renderPanelContents?: (panelId: string, setDragHandles?: () => void) => React.ReactNode;
};

const renderFlexLayout = (propsOverrides: PropsOverrides = {}) => {
  const getProps = (overrides: PropsOverrides) =>
    ({
      accessMode: 'EDIT',
      layout: getLayout(),
      gridSettings,
      renderPanelContents,
      onLayoutChange,
      ...overrides,
    } as GridLayoutProps);

  const { rerender, ...rest } = render(<FlexLayout {...getProps(propsOverrides)} />, {
    wrapper: EuiThemeProvider,
  });
  return {
    ...rest,
    rerender: (overrides: PropsOverrides) =>
      rerender(<FlexLayout {...getProps({ ...propsOverrides, ...overrides })} />),
  };
};

const getPanel = (panelId: string) =>
  screen.getByText(`panel content ${panelId}`).closest('.kbnFlexPanel') as HTMLElement;

const getPanelIdsInOrder = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.kbnFlexPanel')).map((panel) =>
    within(panel)
      .getByText(/panel content/)
      .textContent?.replace('panel content ', '')
  );

const getHandle = (panelId: string, type: 'drag' | 'resize') =>
  within(getPanel(panelId)).getByLabelText(type === 'drag' ? /drag to move/i : /resize panel/i);

const getLastLayout = (): FlexLayoutData => {
  const { calls } = onLayoutChange.mock;
  return calls[calls.length - 1][0];
};

/**
 * jsdom does not do layout, so give every panel a rect based on its `order`, and the dragged
 * (fixed position) panel a rect based on its `left` style, so that reordering can be tested
 */
const mockRects = () =>
  jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      const rect = (left: number, width: number, height: number) =>
        ({
          left,
          right: left + width,
          top: 0,
          bottom: height,
          width,
          height,
          x: left,
          y: 0,
        } as DOMRect);

      if (this.classList.contains('kbnFlex')) return rect(0, 1000, 500);
      // handles sit at the left edge of their panel, so they move along with a dragged panel
      const panel = this.closest<HTMLElement>('.kbnFlexPanel');
      if (panel) {
        // `style.order` is only applied once the layout has emitted, so fall back to DOM position
        const domIndex = Array.from(
          panel.parentElement?.querySelectorAll(':scope > .kbnFlexPanel') ?? []
        ).indexOf(panel);
        const order = panel.style.order ? parseInt(panel.style.order, 10) - 1 : domIndex;
        const left =
          panel.style.position === 'fixed'
            ? parseFloat(panel.style.left)
            : order * (PANEL_WIDTH + 100);
        return panel === this ? rect(left, PANEL_WIDTH, gridSettings.rowHeight) : rect(left, 0, 0);
      }
      return rect(0, 0, 0);
    });

describe('FlexLayout', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    window.HTMLElement.prototype.scrollTo = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders every panel in `order`, not in key order', () => {
      renderFlexLayout({
        layout: getLayout({ panel1: { order: 2 }, panel2: { order: 0 }, panel3: { order: 1 } }),
      });
      expect(getPanelIdsInOrder()).toEqual(['panel2', 'panel3', 'panel1']);
    });

    it('applies width, grow and order to each panel', () => {
      renderFlexLayout({
        layout: getLayout({ panel1: { width: 123, grow: true }, panel2: { order: 5 } }),
      });
      expect(getPanel('panel1')).toHaveStyle({ width: '123px', 'flex-grow': '1' });
      expect(getPanel('panel2')).toHaveStyle({ order: '6', 'flex-grow': '0' });
    });

    it('renders a default drag handle for each panel unless a custom handle is used', () => {
      const { unmount } = renderFlexLayout();
      expect(screen.getAllByRole('button', { name: /drag to move/i })).toHaveLength(3);
      unmount();

      renderFlexLayout({
        useCustomDragHandle: true,
        renderPanelContents: (panelId: string) => <div>{`panel content ${panelId}`}</div>,
      });
      expect(screen.queryByRole('button', { name: /drag to move/i })).not.toBeInTheDocument();
    });

    it('passes `setDragHandles` to `renderPanelContents` when using a custom drag handle', () => {
      const renderContents = jest.fn((panelId: string) => <div>{`panel content ${panelId}`}</div>);
      renderFlexLayout({ useCustomDragHandle: true, renderPanelContents: renderContents });
      expect(renderContents).toHaveBeenCalledWith('panel1', expect.any(Function));
    });

    it('marks the layout as static in VIEW mode and interactive in EDIT mode', () => {
      const { rerender } = renderFlexLayout({ accessMode: 'VIEW' });
      expect(screen.getByTestId('kbnFlexLayout')).toHaveClass('kbnFlex--static');
      rerender({ accessMode: 'EDIT' });
      expect(screen.getByTestId('kbnFlexLayout')).not.toHaveClass('kbnFlex--static');
    });
  });

  describe('syncing the `layout` prop', () => {
    it('renders panels that are added, removed or reordered through the `layout` prop', () => {
      const { rerender } = renderFlexLayout();

      rerender({
        layout: {
          ...getLayout({ panel1: { order: 1 }, panel2: { order: 0 } }),
          panel4: { type: 'panel', id: 'panel4', order: 2, grow: false, width: PANEL_WIDTH },
        },
      });
      expect(getPanelIdsInOrder()).toEqual(['panel2', 'panel1', 'panel3', 'panel4']);

      const { panel3, ...withoutPanel3 } = getLayout();
      rerender({ layout: withoutPanel3 });
      expect(getPanelIdsInOrder()).toEqual(['panel1', 'panel2']);
    });

    it('updates the panel width when the `layout` prop changes', () => {
      const { rerender } = renderFlexLayout();
      expect(getPanel('panel1')).toHaveStyle({ width: `${PANEL_WIDTH}px` });
      rerender({ layout: getLayout({ panel1: { width: 400 } }) });
      expect(getPanel('panel1')).toHaveStyle({ width: '400px' });
    });

    it('does not emit again when rerendered with an equal (but new) `layout` object', () => {
      const { rerender } = renderFlexLayout();
      onLayoutChange.mockClear();
      rerender({ layout: getLayout() });
      rerender({ layout: getLayout() });
      expect(onLayoutChange).not.toHaveBeenCalled();
    });

    it('only emits the new layout once when the `layout` prop changes', () => {
      const { rerender } = renderFlexLayout();
      onLayoutChange.mockClear();
      rerender({ layout: getLayout({ panel1: { width: 400 } }) });
      expect(onLayoutChange).toHaveBeenCalledTimes(1);
      expect(getLastLayout().panel1.width).toBe(400);
    });

    it('does not loop when `onLayoutChange` feeds the emitted layout back into `layout`', () => {
      let currentLayout = getLayout();
      const feedback = jest.fn((newLayout: FlexLayoutData) => {
        currentLayout = newLayout;
      });
      const { rerender } = renderFlexLayout({ onLayoutChange: feedback });
      rerender({ layout: getLayout({ panel1: { width: 400 } }), onLayoutChange: feedback });
      rerender({ layout: currentLayout, onLayoutChange: feedback });
      expect(feedback).toHaveBeenCalledTimes(2); // initial layout + the one change
      expect(getPanel('panel1')).toHaveStyle({ width: '400px' });
    });

    it('uses the latest `onLayoutChange` callback', () => {
      const first = jest.fn();
      const second = jest.fn();
      const { rerender } = renderFlexLayout({ onLayoutChange: first });
      rerender({ onLayoutChange: second });
      first.mockClear();
      rerender({ onLayoutChange: second, layout: getLayout({ panel1: { width: 400 } }) });
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledWith(getLayout({ panel1: { width: 400 } }));
    });
  });

  describe('keyboard interaction', () => {
    const pressKey = async (key: string) => userEvent.keyboard(key);

    describe('resize', () => {
      it('marks the panel active while resizing and commits on Enter', async () => {
        renderFlexLayout();
        getHandle('panel1', 'resize').focus();
        expect(getPanel('panel1')).not.toHaveClass('kbnFlexPanel--active');

        await pressKey('[Enter]');
        await pressKey('[ArrowRight]');
        expect(getPanel('panel1')).toHaveClass('kbnFlexPanel--active');
        expect(getHandle('panel1', 'resize')).toHaveFocus();

        await pressKey('[Enter]');
        expect(getPanel('panel1')).not.toHaveClass('kbnFlexPanel--active');
      });

      it('does not emit draft layouts while resizing, only the final layout on commit', async () => {
        renderFlexLayout();
        onLayoutChange.mockClear();
        getHandle('panel1', 'resize').focus();

        await pressKey('[Enter]');
        await pressKey('[ArrowRight]');
        await pressKey('[ArrowRight]');
        expect(onLayoutChange).not.toHaveBeenCalled();

        await pressKey('[Enter]');
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(getLastLayout().panel1.width).not.toBe(PANEL_WIDTH);
        expect(getLastLayout().panel2).toEqual(getLayout().panel2);
      });

      it('restores the original layout and emits nothing when cancelled with Escape', async () => {
        renderFlexLayout();
        onLayoutChange.mockClear();
        getHandle('panel1', 'resize').focus();

        await pressKey('[Enter]');
        await pressKey('[ArrowRight]');
        await pressKey('{Escape}');

        expect(getPanel('panel1')).not.toHaveClass('kbnFlexPanel--active');
        expect(getPanel('panel1')).toHaveStyle({ width: `${PANEL_WIDTH}px` });
        expect(onLayoutChange).not.toHaveBeenCalled();
      });

      it('snaps the committed width to the closest width breakpoint', async () => {
        // one arrow press moves the preview to `rowHeight + gutterSize` = 150px, closest to 160
        renderFlexLayout({ gridSettings: { ...gridSettings, widthBreakpoints: [160, 500] } });
        onLayoutChange.mockClear();
        getHandle('panel1', 'resize').focus();

        await pressKey('[Enter]');
        await pressKey('[ArrowRight]');
        await pressKey('[Enter]');

        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        expect(getLastLayout().panel1.width).toBe(160);
      });

      it('respects `resizeOptions.minWidth`', async () => {
        renderFlexLayout({
          layout: getLayout({ panel1: { resizeOptions: { minWidth: 180 } } }),
        });
        onLayoutChange.mockClear();
        getHandle('panel1', 'resize').focus();

        await pressKey('[Enter]');
        await pressKey('[ArrowRight]'); // would be 150px without a minimum
        await pressKey('[Enter]');

        expect(getLastLayout().panel1.width).toBe(180);
      });

      it('only snaps to breakpoints at or above `resizeOptions.minWidth`', async () => {
        // preview is clamped to 180px; 160 is closer but below the minimum, so 500 is the only valid breakpoint
        renderFlexLayout({
          layout: getLayout({ panel1: { resizeOptions: { minWidth: 180 } } }),
          gridSettings: { ...gridSettings, widthBreakpoints: [160, 500] },
        });
        onLayoutChange.mockClear();
        getHandle('panel1', 'resize').focus();

        await pressKey('[Enter]');
        await pressKey('[ArrowRight]');
        await pressKey('[Enter]');

        expect(getLastLayout().panel1.width).toBe(500);
      });

      it('only snaps to breakpoints at or below `resizeOptions.maxWidth`', async () => {
        // preview is 150px; 160 is closest but exceeds the maximum, so 100 is the only valid breakpoint
        renderFlexLayout({
          layout: getLayout({ panel1: { resizeOptions: { maxWidth: 150 } } }),
          gridSettings: { ...gridSettings, widthBreakpoints: [100, 160] },
        });
        onLayoutChange.mockClear();
        getHandle('panel1', 'resize').focus();

        await pressKey('[Enter]');
        await pressKey('[ArrowRight]');
        await pressKey('[Enter]');

        expect(getLastLayout().panel1.width).toBe(100);
      });

      it('does not emit if the width did not change', async () => {
        renderFlexLayout({ gridSettings: { ...gridSettings, widthBreakpoints: [PANEL_WIDTH] } });
        onLayoutChange.mockClear();
        getHandle('panel1', 'resize').focus();

        await pressKey('[Enter]');
        await pressKey('[ArrowRight]');
        await pressKey('[Enter]'); // snaps back to the original width

        expect(onLayoutChange).not.toHaveBeenCalled();
      });
    });

    describe('drag', () => {
      let rectSpy: jest.SpyInstance;
      beforeEach(() => {
        rectSpy = mockRects();
      });
      afterEach(() => {
        rectSpy.mockRestore();
      });

      it('marks the panel active while dragging and clears it on commit', async () => {
        renderFlexLayout();
        getHandle('panel1', 'drag').focus();

        await pressKey('[Enter]');
        await pressKey('[ArrowRight]');
        expect(getPanel('panel1')).toHaveClass('kbnFlexPanel--active');
        expect(getPanel('panel1')).toHaveStyle({ position: 'fixed' });

        await pressKey('[Enter]');
        expect(getPanel('panel1')).not.toHaveClass('kbnFlexPanel--active');
        expect(getPanel('panel1').style.position).toBe('');
      });

      it('reorders panels and emits the new order once on commit', async () => {
        renderFlexLayout();
        onLayoutChange.mockClear();
        getHandle('panel1', 'drag').focus();

        await pressKey('[Enter]');
        // each press moves 150px: 300px sits between panel2 (left 300) and panel3 (left 600)
        await pressKey('[ArrowRight]');
        await pressKey('[ArrowRight]');
        await pressKey('[ArrowRight]');
        await pressKey('[ArrowRight]');
        expect(onLayoutChange).not.toHaveBeenCalled(); // no draft emits

        await pressKey('[Enter]');
        expect(onLayoutChange).toHaveBeenCalledTimes(1);
        const { panel1, panel2, panel3 } = getLastLayout();
        expect(panel2.order).toBeLessThan(panel1.order);
        expect(panel1.order).toBeLessThan(panel3.order);
        expect(getPanelIdsInOrder()).toEqual(['panel2', 'panel1', 'panel3']);
      });

      it('restores the original order when cancelled with Escape', async () => {
        renderFlexLayout();
        onLayoutChange.mockClear();
        getHandle('panel1', 'drag').focus();

        await pressKey('[Enter]');
        for (let i = 0; i < 4; i++) await pressKey('[ArrowRight]');
        await pressKey('{Escape}');

        expect(getPanelIdsInOrder()).toEqual(['panel1', 'panel2', 'panel3']);
        expect(onLayoutChange).not.toHaveBeenCalled();
        expect(getPanel('panel1')).not.toHaveClass('kbnFlexPanel--active');
      });

      it('does not emit when dropped back in the original position', async () => {
        renderFlexLayout();
        onLayoutChange.mockClear();
        getHandle('panel1', 'drag').focus();

        await pressKey('[Enter]');
        await pressKey('[ArrowRight]');
        await pressKey('[Enter]');

        expect(onLayoutChange).not.toHaveBeenCalled();
        expect(getPanelIdsInOrder()).toEqual(['panel1', 'panel2', 'panel3']);
      });
    });

    describe('VIEW mode', () => {
      it('does not start an interaction', async () => {
        renderFlexLayout({ accessMode: 'VIEW' });
        onLayoutChange.mockClear();

        getHandle('panel1', 'resize').focus();
        await pressKey('[Enter]');
        await pressKey('[ArrowRight]');
        expect(getPanel('panel1')).not.toHaveClass('kbnFlexPanel--active');

        await pressKey('[Enter]');
        expect(onLayoutChange).not.toHaveBeenCalled();
        expect(getPanel('panel1')).toHaveStyle({ width: `${PANEL_WIDTH}px` });
      });

      it('allows interaction once switched to EDIT mode', async () => {
        const { rerender } = renderFlexLayout({ accessMode: 'VIEW' });
        rerender({ accessMode: 'EDIT' });

        getHandle('panel1', 'resize').focus();
        await pressKey('[Enter]');
        await pressKey('[ArrowRight]');
        expect(getPanel('panel1')).toHaveClass('kbnFlexPanel--active');
        await pressKey('{Escape}');
      });
    });
  });
});
