/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridCustomBodyProps } from '@elastic/eui';
import React, {
  useContext,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  createContext,
  useCallback,
  useEffect,
} from 'react';
import { InPortal, OutPortal, type HtmlPortalNode } from 'react-reverse-portal';
import { useEuiTheme } from '@elastic/eui';
import {
  type DataCascadeRowCellProps,
  useConnectedChildVirtualizer,
} from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord } from '@kbn/discover-utils';
import { createPortal } from 'react-dom';
import type { ESQLDataGroupNode } from './types';
import {
  getCustomCascadeGridBodyStyle,
  cascadeToolbarPortalNodeTestSubjAttribute,
} from './cascade_leaf_custom_grid_body.styles';

export { cascadeToolbarPortalNodeTestSubjAttribute };

export interface CascadeGridBodyContextValue
  extends Pick<
    Parameters<DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>['children']>[0],
    'virtualizerController' | 'stickyHeaderExtensionPoint'
  > {
  data: DataTableRecord[];
  isFullScreenMode?: boolean;
  cellId: string;
  rowIndex: number;
  /**
   * Reverse portal node that the data grid toolbar is rendered into. The grid body outputs it
   * alongside the column headers in the cascade row's persistent header host.
   */
  toolbarPortalNode: HtmlPortalNode;
  /**
   * Reverse portal node for the grid header row, so that relocating it into the cascade sticky header
   * reparents its DOM without remounting the EUI header cells.
   */
  headerPortalNode: HtmlPortalNode;
  /**
   * When set, the toolbar and header row are portaled into this element (the cascade row's
   * sticky header extension point) instead of being rendered in place.
   */
  stickyHeaderPortalTarget: HTMLDivElement | null;
  /**
   * The key used to measure the grid body's size and position.
   */
  measurementKey: string;
  /**
   * Set by the custom virtualized body to the function that scrolls one of its rows into view, so that the
   * owning leaf cell can e.g. bring the active in-table search match into view.
   */
  scrollToRowRef: React.MutableRefObject<((rowIndex: number) => void) | null>;
}

export const CascadeGridBodyContext = createContext<CascadeGridBodyContextValue | null>(null);

/**
 * The height EUI renders the rows of a freshly mounted grid at, until it has measured the configured one.
 */
const EUI_DEFAULT_ROW_HEIGHT = 34;

/**
 * How long a grid is given to report a height other than {@link EUI_DEFAULT_ROW_HEIGHT}, before that height is
 * accepted as the one its rows settled on.
 */
export const ROW_HEIGHT_WARM_UP_TIMEOUT_MS = 1000;

/**
 * The row height the grids settled on most recently, `undefined` when their rows size themselves to their content.
 * A grid mounts again every time its cascade row scrolls back into the list, so the next mount starts from this
 * height instead of from the one EUI warms up with.
 */
let lastSettledRowHeight: number | undefined = 65;

/**
 * Keeps the rows of a freshly mounted grid at the height they last settled on while EUI is still warming up.
 *
 * EUI renders rows with a line count height at {@link EUI_DEFAULT_ROW_HEIGHT} and corrects them once a cell has
 * been measured. The height of the grid, and with it of the cascade row it is in, would follow that correction:
 * the virtualizers would resize the list twice and move the scroll position to make up for it, which shows as a
 * jump when a previously expanded cascade row scrolls back in.
 */
