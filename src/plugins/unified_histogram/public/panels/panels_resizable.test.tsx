/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import type { ReactElement, RefObject } from 'react';
import React from 'react';
import { PanelsResizable } from './panels_resizable';
import { act } from 'react-dom/test-utils';

const containerHeight = 1000;
const topPanelId = 'topPanel';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useResizeObserver: jest.fn(),
  useGeneratedHtmlId: jest.fn(() => topPanelId),
}));

import * as eui from '@elastic/eui';
import { waitFor } from '@testing-library/dom';

describe('Panels resizable', () => {
  const mountComponent = ({
    className = '',
    resizeRef = { current: null },
    initialTopPanelHeight = 0,
    minTopPanelHeight = 0,
    minMainPanelHeight = 0,
    topPanel = <></>,
    mainPanel = <></>,
    attachTo,
    onTopPanelHeightChange = jest.fn(),
  }: {
    className?: string;
    resizeRef?: RefObject<HTMLDivElement>;
    initialTopPanelHeight?: number;
    minTopPanelHeight?: number;
    minMainPanelHeight?: number;
    topPanel?: ReactElement;
    mainPanel?: ReactElement;
    attachTo?: HTMLElement;
    onTopPanelHeightChange?: (topPanelHeight: number) => void;
  }) => {
    return mount(
      <PanelsResizable
        className={className}
        resizeRef={resizeRef}
        topPanelHeight={initialTopPanelHeight}
        minTopPanelHeight={minTopPanelHeight}
        minMainPanelHeight={minMainPanelHeight}
        topPanel={topPanel}
        mainPanel={mainPanel}
        onTopPanelHeightChange={onTopPanelHeightChange}
      />,
      attachTo ? { attachTo } : undefined
    );
  };

  const expectCorrectPanelSizes = (
    component: ReactWrapper,
    currentContainerHeight: number,
    topPanelHeight: number
  ) => {
    const topPanelSize = (topPanelHeight / currentContainerHeight) * 100;
    expect(
      component.find('[data-test-subj="unifiedHistogramResizablePanelTop"]').at(0).prop('size')
    ).toBe(topPanelSize);
    expect(
      component.find('[data-test-subj="unifiedHistogramResizablePanelMain"]').at(0).prop('size')
    ).toBe(100 - topPanelSize);
  };

  const forceRender = (component: ReactWrapper) => {
    component.setProps({}).update();
  };

  beforeEach(() => {
    jest.spyOn(eui, 'useResizeObserver').mockReturnValue({ height: containerHeight, width: 0 });
  });

  it('should render both panels', () => {
    const topPanel = <div data-test-subj="topPanel" />;
    const mainPanel = <div data-test-subj="mainPanel" />;
    const component = mountComponent({ topPanel, mainPanel });
    expect(component.contains(topPanel)).toBe(true);
    expect(component.contains(mainPanel)).toBe(true);
  });

  it('should set the initial heights of both panels', () => {
    const initialTopPanelHeight = 200;
    const component = mountComponent({ initialTopPanelHeight });
    expectCorrectPanelSizes(component, containerHeight, initialTopPanelHeight);
  });

  it('should set the correct heights of both panels when the panels are resized', () => {
    const initialTopPanelHeight = 200;
    const onTopPanelHeightChange = jest.fn((topPanelHeight) => {
      component.setProps({ topPanelHeight }).update();
    });
    const component = mountComponent({ initialTopPanelHeight, onTopPanelHeightChange });
    expectCorrectPanelSizes(component, containerHeight, initialTopPanelHeight);
    const newTopPanelSize = 30;
    const onPanelSizeChange = component
      .find('[data-test-subj="unifiedHistogramResizableContainer"]')
      .at(0)
      .prop('onPanelWidthChange') as Function;
    act(() => {
      onPanelSizeChange({ [topPanelId]: newTopPanelSize });
    });
    forceRender(component);
    const newTopPanelHeight = (newTopPanelSize / 100) * containerHeight;
    expect(onTopPanelHeightChange).toHaveBeenCalledWith(newTopPanelHeight);
    expectCorrectPanelSizes(component, containerHeight, newTopPanelHeight);
  });

  it('should maintain the height of the top panel and resize the main panel when the container height changes', () => {
    const initialTopPanelHeight = 200;
    const component = mountComponent({ initialTopPanelHeight });
    expectCorrectPanelSizes(component, containerHeight, initialTopPanelHeight);
    const newContainerHeight = 2000;
    jest.spyOn(eui, 'useResizeObserver').mockReturnValue({ height: newContainerHeight, width: 0 });
    forceRender(component);
    expectCorrectPanelSizes(component, newContainerHeight, initialTopPanelHeight);
  });

  it('should resize the top panel once the main panel is at its minimum height', () => {
    const initialTopPanelHeight = 500;
    const minTopPanelHeight = 100;
    const minMainPanelHeight = 100;
    const component = mountComponent({
      initialTopPanelHeight,
      minTopPanelHeight,
      minMainPanelHeight,
    });
    expectCorrectPanelSizes(component, containerHeight, initialTopPanelHeight);
    const newContainerHeight = 400;
    jest.spyOn(eui, 'useResizeObserver').mockReturnValue({ height: newContainerHeight, width: 0 });
    forceRender(component);
    expectCorrectPanelSizes(component, newContainerHeight, newContainerHeight - minMainPanelHeight);
    jest.spyOn(eui, 'useResizeObserver').mockReturnValue({ height: containerHeight, width: 0 });
    forceRender(component);
    expectCorrectPanelSizes(component, containerHeight, initialTopPanelHeight);
  });

  it('should maintain the minimum heights of both panels when the container is too small to fit them', () => {
    const initialTopPanelHeight = 500;
    const minTopPanelHeight = 100;
    const minMainPanelHeight = 150;
    const component = mountComponent({
      initialTopPanelHeight,
      minTopPanelHeight,
      minMainPanelHeight,
    });
    expectCorrectPanelSizes(component, containerHeight, initialTopPanelHeight);
    const newContainerHeight = 200;
    jest.spyOn(eui, 'useResizeObserver').mockReturnValue({ height: newContainerHeight, width: 0 });
    forceRender(component);
    expect(
      component.find('[data-test-subj="unifiedHistogramResizablePanelTop"]').at(0).prop('size')
    ).toBe((minTopPanelHeight / newContainerHeight) * 100);
    expect(
      component.find('[data-test-subj="unifiedHistogramResizablePanelMain"]').at(0).prop('size')
    ).toBe((minMainPanelHeight / newContainerHeight) * 100);
    jest.spyOn(eui, 'useResizeObserver').mockReturnValue({ height: containerHeight, width: 0 });
    forceRender(component);
    expectCorrectPanelSizes(component, containerHeight, initialTopPanelHeight);
  });

  it('should blur the resize button after a resize', async () => {
    const attachTo = document.createElement('div');
    document.body.appendChild(attachTo);
    const component = mountComponent({ attachTo });
    const getContainer = () =>
      component.find('[data-test-subj="unifiedHistogramResizableContainer"]').at(0);
    const resizeButton = component.find('button[data-test-subj="unifiedHistogramResizableButton"]');
    act(() => {
      const onResizeStart = getContainer().prop('onResizeStart') as Function;
      onResizeStart('pointer');
    });
    (resizeButton.getDOMNode() as HTMLElement).focus();
    forceRender(component);
    act(() => {
      const onResizeEnd = getContainer().prop('onResizeEnd') as Function;
      onResizeEnd();
    });
    expect(resizeButton.getDOMNode()).toHaveFocus();
    await waitFor(() => {
      expect(resizeButton.getDOMNode()).not.toHaveFocus();
    });
  });
});
