/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';
import { act, renderHook } from '@testing-library/react';
import type { EuiDataGridRefProps } from '@elastic/eui';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { VIRTUALIZED_SELECTOR } from '../constants';
import {
  useScrollToExpandedDoc,
  type UseScrollToExpandedDocProps,
} from './use_scroll_to_expanded_doc';

const rows = [
  buildDataTableRecord({ _id: 'one', _index: 'index' }, dataViewMock),
  buildDataTableRecord({ _id: 'two', _index: 'index' }, dataViewMock),
];

let resizeObserverCallback: ResizeObserverCallback;
const observe = jest.fn();
const disconnect = jest.fn();

class TestResizeObserver implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback;
  }

  public observe = observe;
  public unobserve = jest.fn();
  public disconnect = disconnect;
}

describe('useScrollToExpandedDoc', () => {
  const animationFrames: FrameRequestCallback[] = [];
  const originalResizeObserver = window.ResizeObserver;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    animationFrames.length = 0;
    window.ResizeObserver = TestResizeObserver;
    window.requestAnimationFrame = (callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    };
    window.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    window.ResizeObserver = originalResizeObserver;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  const runNextFrame = () => {
    const callback = animationFrames.shift();
    if (!callback) {
      throw new Error('Expected a queued animation frame');
    }
    act(() => callback(0));
  };

  const getProps = ({
    dataGridRef,
    dataGridWrapper,
  }: {
    dataGridRef: RefObject<EuiDataGridRefProps>;
    dataGridWrapper: HTMLElement;
  }): UseScrollToExpandedDocProps => ({
    expandedDoc: rows[1],
    displayedRows: rows,
    paginationMode: 'singlePage',
    isPaginationEnabled: false,
    pageIndex: 0,
    pageSize: 10,
    onChangePageIndex: jest.fn(),
    dataGridRef,
    dataGridWrapper,
  });

  it('retries until the grid is ready and keeps the row centered while it settles', () => {
    const gridApi: EuiDataGridRefProps = {
      setIsFullScreen: jest.fn(),
      setFocusedCell: jest.fn(),
      openCellPopover: jest.fn(),
      closeCellPopover: jest.fn(),
    };
    const dataGridRef: RefObject<EuiDataGridRefProps> = { current: gridApi };
    const dataGridWrapper = document.createElement('div');
    const scrollContainer = document.createElement('div');
    scrollContainer.className = VIRTUALIZED_SELECTOR.slice(1);
    dataGridWrapper.appendChild(scrollContainer);
    const props = getProps({ dataGridRef, dataGridWrapper });
    const { rerender, unmount } = renderHook(({ hookProps }) => useScrollToExpandedDoc(hookProps), {
      initialProps: { hookProps: props },
    });

    runNextFrame();
    const scrollToItem = jest.fn();
    gridApi.scrollToItem = scrollToItem;
    runNextFrame();

    expect(scrollToItem).toHaveBeenCalledWith({ rowIndex: 1, align: 'center' });
    expect(observe).toHaveBeenCalledWith(scrollContainer);

    act(() => resizeObserverCallback([], new TestResizeObserver(jest.fn())));
    runNextFrame();
    expect(scrollToItem).toHaveBeenCalledTimes(2);

    act(() => jest.advanceTimersByTime(500));
    expect(disconnect).toHaveBeenCalled();

    rerender({ hookProps: { ...props, displayedRows: [...rows] } });
    expect(animationFrames).toHaveLength(0);

    unmount();
  });

  it('stops retrying when the document is removed', () => {
    const dataGridRef: RefObject<EuiDataGridRefProps> = {
      current: {
        setIsFullScreen: jest.fn(),
        setFocusedCell: jest.fn(),
        openCellPopover: jest.fn(),
        closeCellPopover: jest.fn(),
      },
    };
    const dataGridWrapper = document.createElement('div');
    const props = getProps({ dataGridRef, dataGridWrapper });
    const { rerender } = renderHook(({ hookProps }) => useScrollToExpandedDoc(hookProps), {
      initialProps: { hookProps: props },
    });

    runNextFrame();
    expect(animationFrames).toHaveLength(1);

    rerender({ hookProps: { ...props, expandedDoc: undefined } });
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('scrolls again when the same document is closed and reopened', () => {
    const scrollToItem = jest.fn();
    const dataGridRef: RefObject<EuiDataGridRefProps> = {
      current: {
        setIsFullScreen: jest.fn(),
        setFocusedCell: jest.fn(),
        openCellPopover: jest.fn(),
        closeCellPopover: jest.fn(),
        scrollToItem,
      },
    };
    const dataGridWrapper = document.createElement('div');
    const props = getProps({ dataGridRef, dataGridWrapper });
    const { rerender } = renderHook(({ hookProps }) => useScrollToExpandedDoc(hookProps), {
      initialProps: { hookProps: props },
    });

    runNextFrame();
    expect(scrollToItem).toHaveBeenCalledTimes(1);

    rerender({ hookProps: { ...props, expandedDoc: undefined } });
    rerender({ hookProps: props });
    runNextFrame();

    expect(scrollToItem).toHaveBeenCalledTimes(2);
  });

  it('stops retrying when the grid remains unavailable', () => {
    const dataGridRef: RefObject<EuiDataGridRefProps> = {
      current: {
        setIsFullScreen: jest.fn(),
        setFocusedCell: jest.fn(),
        openCellPopover: jest.fn(),
        closeCellPopover: jest.fn(),
      },
    };
    const dataGridWrapper = document.createElement('div');
    const props = getProps({ dataGridRef, dataGridWrapper });
    renderHook(() => useScrollToExpandedDoc(props));

    let attempts = 0;
    while (animationFrames.length > 0) {
      runNextFrame();
      attempts += 1;
    }

    expect(attempts).toBe(60);
  });
});
