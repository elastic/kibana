/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiAccordion, EuiButton, EuiPanel, htmlIdGenerator } from '@elastic/eui';
import { GridStack, GridStackNode, GridStackWidget } from 'gridstack';
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
  DEFAULT_GUTTERSIZE,
  GRID_CLASS,
  GRID_CONFIG,
  HANDLE_CLASS,
  NUM_COLUMNS,
  PANEL_CLASS,
} from '../constants';
import { TestGridItem } from './test_grid_item';

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
  const [panels, setPanels] = useState<GridStackNode[]>(gridData);
  const panelRefs = useRef<{ [key: string]: MutableRefObject<HTMLDivElement> }>({});
  const gridRef = useRef<GridStack>();

  const sharedGridParams = useMemo(
    () => ({
      float: false,
      acceptWidgets: true,
      handleClass: HANDLE_CLASS,
      itemClass: `${PANEL_CLASS}`,
      column: columns,
      cellHeight: `${GRID_CONFIG[columns].cellHeight}px`,
      margin: guttersize,
      minRow: columns / 3,
    }),
    [columns, guttersize]
  );

  if (Object.keys(panelRefs.current).length !== panels.length) {
    panels.forEach((panel) => {
      panelRefs.current[panel.id!] = panelRefs.current[panel.id!] || createRef();
    });
  }

  useEffect(() => {
    gridRef.current =
      gridRef.current ||
      GridStack.init({
        ...sharedGridParams,
        class: GRID_CLASS,
      });
    const grid = gridRef.current;

    if (grid && gridData.length) {
      grid.batchUpdate();
      grid.removeAll(false);
      panels.forEach((panel) => grid.makeWidget(panelRefs.current[panel.id!].current));
      grid.commit();
    }
  });

  const addNewPanel = useCallback(async () => {
    const grid = gridRef.current;

    if (!grid) {
      // TODO: error handling bc grid isn't instantiated
      return;
    }

    const id = htmlIdGenerator('panel')();
    const panelNode = {
      w: Math.ceil((Math.random() * columns) / 2 + 1),
      h: Math.ceil((Math.random() * columns) / 3 + 1),
      x: 0,
      y: 0,
      id,
      content: id,
    };

    setPanels([...panels, panelNode]);
    if (panelRefs.current[id]) {
      // wait for reference to exist before making the widget
      grid.makeWidget(panelRefs.current[id].current);
    }
  }, [panels, columns, setPanels]);

  return (
    <div>
      <EuiButton onClick={addNewPanel}>Add Panel</EuiButton>
      <div>Count:{panels.length}</div>
      <EuiAccordion id={`accordion`} buttonContent="Panel data">
        <div>{JSON.stringify(panels)}</div>
      </EuiAccordion>
      <div className={`grid-stack dshLayout--editing ${GRID_CONFIG[columns].class}`}>
        {panels.map((panel, i) => {
          return <TestGridItem panel={panel} ref={panelRefs.current[panel.id!]} />;
        })}
      </div>
    </div>
  );
};
