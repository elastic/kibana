/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlexPanelData } from '../../panel';
import type { FlexLayoutStateManager } from '../../types';
import { getPanelKeysInOrder } from '../../utils/panel_order';

interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface FlowPanel {
  id: string;
  /** the width the panel is rendered at, ignoring any growth */
  width: number;
  grow: boolean;
}

/**
 * Simulates how the flex container wraps the panels, minus the one being dragged. Unlike live DOM rects,
 * the result doesn't shift with the drag placeholder. Returns `undefined` if the layout can't be measured.
 */
export const getFlowRects = ({
  gridLayout$,
  gridSettings$,
  activePanelEvent$,
  layoutRef,
}: Pick<
  FlexLayoutStateManager,
  'gridLayout$' | 'gridSettings$' | 'activePanelEvent$' | 'layoutRef'
>): Record<string, Rect> | undefined => {
  const layout = gridLayout$.value;
  const gridSettings = gridSettings$.value;
  const container = layoutRef.current?.getBoundingClientRect();
  if (!gridSettings || !container) return;

  const { gutterSize, rowHeight } = gridSettings;
  const usableRowWidth = container.width - gutterSize * 2;
  const activePanel = activePanelEvent$.value;

  const panels: FlowPanel[] = getPanelKeysInOrder(layout)
    .filter((id) => id !== activePanel?.id) // drop the active panel
    .map((id) => ({
      // get the base widths of each other panel
      id,
      width: getBaseWidth(layout[id], activePanel?.panelWidths?.[id], usableRowWidth),
      grow: layout[id].grow,
    }));

  // group the panels into rows
  const rows: FlowPanel[][] = [];
  panels.forEach((panel) => {
    const fittedPanel = { ...panel, width: Math.min(panel.width, usableRowWidth) };
    const lastRow = rows[rows.length - 1];
    if (
      lastRow &&
      getActualRowWidth(lastRow, gutterSize) + gutterSize + fittedPanel.width <=
        usableRowWidth + 0.5
    ) {
      // if the panel fits into the last row, then add it
      lastRow.push(fittedPanel);
    } else {
      // otherwise, push the panel to a new row
      rows.push([fittedPanel]);
    }
  });

  // lay the rows out top to bottom, sharing any leftover width between each row's growing panels
  const rects: Record<string, Rect> = {};
  rows.forEach((row, rowIndex) => {
    const top = container.top + gutterSize + rowIndex * (rowHeight + gutterSize);
    const growerCount = row.filter(({ grow }) => grow).length;
    // only applied to growers, so this is never used when `growerCount` is 0
    const extra = Math.max(usableRowWidth - getActualRowWidth(row, gutterSize), 0) / growerCount;

    let left = container.left + gutterSize;
    row.forEach(({ id, width, grow }) => {
      const finalWidth = grow ? width + extra : width;
      rects[id] = { top, bottom: top + rowHeight, left, right: left + finalWidth };
      left += finalWidth + gutterSize;
    });
  });

  return rects;
};

const getActualRowWidth = (row: FlowPanel[], gutterSize: number) => {
  // returns the actual pixel width of the panels + gutters in a given row
  return row.reduce((sum, { width }) => sum + width, 0) + gutterSize * (row.length - 1);
};

/** The width a panel is laid out at before any flex growth, using the widths measured at drag start */
const getBaseWidth = (
  panel: FlexPanelData,
  measuredWidth: number | undefined,
  usableRowWidth: number
): number => {
  if (measuredWidth === undefined) return panel.width;
  // growers were measured after growing, so use their requested width unless they span the full row
  return panel.grow && measuredWidth < usableRowWidth - 1 ? panel.width : measuredWidth;
};
