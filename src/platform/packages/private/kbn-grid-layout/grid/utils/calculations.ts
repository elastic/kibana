import { GridLayoutData, GridRowData } from "../types";

export const getRowHeight = (row: GridRowData) => {
  // for the elements build like: 
  // {id: '10', row: 58, column: 0, width: 24, height: 11}
  // we need to find the element that has the highest row + height value
  if (row.isCollapsed) return 2;
  const panelsHeight =  Object.values(row.panels).reduce((acc, panel) => {
    const panelEnd = panel.row + panel.height;
    if (!acc) return panelEnd;
    return Math.max(acc, panelEnd);
  }, 0);
  const headerHeight = row.order === 0 ? 0 : 2;
  return panelsHeight + headerHeight;
}

export const getTopOffsetForRow = (rowId: string, layout: GridLayoutData) => {
  // get all the rows before the current row using the order property
  const rowsBefore = Object.values(layout).filter((row) => row.order < layout[rowId].order);
  // get the height of all the rows before the current row
  const rowsBeforeHeight = rowsBefore.reduce((acc, row) => {
    return acc + getRowHeight(row);
  }, 0);
  return rowsBeforeHeight;
}