export const useRowHeightWarmUp = () => {
  // only read when the grid mounts, which is also when its rows are not measured yet
  const [initialRowHeight] = useState(() => lastSettledRowHeight);
  const [minRowHeight, setMinRowHeight] = useState(initialRowHeight);
  const hasSettledRef = useRef(false);
  const warmUpTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const settle = useCallback((height: number | undefined) => {
    clearTimeout(warmUpTimeoutRef.current);
    hasSettledRef.current = true;
    lastSettledRowHeight = height;
    setMinRowHeight(undefined);
  }, []);

  /**
   * Takes the height EUI currently gives the rows, `undefined` when it leaves them to size themselves.
   */
  const reportRowHeight = useCallback(
    (height: number | undefined) => {
      if (hasSettledRef.current) {
        // kept up to date for the grids that mount next, e.g. after the density changed
        lastSettledRowHeight = height;
      } else if (height === EUI_DEFAULT_ROW_HEIGHT && initialRowHeight !== height) {
        // still warming up, unless the rows really are this height, which is assumed when nothing else is reported
        warmUpTimeoutRef.current ??= setTimeout(
          () => settle(height),
          ROW_HEIGHT_WARM_UP_TIMEOUT_MS
        );
      } else {
        settle(height);
      }
    },
    [initialRowHeight, settle]
  );

  useEffect(() => () => clearTimeout(warmUpTimeoutRef.current), []);

  return {
    /** The row height to estimate with, when one is known. */
    estimatedRowHeight: initialRowHeight,
    /** The minimum height to give the rows until the grid has settled. */
    minRowHeight,
    reportRowHeight,
  };
};

/**
 * This custom grid body is expected to be passed along to the `renderCustomGridBody` prop on the EUI grid component,
 * to enable rendering EUI Data Grid within the cascade leaf cell matching a typical discover table grid.
 * The provided connected child virtualizer from the cascade row cell is used to virtualize the grid body,
 * and connect this custom grid body to the cascade row cell.
 */
