/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiAccordion, htmlIdGenerator } from '@elastic/eui';
import { GridStack, GridItemHTMLElement, GridStackOptions } from 'gridstack';
import { debounce } from 'lodash';
import 'gridstack/dist/h5/gridstack-dd-native';
import React, {
  FC,
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
  RefObject,
  createRef,
} from 'react';
import { GridStackNode, GridStackWidget } from '../lib/gridstack_helpers';
import { GridItem } from './grid_item';

type ColumnOptions = 12 | 24 | 48;

const GRID_CLASS = 'dshGrid';
const HANDLE_CLASS = 'dshPanel__wrapper';
const PANEL_CLASS = 'embPanel';
const NUM_COLUMNS = 48;
const DEFAULT_CELL_HEIGHT = 32;
const DEFAULT_GUTTERSIZE = 4;

const GRID_CONFIG = {
  12: {
    class: 'dshLayout__grid--small',
    cellHeight: DEFAULT_CELL_HEIGHT * 4,
    gridHeightOffset: 1,
  },
  24: {
    class: 'dshLayout__grid--medium',
    cellHeight: DEFAULT_CELL_HEIGHT * 2,
    gridHeightOffset: 2,
  },
  48: { class: 'dshLayout__grid--large', cellHeight: DEFAULT_CELL_HEIGHT, gridHeightOffset: 3 },
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
  const panelRefs = useRef<{ [key: string]: RefObject<HTMLDivElement> }>({});
  const [panels, setPanels] = useState<GridStackWidget[]>(gridData);
  const [info, setInfo] = useState<string>('');

  if (Object.keys(panelRefs.current).length !== panels.length) {
    panels.forEach(({ id }) => {
      panelRefs.current[id] = panelRefs.current[id] || createRef();
    });
  }

  const sharedGridParams = useMemo(
    () => ({
      acceptWidgets: true,
      // The CSS transitions look nice, but I think they impact rendering performance. We might want to turn them off
      // animate: false,
      float: false,
      // TODO: do we like auto cell height? gridstack will just calculate whatever height to achieve a square with the height matching the width of the column
      // It'll also resize as you adjust your viewport, so we don't run into issues with small screens and a static cell height
      // We can decide when we've got gridstack in dashboard and see how responsive individual embeddables/visualizations are
      cellHeight: 'auto',
      // cellHeight: `${GRID_CONFIG[columns].cellHeight}px`,
      column: columns,
      handleClass: HANDLE_CLASS,
      itemClass: `${PANEL_CLASS}`,
      margin: guttersize,
      minRow: columns / 3,
    }),
    [columns, guttersize]
  );

  useEffect(() => {
    gridRef.current =
      gridRef.current ||
      GridStack.init({
        ...sharedGridParams,
        class: GRID_CLASS,
      });

    gridRef.current.on('drag', (event, element) => {
      const node = (element as GridItemHTMLElement)?.gridstackNode;
      if (!node) return;
      setInfo(`you just dragged node #${node.id} to ${node.x},${node.y} – good job!`);
    });

    const grid = gridRef.current;

    // This batches all the updates and only re-renders once you call grid.commit()
    grid.batchUpdate();
    grid.removeAll(false);

    panels.map((panel) => {
      const panelContainer = panelRefs.current[panel.id].current as GridItemHTMLElement;
      let node;
      if (!panelContainer.gridstackNode) {
        const newWidget = grid.makeWidget(panelContainer);
        node = newWidget.gridstackNode;
      } else {
        node = panelContainer.gridstackNode;
      }
      grid.update(panelContainer, panel);

      const subGridConfig = panel.subGrid as GridStackOptions;

      if (subGridConfig) {
        // checks if sub grid has been instantiated
        if (!node?.subGrid?.el) {
          const contentElement = node?.el?.querySelector(
            '.grid-stack-item-content'
          ) as HTMLDivElement;
          const subGrid = GridStack.addGrid(contentElement, subGridConfig);

          subGrid.on(
            'drag resize',
            debounce((event, el) => {
              if (el && subGrid) {
                grid.update(panelContainer, { h: subGrid.getRow() + 2 });
              }
            })
          );
        }
      }
    });
    grid.commit();
  }, [panels, sharedGridParams]);

  const addNewPanel = useCallback(() => {
    const grid = gridRef.current;

    if (!grid) {
      // TODO: error handling bc grid isn't instantiated
      return;
    }

    const id = htmlIdGenerator('panel')();

    const panelNode: GridStackNode = {
      x: 0,
      y: grid.getRow(),
      w: Math.ceil((Math.random() * columns) / 2 + 1),
      h: Math.ceil((Math.random() * columns) / 3 + 1),
      id,
      content: id,
      resizeHandles: 'se',
    };

    setPanels([...panels, panelNode]);
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
      x: 0,
      y: 0,
      w: columns,
      h: columns / 3 + GRID_CONFIG[columns].gridHeightOffset,
      content: `Panel title`,
      noResize: true,
      subGrid: {
        ...sharedGridParams,
        children: [],
        class: 'dshPanelGroup',
      },
    };

    setPanels([...panels, groupNode]);
  }, [panels, columns, sharedGridParams]);

  console.log({ grid: gridRef.current });

  return (
    <div>
      <EuiButton onClick={addNewPanel}>Add Panel</EuiButton>&nbsp;
      <EuiButton onClick={addNewPanelGroup}>Add Grid</EuiButton>&nbsp;
      <div>{info}</div>
      <div>Count:{panels.length}</div>
      <EuiAccordion id={`accordion`} buttonContent="Panel data">
        <div>{JSON.stringify(panels)}</div>
      </EuiAccordion>
      <div className={`grid-stack dshGrid dshLayout--editing ${GRID_CONFIG[columns].class}`}>
        {panels.map((panel) => {
          return (
            <div
              ref={panelRefs.current[panel.id]}
              key={panel.id}
              className={'grid-stack-item react-grid-item'}
            >
              <GridItem panel={panel} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
