/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ReactWrapper, mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { waitFor } from '@testing-library/react';
import React, { ReactElement } from 'react';
import { PanelsResizable } from './panels_resizable';
import { ResizableLayoutDirection } from '../types';

const containerHeight = 1000;
const containerWidth = 500;
const fixedPanelId = 'fixedPanel';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useGeneratedHtmlId: jest.fn(() => fixedPanelId),
}));

let resizeObserverCallback: (height: number, width: number) => void = jest.fn();

window.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = jest.fn((height, width) => {
      const entries = [
        { borderBoxSize: [{ inlineSize: width, blockSize: height }] },
      ] as unknown as ResizeObserverEntry[];
      act(() => callback(entries, this));
    });
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Panels resizable', () => {
  const mountComponent = ({
    className = '',
    direction = ResizableLayoutDirection.Vertical,
    initialFixedPanelSize = 0,
    minFixedPanelSize = 0,
    minFlexPanelSize = 0,
    fixedPanel = <></>,
    flexPanel = <></>,
    attachTo,
    onFixedPanelSizeChange = jest.fn(),
  }: {
    className?: string;
    direction?: ResizableLayoutDirection;
    initialFixedPanelSize?: number;
    minFixedPanelSize?: number;
    minFlexPanelSize?: number;
    fixedPanel?: ReactElement;
    flexPanel?: ReactElement;
    attachTo?: HTMLElement;
    onFixedPanelSizeChange?: (fixedPanelSize: number) => void;
  }) => {
    const PanelsWrapper = ({ fixedPanelSize }: { fixedPanelSize?: number }) => (
      <PanelsResizable
        className={className}
        direction={direction}
        fixedPanelSize={fixedPanelSize ?? initialFixedPanelSize}
        minFixedPanelSize={minFixedPanelSize}
        minFlexPanelSize={minFlexPanelSize}
        fixedPanel={fixedPanel}
        flexPanel={flexPanel}
        onFixedPanelSizeChange={onFixedPanelSizeChange}
      />
    );

    return mount(<PanelsWrapper />, attachTo ? { attachTo } : undefined);
  };

  const expectCorrectPanelSizes = (
    component: ReactWrapper,
    currentContainerSize: number,
    fixedPanelSize: number
  ) => {
    const fixedPanelSizePct = (fixedPanelSize / currentContainerSize) * 100;
    expect(
      component.find('[data-test-subj="resizableLayoutResizablePanelFixed"]').at(0).prop('size')
    ).toBe(fixedPanelSizePct);
    expect(
      component.find('[data-test-subj="resizableLayoutResizablePanelFlex"]').at(0).prop('size')
    ).toBe(100 - fixedPanelSizePct);
  };

  const forceRender = (component: ReactWrapper) => {
    component.setProps({}).update();
  };

  beforeEach(() => {
    resizeObserverCallback = jest.fn();
    window.HTMLElement.prototype.getBoundingClientRect = jest.fn(() => {
      return {
        height: containerHeight,
        width: containerWidth,
      } as DOMRect;
    });
  });

  it('should render both panels', () => {
    const fixedPanel = <div data-test-subj="fixedPanel" />;
    const flexPanel = <div data-test-subj="flexPanel" />;
    const component = mountComponent({ fixedPanel, flexPanel });
    expect(component.contains(fixedPanel)).toBe(true);
    expect(component.contains(flexPanel)).toBe(true);
  });

  it('should set the initial sizes of both panels', () => {
    const initialFixedPanelSize = 200;
    const component = mountComponent({ initialFixedPanelSize });
    expectCorrectPanelSizes(component, containerHeight, initialFixedPanelSize);
  });

  it('should set the correct sizes of both panels when the panels are resized', () => {
    const initialFixedPanelSize = 200;
    const onFixedPanelSizeChange = jest.fn((fixedPanelSize) => {
      component.setProps({ fixedPanelSize }).update();
    });
    const component = mountComponent({ initialFixedPanelSize, onFixedPanelSizeChange });
    expectCorrectPanelSizes(component, containerHeight, initialFixedPanelSize);
    const newFixedPanelSizePct = 30;
    const onPanelSizeChange = component
      .find('[data-test-subj="resizableLayoutResizableContainer"]')
      .at(0)
      .prop('onPanelWidthChange') as Function;
    act(() => {
      onPanelSizeChange({ [fixedPanelId]: newFixedPanelSizePct });
    });
    forceRender(component);
    const newFixedPanelSize = (newFixedPanelSizePct / 100) * containerHeight;
    expect(onFixedPanelSizeChange).toHaveBeenCalledWith(newFixedPanelSize);
    expectCorrectPanelSizes(component, containerHeight, newFixedPanelSize);
  });

  it('should maintain the size of the fixed panel and resize the flex panel when the container size changes', () => {
    const initialFixedPanelSize = 200;
    const component = mountComponent({ initialFixedPanelSize });
    expectCorrectPanelSizes(component, containerHeight, initialFixedPanelSize);
    const newContainerSize = 2000;
    resizeObserverCallback(newContainerSize, 0);
    forceRender(component);
    expectCorrectPanelSizes(component, newContainerSize, initialFixedPanelSize);
  });

  it('should resize the fixed panel once the flex panel is at its minimum size', () => {
    const initialFixedPanelSize = 500;
    const minFixedPanelSize = 100;
    const minFlexPanelSize = 100;
    const component = mountComponent({
      initialFixedPanelSize,
      minFixedPanelSize,
      minFlexPanelSize,
    });
    expectCorrectPanelSizes(component, containerHeight, initialFixedPanelSize);
    const newContainerSize = 400;
    resizeObserverCallback(newContainerSize, 0);
    forceRender(component);
    expectCorrectPanelSizes(component, newContainerSize, newContainerSize - minFlexPanelSize);
    resizeObserverCallback(containerHeight, 0);
    forceRender(component);
    expectCorrectPanelSizes(component, containerHeight, initialFixedPanelSize);
  });

  it('should maintain the minimum sizes of both panels when the container is too small to fit them', () => {
    const initialFixedPanelSize = 500;
    const minFixedPanelSize = 100;
    const minFlexPanelSize = 150;
    const component = mountComponent({
      initialFixedPanelSize,
      minFixedPanelSize,
      minFlexPanelSize,
    });
    expectCorrectPanelSizes(component, containerHeight, initialFixedPanelSize);
    const newContainerSize = 200;
    resizeObserverCallback(newContainerSize, 0);
    forceRender(component);
    expect(
      component.find('[data-test-subj="resizableLayoutResizablePanelFixed"]').at(0).prop('size')
    ).toBe((minFixedPanelSize / newContainerSize) * 100);
    expect(
      component.find('[data-test-subj="resizableLayoutResizablePanelFlex"]').at(0).prop('size')
    ).toBe((minFlexPanelSize / newContainerSize) * 100);
    resizeObserverCallback(containerHeight, 0);
    forceRender(component);
    expectCorrectPanelSizes(component, containerHeight, initialFixedPanelSize);
  });

  it('should blur the resize button after a resize', async () => {
    const attachTo = document.createElement('div');
    document.body.appendChild(attachTo);
    const component = mountComponent({ attachTo });
    const getContainer = () =>
      component.find('[data-test-subj="resizableLayoutResizableContainer"]').at(0);
    const resizeButton = component.find('button[data-test-subj="resizableLayoutResizableButton"]');
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

  it('should pass direction "vertical" to EuiResizableContainer when direction is ResizableLayoutDirection.Vertical', () => {
    const component = mountComponent({ direction: ResizableLayoutDirection.Vertical });
    expect(
      component.find('[data-test-subj="resizableLayoutResizableContainer"]').at(0).prop('direction')
    ).toBe('vertical');
  });

  it('should pass direction "horizontal" to EuiResizableContainer when direction is ResizableLayoutDirection.Horizontal', () => {
    const component = mountComponent({ direction: ResizableLayoutDirection.Horizontal });
    expect(
      component.find('[data-test-subj="resizableLayoutResizableContainer"]').at(0).prop('direction')
    ).toBe('horizontal');
  });

  it('should use containerHeight when direction is ResizableLayoutDirection.Vertical', () => {
    const initialFixedPanelSize = 200;
    const component = mountComponent({
      direction: ResizableLayoutDirection.Vertical,
      initialFixedPanelSize,
    });
    expectCorrectPanelSizes(component, containerHeight, initialFixedPanelSize);
  });

  it('should use containerWidth when direction is ResizableLayoutDirection.Horizontal', () => {
    const initialFixedPanelSize = 200;
    const component = mountComponent({
      direction: ResizableLayoutDirection.Horizontal,
      initialFixedPanelSize,
    });
    expectCorrectPanelSizes(component, containerWidth, initialFixedPanelSize);
  });
});
