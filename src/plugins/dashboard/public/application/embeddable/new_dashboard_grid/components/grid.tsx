/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, useCallback, useEffect, useState } from 'react';
import { debounce } from 'lodash';
import {
  GridItemHTMLElement,
  GridStack,
  GridStackNode,
  GridStackEventHandlerCallback,
  GridStackPosition,
} from 'gridstack';
import 'gridstack/dist/h5/gridstack-dd-native';
import { EuiButton } from '@elastic/eui';

const CELL_HEIGHT = 32;
const GRID_CLASS = 'dshGrid';
const HANDLE_CLASS = 'dshPanel__wrapper';
const PANEL_CLASS = 'dshPanel';
const NUM_COLUMNS = 48;
const DEFAULT_PANEL_WIDTH = NUM_COLUMNS / 2;
const DEFAULT_PANEL_HEIGHT = NUM_COLUMNS / 3;
const DEFAULT_GROUP_HEIGHT = NUM_COLUMNS / 3;
const DEFAULT_GUTTERSIZE = 8;

let grid: GridStack; // TODO: need to move this up into the application and out of this component

interface Props {
  gridData?: Array<GridStackPosition & { id: string; content: string }>;
  columns?: number; // TODO: should only allow specific values, i.e. 12 | 24 | 48?
  guttersize?: number; // in pixels
}

const SHARED_GRID_PARMS = {
  cellHeight: `${CELL_HEIGHT}px`,
  float: false,
  acceptWidgets: true,
  handleClass: HANDLE_CLASS,
  itemClass: PANEL_CLASS,
  minRow: DEFAULT_PANEL_HEIGHT,
};

export const Grid: FC<Props> = ({
  gridData = [],
  columns = NUM_COLUMNS,
  guttersize = DEFAULT_GUTTERSIZE, // TODO: do we want to allow 0 or should we set a min value?
}) => {
  const [count, setCount] = useState<number>(0);
  const [info, setInfo] = useState<string>('');
  const [panels, setPanels] = useState<GridStackNode[]>([]);

  useEffect(() => {
    grid = GridStack.init({
      ...SHARED_GRID_PARMS,
      column: columns,
      class: GRID_CLASS,
      margin: guttersize,
    });

    grid.on('drag', (event, element) => {
      console.log('grid drag stop');
      const node = (element as GridItemHTMLElement)?.gridstackNode;
      if (!node) return;
      const newPanels = [...panels];
      const { x, y, w, h, content, id } = node;
      newPanels[Number(node.id)] = { x, y, w, h, content, id };

      setInfo(`you just dragged node #${node.id} to ${node.x},${node.y} – good job!`);
      setPanels(newPanels);
    });

    if (gridData.length) {
      grid.load(gridData, true);
    }
  }, [columns, gridData, guttersize, panels]); // TODO: investigate what happens to grid if we call init multiple times as column size changes, will it blow away all the panels?

  const addNewPanel = useCallback(() => {
    if (!grid) {
      // TODO: error handling bc grid isn't instantiated
      return;
    }

    const id = String(count);
    const node: GridStackNode = {
      w: Math.ceil(Math.random() * DEFAULT_PANEL_WIDTH + 1),
      h: Math.ceil(Math.random() * DEFAULT_PANEL_HEIGHT + 1),
      id,
      content: id,
      resizeHandles: 'se',
    };

    setCount(count + 1);
    setPanels([...panels, node]);

    grid.addWidget(node);
  }, [count, panels]);

  const addNewPanelGroup = useCallback(() => {
    if (!grid) {
      // TODO: error handling bc grid isn't instantiated
      return;
    }

    const id = `panel-group-${count}`;
    const newGroup = grid?.addWidget({
      id,
      autoPosition: true,
      w: columns,
      h: DEFAULT_GROUP_HEIGHT,
      // noResize: true,
      noResize: true,
      content: `<h1 style="height:${CELL_HEIGHT}px;width:100%">title</h1>`,
      subGrid: {
        ...SHARED_GRID_PARMS,
        column: columns,
        minRow: DEFAULT_GROUP_HEIGHT,
        acceptWidgets: true,
        class: 'nested1',
        children: [],
      },
    });

    const subGrid = newGroup?.gridstackNode?.subGrid as GridStack;

    const updateHeight = () => {
      if (newGroup?.gridstackNode) {
        grid?.update(newGroup, { h: subGrid.getRow() + 2 }); // the 2 here accounts for the height of the title and extra space for dragging panels
      }
    };

    const resizeWrapper: GridStackEventHandlerCallback = (event, el) => {
      if (el) {
        if (newGroup?.gridstackNode?.subGrid) {
          updateHeight();
        }
      }
    };

    subGrid?.on('drag resize', debounce(resizeWrapper, 200));
  }, [columns, count]);

  return (
    <div>
      <EuiButton onClick={addNewPanel}>Add Panel</EuiButton>&nbsp;
      <EuiButton onClick={addNewPanelGroup}>Add Grid</EuiButton>
      <div>{info}</div>
      <div>Count:{count}</div>
      <div>Panels: {JSON.stringify(panels)}</div>
      <div className="grid-stack dshLayout--editing">
        <></>
      </div>
    </div>
  );
};
