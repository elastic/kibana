/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getSampleLayout } from './test_utils/sample_layout';
import { GridLayout, GridLayoutProps } from './grid_layout';
import { gridSettings, mockRenderPanelContents } from './test_utils/mocks';
import { cloneDeep } from 'lodash';

class TouchEventFake extends Event {
  constructor(public touches: Array<{ clientX: number; clientY: number }>) {
    super('touchmove');
    this.touches = [{ clientX: 256, clientY: 128 }];
  }
}

describe('GridLayout', () => {
  const renderGridLayout = (propsOverrides: Partial<GridLayoutProps> = {}) => {
    const defaultProps: GridLayoutProps = {
      accessMode: 'EDIT',
      layout: getSampleLayout(),
      gridSettings,
      renderPanelContents: mockRenderPanelContents,
      onLayoutChange: jest.fn(),
    };

    const { rerender, ...rtlRest } = render(<GridLayout {...defaultProps} {...propsOverrides} />);

    return {
      ...rtlRest,
      rerender: (overrides: Partial<GridLayoutProps>) =>
        rerender(<GridLayout {...defaultProps} {...overrides} />),
    };
  };

  const getAllThePanelIds = () =>
    screen
      .getAllByRole('button', { name: /panelId:panel/i })
      .map((el) => el.getAttribute('aria-label')?.replace(/panelId:/g, ''));

  const mouseStartDragging = (handle: HTMLElement, options = { clientX: 0, clientY: 0 }) => {
    fireEvent.mouseDown(handle, options);
  };

  const mouseMoveTo = (options = { clientX: 256, clientY: 128 }) => {
    fireEvent.mouseMove(document, options);
  };

  const mouseDrop = (handle: HTMLElement) => {
    fireEvent.mouseUp(handle);
  };
  const touchStart = (handle: HTMLElement, options = { touches: [{ clientX: 0, clientY: 0 }] }) => {
    fireEvent.touchStart(handle, options);
  };
  const touchMoveTo = (options = { touches: [{ clientX: 256, clientY: 128 }] }) => {
    const realTouchEvent = window.TouchEvent;
    // @ts-expect-error
    window.TouchEvent = TouchEventFake;
    fireEvent.touchMove(document, new TouchEventFake(options.touches));
    window.TouchEvent = realTouchEvent;
  };
  const touchEnd = (handle: HTMLElement) => {
    fireEvent.touchEnd(handle);
  };

  const assertTabThroughPanel = async (panelId: string) => {
    await userEvent.tab(); // tab to drag handle
    await userEvent.tab(); // tab to the panel
    expect(screen.getByLabelText(`panelId:${panelId}`)).toHaveFocus();
    await userEvent.tab(); // tab to the resize handle
  };

  const expectedInitialOrder = [
    'panel1',
    'panel5',
    'panel2',
    'panel3',
    'panel7',
    'panel6',
    'panel8',
    'panel4',
    'panel9',
    'panel10',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`'renderPanelContents' is not called during dragging`, () => {
    renderGridLayout();

    expect(mockRenderPanelContents).toHaveBeenCalledTimes(10); // renderPanelContents is called for each of 10 panels
    jest.clearAllMocks();

    const panel1DragHandle = screen.getAllByRole('button', { name: /drag to move/i })[0];
    mouseStartDragging(panel1DragHandle);
    mouseMoveTo({ clientX: 256, clientY: 128 });
    expect(mockRenderPanelContents).toHaveBeenCalledTimes(0); // renderPanelContents should not be called during dragging

    mouseDrop(panel1DragHandle);
    expect(mockRenderPanelContents).toHaveBeenCalledTimes(0); // renderPanelContents should not be called after reordering
  });

  describe('panels order: panels are rendered from left to right, from top to bottom', () => {
    it('focus management - tabbing through the panels', async () => {
      renderGridLayout();
      // we only test a few panels because otherwise that test would execute for too long
      await assertTabThroughPanel('panel1');
      await assertTabThroughPanel('panel5');
      await assertTabThroughPanel('panel2');
      await assertTabThroughPanel('panel3');
    });
    it('on initializing', () => {
      renderGridLayout();
      expect(getAllThePanelIds()).toEqual(expectedInitialOrder);
    });

    it('after reordering some panels', async () => {
      renderGridLayout();

      const panel1DragHandle = screen.getAllByRole('button', { name: /drag to move/i })[0];
      mouseStartDragging(panel1DragHandle);

      mouseMoveTo({ clientX: 256, clientY: 128 });
      expect(getAllThePanelIds()).toEqual(expectedInitialOrder); // the panels shouldn't be reordered till we mouseDrop

      mouseDrop(panel1DragHandle);
      expect(getAllThePanelIds()).toEqual([
        'panel2',
        'panel5',
        'panel3',
        'panel7',
        'panel1',
        'panel8',
        'panel6',
        'panel4',
        'panel9',
        'panel10',
      ]);
    });
    it('after reordering some panels via touch events', async () => {
      renderGridLayout();

      const panel1DragHandle = screen.getAllByRole('button', { name: /drag to move/i })[0];
      touchStart(panel1DragHandle);
      touchMoveTo({ touches: [{ clientX: 256, clientY: 128 }] });
      expect(getAllThePanelIds()).toEqual(expectedInitialOrder); // the panels shouldn't be reordered till we mouseDrop

      touchEnd(panel1DragHandle);
      expect(getAllThePanelIds()).toEqual([
        'panel2',
        'panel5',
        'panel3',
        'panel7',
        'panel1',
        'panel8',
        'panel6',
        'panel4',
        'panel9',
        'panel10',
      ]);
    });

    it('after removing a panel', async () => {
      const { rerender } = renderGridLayout();
      const sampleLayoutWithoutPanel1 = cloneDeep(getSampleLayout());
      delete sampleLayoutWithoutPanel1[0].panels.panel1;
      rerender({ layout: sampleLayoutWithoutPanel1 });

      expect(getAllThePanelIds()).toEqual([
        'panel2',
        'panel5',
        'panel3',
        'panel7',
        'panel6',
        'panel8',
        'panel4',
        'panel9',
        'panel10',
      ]);
    });

    it('after replacing a panel id', async () => {
      const { rerender } = renderGridLayout();
      const modifiedLayout = cloneDeep(getSampleLayout());
      const newPanel = { ...modifiedLayout[0].panels.panel1, id: 'panel11' };
      delete modifiedLayout[0].panels.panel1;
      modifiedLayout[0].panels.panel11 = newPanel;

      rerender({ layout: modifiedLayout });

      expect(getAllThePanelIds()).toEqual([
        'panel11',
        'panel5',
        'panel2',
        'panel3',
        'panel7',
        'panel6',
        'panel8',
        'panel4',
        'panel9',
        'panel10',
      ]);
    });
  });
});