export function CustomCascadeGridBody({
  Cell,
  visibleColumns,
  visibleRowData,
  headerRow,
  footerRow,
  gridWidth,
}: EuiDataGridCustomBodyProps) {
  const context = useContext(CascadeGridBodyContext);
  if (!context) {
    throw new Error('CustomCascadeGridBody must be rendered within CascadeGridBodyContext');
  }

  const {
    isFullScreenMode,
    data,
    virtualizerController,
    cellId,
    rowIndex,
    toolbarPortalNode,
    headerPortalNode,
    stickyHeaderPortalTarget,
    stickyHeaderExtensionPoint: { stickyEnabled, rowElement, headerElementRef },
    measurementKey,
    scrollToRowRef,
  } = context;

  const visibleRows = useMemo(
    () => data.slice(visibleRowData.startRow, visibleRowData.endRow),
    [data, visibleRowData.startRow, visibleRowData.endRow]
  );

  const { euiTheme } = useEuiTheme();

  const customGridBodyScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const customCascadeGridBodyStyle = useMemo(
    () => getCustomCascadeGridBodyStyle(euiTheme),
    [euiTheme]
  );

  // Geometry the child virtualizer needs to place rows relative to the shared scroll element: where
  // the grid body starts within the cascade row, and how much of the viewport's top is covered by the
  // sticky header while it is displayed.
  const [scrollGeometry, setScrollGeometry] = useState({
    bodyOffsetWithinRow: 0,
    stickyHeaderHeight: 0,
  });

  useLayoutEffect(() => {
    const bodyElement = customGridBodyScrollContainerRef.current;
    const inlineHeader = headerElementRef.current;

    const measureGeometry = () => {
      const bodyOffsetWithinRow =
        bodyElement && rowElement
          ? bodyElement.getBoundingClientRect().top - rowElement.getBoundingClientRect().top
          : 0;
      // Inline headers retain their full height in flow, independently of their current scroll position.
      const stickyHeaderHeight = stickyEnabled
        ? inlineHeader?.getBoundingClientRect().height ?? 0
        : 0;

      setScrollGeometry((previous) =>
        previous.bodyOffsetWithinRow === bodyOffsetWithinRow &&
        previous.stickyHeaderHeight === stickyHeaderHeight
          ? previous
          : { bodyOffsetWithinRow, stickyHeaderHeight }
      );
    };

    measureGeometry();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measureGeometry);
      if (inlineHeader) observer.observe(inlineHeader);
      if (rowElement) observer.observe(rowElement);
      if (bodyElement) observer.observe(bodyElement);
      return () => observer.disconnect();
    }
  }, [rowElement, headerElementRef, stickyHeaderPortalTarget, stickyEnabled, isFullScreenMode]);

  const layoutMeasurementKey = useMemo(
    () =>
      JSON.stringify([
        measurementKey,
        gridWidth,
        visibleColumns.map(({ id, initialWidth }) => [id, initialWidth]),
      ]),
    [measurementKey, gridWidth, visibleColumns]
  );

  const { estimatedRowHeight, minRowHeight, reportRowHeight } = useRowHeightWarmUp();

  const { virtualizer, handle, isDetached } = useConnectedChildVirtualizer({
    controller: virtualizerController,
    cellId,
    rowIndex,
    rows: visibleRows,
    estimatedRowHeight,
    measurementKey: layoutMeasurementKey,
    overscan: 10,
    scrollMarginOffset: scrollGeometry.bodyOffsetWithinRow,
    scrollPaddingStart: scrollGeometry.stickyHeaderHeight,
    privateScrollElement: customGridBodyScrollContainerRef,
  });

  useLayoutEffect(() => {
    if (isFullScreenMode && !isDetached) {
      handle.detachScrollElement();
    } else if (!isFullScreenMode && isDetached) {
      handle.reattachScrollElement();
    }
  }, [isFullScreenMode, isDetached, handle]);

  useLayoutEffect(() => {
    // 'auto' leaves rows that are already visible (between the sticky header and the bottom edge)
    // where they are, places rows above the viewport just below the sticky header, and rows below
    // it at the bottom edge, accounting for the inline header's pinned height
    scrollToRowRef.current = (targetRowIndex) =>
      virtualizer.scrollToIndex(targetRowIndex, { align: 'auto', behavior: 'auto' });

    return () => {
      scrollToRowRef.current = null;
    };
  }, [scrollToRowRef, virtualizer]);

  const items = virtualizer.getVirtualItems();
  const hasRenderedRows = items.length > 0;

  useLayoutEffect(() => {
    // EUI hands over a new `Cell` every time the height it gives the rows changes, the cell carries that height
    // itself, so it is not affected by the minimum height the rows are held at.
    const cell = hasRenderedRows
      ? customGridBodyScrollContainerRef.current?.querySelector<HTMLElement>('.euiDataGridRow > *')
      : null;

    if (cell?.style.height === 'auto') {
      reportRowHeight(undefined);
    } else if (cell?.offsetHeight) {
      reportRowHeight(cell.offsetHeight);
    }
  }, [Cell, hasRenderedRows, reportRowHeight]);

  const scrollMargin = isDetached ? 0 : virtualizer.measurementsCache[0]?.start ?? 0;
  const listOffset = items.length > 0 ? items[0].start - scrollMargin : 0;

  const headerViewport = (
    <div
      data-test-subj="discoverCascadeCustomDataPortalledGridHeaderContainer"
      css={customCascadeGridBodyStyle.headerViewport}
    >
      <OutPortal node={headerPortalNode} />
    </div>
  );

  return (
    <div
      data-test-subj="discoverCascadeCustomDataGridBody"
      role="rowgroup"
      css={customCascadeGridBodyStyle.wrapper}
    >
      <InPortal node={headerPortalNode}>{headerRow}</InPortal>
      {stickyHeaderPortalTarget
        ? createPortal(
            <>
              <OutPortal node={toolbarPortalNode} />
              {headerViewport}
            </>,
            stickyHeaderPortalTarget
          )
        : headerViewport}
      <div
        ref={customGridBodyScrollContainerRef}
        data-test-subj="discoverCascadeGridScrollContainer"
        css={customCascadeGridBodyStyle.virtualizerContainer}
      >
        <div style={{ height: virtualizer.getTotalSize() }}>
          <div css={customCascadeGridBodyStyle.virtualizerInner} style={{ top: listOffset }}>
            {items.map((virtualRow) => (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                role="row"
                className="euiDataGridRow"
                css={customCascadeGridBodyStyle.row}
                style={minRowHeight ? { minHeight: minRowHeight } : undefined}
              >
                {visibleColumns.map((column, colIndex) => (
                  <Cell
                    key={`${virtualRow.index}-${colIndex}`}
                    colIndex={colIndex}
                    rowIndex={virtualRow.index}
                    visibleRowIndex={virtualRow.index}
                    columnId={column.id}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {footerRow}
    </div>
  );
}
