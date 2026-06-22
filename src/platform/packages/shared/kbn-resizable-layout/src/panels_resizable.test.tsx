/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { PanelsResizable } from './panels_resizable';
import { ResizableLayoutDirection } from '../types';
import { ResizableLayoutOrder } from '../types';

const containerHeight = 1000;

const containerWidth = 500;

const fixedPanelId = 'fixedPanel';

interface ResizableContainerCallbacks {
  direction?: ResizableLayoutDirection;
  onPanelWidthChange?: (sizes: Record<string, number>) => void;
  onResizeEnd?: () => void;
  onResizeStart?: (trigger: string) => void;
}

let resizableContainerCallbacks: ResizableContainerCallbacks = {};

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const ActualEuiResizableContainer = actual.EuiResizableContainer;

  return {
    ...actual,
    useGeneratedHtmlId: jest.fn(() => fixedPanelId),
    EuiResizableContainer: (props: React.ComponentProps<typeof ActualEuiResizableContainer>) => {
      resizableContainerCallbacks = {
        direction: props.direction,
        onPanelWidthChange: props.onPanelWidthChange,
        onResizeEnd: props.onResizeEnd,
        onResizeStart: props.onResizeStart,
      };

      return <ActualEuiResizableContainer {...props} />;
    },
  };
});

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
  const getPanelSizePct = (testSubj: string, direction: ResizableLayoutDirection) => {
    const panelWrapper = screen.getByTestId(testSubj).closest('.euiResizablePanel');

    if (!panelWrapper) throw new Error(`Could not find resizable panel wrapper for ${testSubj}`);

    const { style } = panelWrapper as HTMLElement;

    const sizeValue =
      direction === ResizableLayoutDirection.Horizontal
        ? style.inlineSize || style.width
        : style.blockSize || style.height;

    return parseFloat(sizeValue);
  };

  const expectCorrectPanelSizes = (
    direction: ResizableLayoutDirection,
    currentContainerSize: number,
    fixedPanelSize: number
  ) => {
    const fixedPanelSizePct = (fixedPanelSize / currentContainerSize) * 100;

    expect(getPanelSizePct('resizableLayoutResizablePanelFixed', direction)).toBe(
      fixedPanelSizePct
    );
    expect(getPanelSizePct('resizableLayoutResizablePanelFlex', direction)).toBe(
      100 - fixedPanelSizePct
    );
  };

  const renderPanelsResizable = (
    props: React.ComponentProps<typeof PanelsResizable>,
    options?: { container?: HTMLElement }
  ) =>
    render(
      <PanelsResizable {...props} />,
      options?.container ? { container: options.container } : undefined
    );

  const renderComponent = ({
    className = '',
    container,
    direction = ResizableLayoutDirection.Vertical,
    fixedPanel = <div>Fixed panel</div>,
    fixedPanelOrder,
    flexPanel = <div>Flex panel</div>,
    initialFixedPanelSize = 0,
    minFixedPanelSize = 0,
    minFlexPanelSize = 0,
    onFixedPanelSizeChange = jest.fn(),
  }: {
    className?: string;
    container?: HTMLElement;
    direction?: ResizableLayoutDirection;
    fixedPanel?: ReactElement;
    fixedPanelOrder?: ResizableLayoutOrder;
    flexPanel?: ReactElement;
    initialFixedPanelSize?: number | 'max-content';
    minFixedPanelSize?: number;
    minFlexPanelSize?: number;
    onFixedPanelSizeChange?: (fixedPanelSize: number) => void;
  } = {}) => {
    return renderPanelsResizable(
      {
        className,
        direction,
        fixedPanel,
        fixedPanelOrder,
        fixedPanelSize: initialFixedPanelSize,
        flexPanel,
        minFixedPanelSize,
        minFlexPanelSize,
        onFixedPanelSizeChange,
      },
      { container }
    );
  };

  const expectPanelOrder = (firstPanelText: string, secondPanelText: string) => {
    const firstPanel = screen.getByText(firstPanelText);
    const secondPanel = screen.getByText(secondPanelText);

    expect(firstPanel.compareDocumentPosition(secondPanel)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  };

  beforeEach(() => {
    resizableContainerCallbacks = {};

    resizeObserverCallback = jest.fn();

    window.HTMLElement.prototype.getBoundingClientRect = jest.fn(() => {
      return {
        height: containerHeight,
        width: containerWidth,
      } as DOMRect;
    });
  });

  it('should render both panels', () => {
    renderComponent();

    expect(screen.getByText('Fixed panel')).toBeVisible();
    expect(screen.getByText('Flex panel')).toBeVisible();
  });

  it('should set the initial sizes of both panels', () => {
    const initialFixedPanelSize = 200;

    renderComponent({ initialFixedPanelSize });

    expectCorrectPanelSizes(
      ResizableLayoutDirection.Vertical,
      containerHeight,
      initialFixedPanelSize
    );
  });

  it('should set the correct sizes of both panels when the panels are resized', () => {
    const initialFixedPanelSize = 200;
    let fixedPanelSize: number | 'max-content' = initialFixedPanelSize;
    const onFixedPanelSizeChange = jest.fn();

    let rerenderPanels: ReturnType<typeof renderPanelsResizable>['rerender'] = () => undefined;

    const handleFixedPanelSizeChange = (size: number) => {
      onFixedPanelSizeChange(size);
      fixedPanelSize = size;
      rerenderPanels(
        <PanelsResizable
          direction={ResizableLayoutDirection.Vertical}
          fixedPanel={<></>}
          fixedPanelSize={fixedPanelSize}
          flexPanel={<></>}
          minFixedPanelSize={0}
          minFlexPanelSize={0}
          onFixedPanelSizeChange={handleFixedPanelSizeChange}
        />
      );
    };

    ({ rerender: rerenderPanels } = renderPanelsResizable({
      direction: ResizableLayoutDirection.Vertical,
      fixedPanel: <></>,
      fixedPanelSize,
      flexPanel: <></>,
      minFixedPanelSize: 0,
      minFlexPanelSize: 0,
      onFixedPanelSizeChange: handleFixedPanelSizeChange,
    }));

    expectCorrectPanelSizes(
      ResizableLayoutDirection.Vertical,
      containerHeight,
      initialFixedPanelSize
    );

    const newFixedPanelSizePct = 30;

    act(() => {
      resizableContainerCallbacks.onPanelWidthChange?.({ [fixedPanelId]: newFixedPanelSizePct });
    });

    const newFixedPanelSize = (newFixedPanelSizePct / 100) * containerHeight;

    expect(onFixedPanelSizeChange).toHaveBeenCalledWith(newFixedPanelSize);
    expectCorrectPanelSizes(ResizableLayoutDirection.Vertical, containerHeight, newFixedPanelSize);
  });

  it('should maintain the size of the fixed panel and resize the flex panel when the container size changes', () => {
    const initialFixedPanelSize = 200;

    renderComponent({ initialFixedPanelSize });

    expectCorrectPanelSizes(
      ResizableLayoutDirection.Vertical,
      containerHeight,
      initialFixedPanelSize
    );

    const newContainerSize = 2000;

    act(() => {
      resizeObserverCallback(newContainerSize, 0);
    });

    expectCorrectPanelSizes(
      ResizableLayoutDirection.Vertical,
      newContainerSize,
      initialFixedPanelSize
    );
  });

  it('should resize the fixed panel once the flex panel is at its minimum size', () => {
    const initialFixedPanelSize = 500;
    const minFixedPanelSize = 100;
    const minFlexPanelSize = 100;

    renderComponent({
      initialFixedPanelSize,
      minFixedPanelSize,
      minFlexPanelSize,
    });

    expectCorrectPanelSizes(
      ResizableLayoutDirection.Vertical,
      containerHeight,
      initialFixedPanelSize
    );

    const newContainerSize = 400;

    act(() => {
      resizeObserverCallback(newContainerSize, 0);
    });

    expectCorrectPanelSizes(
      ResizableLayoutDirection.Vertical,
      newContainerSize,
      newContainerSize - minFlexPanelSize
    );

    act(() => {
      resizeObserverCallback(containerHeight, 0);
    });

    expectCorrectPanelSizes(
      ResizableLayoutDirection.Vertical,
      containerHeight,
      initialFixedPanelSize
    );
  });

  it('should maintain the minimum sizes of both panels when the container is too small to fit them', () => {
    const initialFixedPanelSize = 500;
    const minFixedPanelSize = 100;
    const minFlexPanelSize = 150;

    renderComponent({
      initialFixedPanelSize,
      minFixedPanelSize,
      minFlexPanelSize,
    });

    expectCorrectPanelSizes(
      ResizableLayoutDirection.Vertical,
      containerHeight,
      initialFixedPanelSize
    );

    const newContainerSize = 200;

    act(() => {
      resizeObserverCallback(newContainerSize, 0);
    });

    expect(
      getPanelSizePct('resizableLayoutResizablePanelFixed', ResizableLayoutDirection.Vertical)
    ).toBe((minFixedPanelSize / newContainerSize) * 100);

    expect(
      getPanelSizePct('resizableLayoutResizablePanelFlex', ResizableLayoutDirection.Vertical)
    ).toBe((minFlexPanelSize / newContainerSize) * 100);

    act(() => {
      resizeObserverCallback(containerHeight, 0);
    });

    expectCorrectPanelSizes(
      ResizableLayoutDirection.Vertical,
      containerHeight,
      initialFixedPanelSize
    );
  });

  it('should blur the resize button after a resize', async () => {
    const attachTo = document.createElement('div');
    document.body.appendChild(attachTo);

    renderComponent({ container: attachTo });

    const resizeButton = screen.getByTestId('resizableLayoutResizableButton');

    act(() => {
      resizableContainerCallbacks.onResizeStart?.('pointer');
    });

    act(() => {
      resizeButton.focus();
    });

    act(() => {
      resizableContainerCallbacks.onResizeEnd?.();
    });

    expect(resizeButton).toHaveFocus();

    await waitFor(() => {
      expect(resizeButton).not.toHaveFocus();
    });

    document.body.removeChild(attachTo);
  });

  it('should pass direction "vertical" to EuiResizableContainer when direction is ResizableLayoutDirection.Vertical', () => {
    renderComponent({ direction: ResizableLayoutDirection.Vertical });

    expect(resizableContainerCallbacks.direction).toBe('vertical');
  });

  it('should pass direction "horizontal" to EuiResizableContainer when direction is ResizableLayoutDirection.Horizontal', () => {
    renderComponent({ direction: ResizableLayoutDirection.Horizontal });

    expect(resizableContainerCallbacks.direction).toBe('horizontal');
  });

  it('should use containerHeight when direction is ResizableLayoutDirection.Vertical', () => {
    const initialFixedPanelSize = 200;

    renderComponent({
      direction: ResizableLayoutDirection.Vertical,
      initialFixedPanelSize,
    });

    expectCorrectPanelSizes(
      ResizableLayoutDirection.Vertical,
      containerHeight,
      initialFixedPanelSize
    );
  });

  it('should use containerWidth when direction is ResizableLayoutDirection.Horizontal', () => {
    const initialFixedPanelSize = 200;

    renderComponent({
      direction: ResizableLayoutDirection.Horizontal,
      initialFixedPanelSize,
    });

    expectCorrectPanelSizes(
      ResizableLayoutDirection.Horizontal,
      containerWidth,
      initialFixedPanelSize
    );
  });

  it('should set the initial fixed panel size to max-content', () => {
    const minFlexPanelSize = 200;

    renderComponent({
      minFlexPanelSize,
      initialFixedPanelSize: 'max-content',
    });

    const flexPanelSizePct = (minFlexPanelSize / containerHeight) * 100;

    expect(
      getPanelSizePct('resizableLayoutResizablePanelFixed', ResizableLayoutDirection.Vertical)
    ).toBe(100 - flexPanelSizePct);

    expect(
      getPanelSizePct('resizableLayoutResizablePanelFlex', ResizableLayoutDirection.Vertical)
    ).toBe(flexPanelSizePct);
  });

  it('should render the panels in the correct order when no fixedPanelOrder is set', () => {
    renderComponent();

    expectPanelOrder('Fixed panel', 'Flex panel');
  });

  it('should render the panels in the correct order when fixedPanelOrder is start', () => {
    renderComponent({ fixedPanelOrder: ResizableLayoutOrder.Start });

    expectPanelOrder('Fixed panel', 'Flex panel');
  });

  it('should render the panels in the correct order when fixedPanelOrder is end', () => {
    renderComponent({ fixedPanelOrder: ResizableLayoutOrder.End });

    expectPanelOrder('Flex panel', 'Fixed panel');
  });
});
