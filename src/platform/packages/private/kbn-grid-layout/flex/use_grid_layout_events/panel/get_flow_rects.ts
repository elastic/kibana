/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlexPanelData } from '../../panel';
import type { FlexLayoutData, FlexLayoutStateManager } from '../../types';
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
 * Simulates how the flex container wraps the panels and returns the rects of all but the dragged one, which
 * still reserves its space at its position in `orderLayout` (default: the current layout). Pass the
 * starting layout so the result doesn't shift with the drag placeholder.
 */
export const getFlowRects = (
  {
    gridLayout$,
    gridSettings$,
    activePanelEvent$,
    layoutRef,
  }: Pick<
    FlexLayoutStateManager,
    'gridLayout$' | 'gridSettings$' | 'activePanelEvent$' | 'layoutRef'
  >,
  orderLayout?: FlexLayoutData
): Record<string, Rect> | undefined => {
  const layout = gridLayout$.value;
  const gridSettings = gridSettings$.value;
  const layoutElement = layoutRef.current;
  if (!gridSettings || !layoutElement) return;

  const container = layoutElement.getBoundingClientRect();
  // read the padding that is actually rendered, since renderers can override it (e.g. controls use `padding-top: 0`)
  const { paddingTop, paddingLeft, paddingRight } = getComputedStyle(layoutElement);
  const padding = {
    top: parseFloat(paddingTop) || 0,
    left: parseFloat(paddingLeft) || 0,
    right: parseFloat(paddingRight) || 0,
  };

  const { gutterSize, rowHeight } = gridSettings;
  const usableRowWidth = container.width - padding.left - padding.right;
  const activePanel = activePanelEvent$.value;
  // the responsive breakpoint stacks every panel at once, giving each a computed `flex-basis` of 100%
  const isStacked = activePanel
    ? getComputedStyle(activePanel.panelDiv).flexBasis === '100%'
    : false;

  // keep the active panel in the flow so it reserves its footprint; panels missing from the layout are skipped
  const orderedIds = getPanelKeysInOrder(orderLayout ?? layout).filter((id) => layout[id]);
  const panels: FlowPanel[] = orderedIds.map((id) => ({
    // get the base widths of each panel
    id,
    width: getBaseWidth(layout[id], activePanel?.panelWidths?.[id], isStacked, usableRowWidth),
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
    const top = container.top + padding.top + rowIndex * (rowHeight + gutterSize);
    const growerCount = row.filter(({ grow }) => grow).length;
    // only applied to growers, so this is never used when `growerCount` is 0
    const extra = Math.max(usableRowWidth - getActualRowWidth(row, gutterSize), 0) / growerCount;

    let left = container.left + padding.left;
    row.forEach(({ id, width, grow }) => {
      const finalWidth = grow ? width + extra : width;
      rects[id] = { top, bottom: top + rowHeight, left, right: left + finalWidth };
      left += finalWidth + gutterSize;
    });
  });

  // the active panel only reserved space; it isn't a collision target
  if (activePanel) delete rects[activePanel.id];
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
  isStacked: boolean,
  usableRowWidth: number
): number => {
  // responsive stacking forces a full-width basis; ordinary growth must not be mistaken for it
  if (isStacked) return usableRowWidth;
  if (measuredWidth === undefined || panel.grow) return panel.width;
  return measuredWidth;
};
