/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiAccordion, EuiButton, htmlIdGenerator } from '@elastic/eui';
import {
  GridItemHTMLElement,
  GridStack,
  GridStackEventHandlerCallback,
  GridStackNode,
  GridStackOptions,
  GridStackWidget,
} from 'gridstack';
import React, {
  createRef,
  FC,
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ColumnOptions,
  // CustomType,
  DEFAULT_GROUP_HEIGHT,
  DEFAULT_GUTTERSIZE,
  GRID_CLASS,
  GRID_CONFIG,
  HANDLE_CLASS,
  NUM_COLUMNS,
  // PanelTypes,
  PANEL_CLASS,
} from '../constants';
import { TestGridGroup } from './new_grid_group';
// import { TestGridGroup } from './new_grid_group';
import { TestGridItem } from './new_grid_item';

interface Props {
  gridData?: GridStackWidget[];
  columns?: ColumnOptions;
  guttersize?: number; // in pixels
}

export const TestReactGrid: FC<Props> = ({
  gridData = [],
  columns = NUM_COLUMNS,
  guttersize = DEFAULT_GUTTERSIZE, // TODO: do we want to allow 0 or should we set a min value?
}) => {
  const [panels, setPanels] = useState<GridStackWidget[]>(gridData);
  const panelRefs = useRef<{ [key: string]: MutableRefObject<HTMLDivElement> }>({});
  const gridRef = useRef<GridStack>();

  const sharedGridParams = useMemo(
    () => ({
      float: false,
      acceptWidgets: true,
      handleClass: HANDLE_CLASS,
      itemClass: `${PANEL_CLASS}`,
      column: columns,
      cellHeight: `28px`, // auto
      margin: guttersize,
      minRow: columns / 3,
    }),
    [columns, guttersize]
  );

  if (Object.keys(panelRefs.current).length !== panels.length) {
    // this happens on each render - so when a panel is added, we loop through all existing
    // panels and only change the ref for the new panel
    panels.forEach((panel) => {
      panelRefs.current[panel.id!] = panelRefs.current[panel.id!] || createRef();
    });
  }

  useEffect(() => {
    // on mount
    gridRef.current =
      gridRef.current ||
      GridStack.init({
        ...sharedGridParams,
        class: GRID_CLASS,
      });
  }, [sharedGridParams]);

  useEffect(() => {
    // this happens every time a panel is added.... could we make this more efficient?

    const grid = gridRef.current;

    if (!grid) {
      // TODO: error handling bc grid isn't instantiated
      return;
    }

    // debugger;

    grid.batchUpdate();
    grid.removeAll(false);
    panels.forEach((panel) => {
      const widget = grid.makeWidget(panelRefs.current[panel.id!].current);
      grid.update(widget, panel); // need this so that the size and position are updated **before** the commit
    });
    grid.commit();
  }, [panels]);

  const addNewPanel = () => {
    const id = htmlIdGenerator('panel')();
    const panelNode = {
      w: Math.ceil((Math.random() * columns) / 2 + 1),
      h: Math.ceil((Math.random() * columns) / 3 + 1),
      id,
      content: id,
    };
    setPanels([...panels, panelNode]);
  };

  const addNewPanelGroup = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) {
      // TODO: error handling bc grid isn't instantiated
      return;
    }
    const id = htmlIdGenerator('panel-group')();
    const groupNode = {
      id,
      w: columns,
      h: DEFAULT_GROUP_HEIGHT,
      noResize: true,
      class: 'dshPanelGroup',
      subGrid: {
        ...sharedGridParams,
        column: 'auto',
        children: [
          {
            w: 2,
            h: 2,
            id: id + '_test',
            content: id + '_test',
          },
        ],
      },
    };

    // console.log(groupNode);

    setPanels([...panels, groupNode]);

    // const newGroup = grid.addWidget(groupNode);
    // const subGrid = newGroup.gridstackNode?.subGrid as GridStack;

    // const updateHeight = () => {
    //   if (subGrid && gridRef?.current) {
    //     // the +2 here accounts for the height of the title and extra space for dragging at the bottom
    //     gridRef?.current.update(newGroup, { h: subGrid.getRow() + 2 });
    //   }
    // };
    // const resizeWrapper: GridStackEventHandlerCallback = (event, el) => {
    //   if (el) {
    //     updateHeight();
    //   }
    // };

    // subGrid.on('drag', resizeWrapper);
  }, [columns, panels, sharedGridParams]);

  return (
    <div>
      {/* <EuiButton onClick={addNewPanel}>Add Panel</EuiButton>{' '} */}
      {/* <EuiButton onClick={addNewPanelGroup}>Add Group</EuiButton> */}
      {/* <div>Count:{panels.length}</div>
      <EuiAccordion id={`accordion`} buttonContent="Panel data">
        <div>{JSON.stringify(panels)}</div>
      </EuiAccordion> */}
      {/* <EuiAccordion id={`accordion`} buttonContent="Serialized grid data">
        <div>{JSON.stringify(gridRef.current?.save(true, true))}</div>
      </EuiAccordion> */}
      <div className={`grid-stack ${GRID_CLASS} dshLayout--editing ${GRID_CONFIG[columns].class}`}>
        {panels.map((panel) => {
          return panel.subGrid ? (
            <TestGridGroup
              group={panel}
              parent={gridRef.current}
              ref={panelRefs.current[panel.id!]}
            />
          ) : (
            <TestGridItem panel={panel} ref={panelRefs.current[panel.id!]} />
          );
        })}
      </div>
    </div>
  );
};
