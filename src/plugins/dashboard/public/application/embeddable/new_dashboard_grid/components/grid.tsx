/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiAccordion, htmlIdGenerator } from '@elastic/eui';
import {
  GridItemHTMLElement,
  GridStack,
  GridStackNode,
  GridStackEventHandlerCallback,
  GridStackWidget,
} from 'gridstack';
import 'gridstack/dist/h5/gridstack-dd-native';
import React, {
  FC,
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
  Ref,
  createRef,
} from 'react';
import { GridItem } from './grid_item';

type ColumnOptions = 12 | 24 | 48;

const GRID_CLASS = 'dshGrid';
const HANDLE_CLASS = 'dshPanel__wrapper';
const PANEL_CLASS = 'embPanel';
const NUM_COLUMNS = 48;
const DEFAULT_CELL_HEIGHT = 24;
const DEFAULT_GROUP_HEIGHT = NUM_COLUMNS / 3;
const DEFAULT_GUTTERSIZE = 4;

const GRID_CONFIG = {
  12: { class: 'dshLayout__grid--small', cellHeight: DEFAULT_CELL_HEIGHT * 4 },
  24: { class: 'dshLayout__grid--medium', cellHeight: DEFAULT_CELL_HEIGHT * 2 },
  48: { class: 'dshLayout__grid--large', cellHeight: DEFAULT_CELL_HEIGHT },
};

interface Props {
  gridData?: GridStackWidget[];
  columns?: ColumnOptions;
  guttersize?: number; // in pixels
}

export const Grid: FC<Props> = ({
  gridData = [],
  columns = NUM_COLUMNS,
  guttersize = DEFAULT_GUTTERSIZE, // TODO: do we want to allow 0 or should we set a min value?
}) => {
  const gridRef = useRef<GridStack>();
  const panelRefs = useRef<{ [key: string]: Ref<HTMLDivElement> }>({});
  const [panels, setPanels] = useState<GridStackNode[]>(gridData);
  const [info, setInfo] = useState<string>('');

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

  if (Object.keys(panelRefs).length !== panels.length) {
    panels.map((panel) => {
      if (!panelRefs.current[panel.id!]) {
        panelRefs.current[panel.id!] = createRef();
      }
    });
  }

  const renderPanelInWidget = (panel: GridStackNode) => {
    gridRef?.current?.addWidget(panelRefs.current[panel.id!]!.current, panel);
  };

  useEffect(() => {
    if (!gridRef.current) {
      gridRef.current = GridStack.init({
        ...sharedGridParams,
        class: GRID_CLASS,
      });

      gridRef.current.on('drag', (event, element) => {
        const node = (element as GridItemHTMLElement)?.gridstackNode;
        if (!node) return;
        setInfo(`you just dragged node #${node.id} to ${node.x},${node.y} – good job!`);
      });
    }

    const grid = gridRef.current;

    if (gridData.length) {
      grid.batchUpdate();
      grid.removeAll(false);
      gridData.map(renderPanelInWidget);
      grid.commit();
    }
  }, [gridData, sharedGridParams]);

  const addNewPanel = useCallback(() => {
    const grid = gridRef.current;

    if (!grid) {
      // TODO: error handling bc grid isn't instantiated
      return;
    }

    const id = htmlIdGenerator('panel')();
    const panelNode: GridStackNode = {
      w: Math.ceil((Math.random() * columns) / 2 + 1),
      h: Math.ceil((Math.random() * columns) / 3 + 1),
      id,
      content: id,
      resizeHandles: 'se',
      autoPosition: true,
    };

    setPanels(panels.concat([panelNode]));
    grid.addWidget(panelNode);
  }, [panels, setPanels, columns]);

  const addNewPanelGroup = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) {
      // TODO: error handling bc grid isn't instantiated
      return;
    }

    const id = htmlIdGenerator('panel-group')();
    const groupNode = {
      id,
      autoPosition: true,
      w: columns,
      h: DEFAULT_GROUP_HEIGHT,
      noResize: true,
      content: `<h1 style="height:${GRID_CONFIG[columns].cellHeight}px;width:100%">title</h1>`,
      subGrid: {
        ...sharedGridParams,
        children: [],
        class: 'dshPanelGroup',
      },
    };

    setPanels(panels.concat([groupNode]));
    const newGroup = grid.addWidget(groupNode);
    const subGrid = newGroup.gridstackNode?.subGrid as GridStack;

    const updateHeight = () => {
      if (subGrid && gridRef?.current) {
        // the +2 here accounts for the height of the title and extra space for dragging at the bottom
        gridRef?.current.update(newGroup, { h: subGrid.getRow() + 2 });
      }
    };

    const resizeWrapper: GridStackEventHandlerCallback = (event, el) => {
      if (el) {
        updateHeight();
      }
    };

    subGrid.on('drag', resizeWrapper);
  }, [panels, columns, sharedGridParams]);

  return (
    <div>
      <EuiButton onClick={addNewPanel}>Add Panel</EuiButton>&nbsp;
      <EuiButton onClick={addNewPanelGroup}>Add Grid</EuiButton>&nbsp;
      <div>{info}</div>
      <div>Count:{panels.length}</div>
      <EuiAccordion id={`accordion`} buttonContent="Panel data">
        <div>{JSON.stringify(panels)}</div>
      </EuiAccordion>
      <div className={`grid-stack dshLayout--editing ${GRID_CONFIG[columns].class}`}>
        {panels.map((panel) => {
          const callbackRef = (element: HTMLDivElement) => {
            if (panelRefs.current[panel.id]) {
              panelRefs.current[panel.id!].current = element;
            }
          };
          return <GridItem panel={panel} callbackRef={callbackRef} />;
        })}
      </div>
    </div>
  );
};
