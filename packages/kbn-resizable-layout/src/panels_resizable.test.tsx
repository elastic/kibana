/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import { ReactElement, useState } from 'react';
import React from 'react';
import { PanelsResizable } from './panels_resizable';
import { act } from 'react-dom/test-utils';

const containerHeight = 1000;
const containerWidth = 500;
const fixedPanelId = 'fixedPanel';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useResizeObserver: jest.fn(),
  useGeneratedHtmlId: jest.fn(() => fixedPanelId),
}));

import * as eui from '@elastic/eui';
import { waitFor } from '@testing-library/react';
import { ResizableLayoutDirection } from '../types';

describe('Panels resizable', () => {
  const mountComponent = ({
    className = '',
    direction = ResizableLayoutDirection.Vertical,
    container = null,
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
    container?: HTMLElement | null;
    initialFixedPanelSize?: number;
    minFixedPanelSize?: number;
    minFlexPanelSize?: number;
    fixedPanel?: ReactElement;
    flexPanel?: ReactElement;
    attachTo?: HTMLElement;
    onFixedPanelSizeChange?: (fixedPanelSize: number) => void;
  }) => {
    const PanelsWrapper = ({ fixedPanelSize }: { fixedPanelSize?: number }) => {
      const [panelSizes, setPanelSizes] = useState({
        fixedPanelSizePct: 50,
        flexPanelSizePct: 50,
      });

      return (
        <PanelsResizable
          className={className}
          direction={direction}
          container={container}
          fixedPanelSize={fixedPanelSize ?? initialFixedPanelSize}
          minFixedPanelSize={minFixedPanelSize}
          minFlexPanelSize={minFlexPanelSize}
          panelSizes={panelSizes}
          fixedPanel={fixedPanel}
          flexPanel={flexPanel}
          onFixedPanelSizeChange={onFixedPanelSizeChange}
          setPanelSizes={setPanelSizes}
        />
      );
    };

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
    jest
      .spyOn(eui, 'useResizeObserver')
      .mockReturnValue({ height: containerHeight, width: containerWidth });
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
    jest.spyOn(eui, 'useResizeObserver').mockReturnValue({ height: newContainerSize, width: 0 });
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
    jest.spyOn(eui, 'useResizeObserver').mockReturnValue({ height: newContainerSize, width: 0 });
    forceRender(component);
    expectCorrectPanelSizes(component, newContainerSize, newContainerSize - minFlexPanelSize);
    jest.spyOn(eui, 'useResizeObserver').mockReturnValue({ height: containerHeight, width: 0 });
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
    jest.spyOn(eui, 'useResizeObserver').mockReturnValue({ height: newContainerSize, width: 0 });
    forceRender(component);
    expect(
      component.find('[data-test-subj="resizableLayoutResizablePanelFixed"]').at(0).prop('size')
    ).toBe((minFixedPanelSize / newContainerSize) * 100);
    expect(
      component.find('[data-test-subj="resizableLayoutResizablePanelFlex"]').at(0).prop('size')
    ).toBe((minFlexPanelSize / newContainerSize) * 100);
    jest.spyOn(eui, 'useResizeObserver').mockReturnValue({ height: containerHeight, width: 0 });
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
