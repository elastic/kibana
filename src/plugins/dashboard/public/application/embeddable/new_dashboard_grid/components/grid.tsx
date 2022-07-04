/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiAccordion, htmlIdGenerator } from '@elastic/eui';
import { GridStack, GridItemHTMLElement, GridStackOptions } from 'gridstack';
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
import ReactDOM from 'react-dom';
import { GridStackNode, GridStackWidget } from '../lib/gridstack_helpers';
import { GridItem } from './grid_item';
import { GridGroup } from './grid_group';

type ColumnOptions = 12 | 24 | 48;

const GRID_CLASS = 'dshGrid';
const HANDLE_CLASS = 'dshPanel__wrapper';
const PANEL_CLASS = 'dshPanel';
const GROUP_CLASS = 'dshPanelGroup';
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

// TODO: Remove this prototype override once removeChild bug is fixed
// This suppresses an error resulting from the `movePanel` callback function that updates panels by
// removing the dropped panel from the origin grid and adding it to the destination grid.
// The cause for the error is React is trying to remove a child node from a parent node it's not actually nested under.
// My theory is gridstack is deleting DOM elements before React has a chance to properly unmount the removed panels.
// This currently is logging the both the child DOM node and parent DOM node when this error occurs
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      if (console) {
        console.error('Cannot remove a child from a different parent', child, this);
      }
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };
}

const dashboardId = htmlIdGenerator('dashboard')();

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

  console.log({ id: 'main', grid: gridRef.current, panels });

  panels.forEach(({ id }) => {
    if (!panelRefs.current[id]) {
      panelRefs.current[id] = createRef();
    }
  });

  const sharedGridParams = useMemo(
    () => ({
      acceptWidgets: true,
      // The CSS transitions look nice, but I think they impact rendering performance. We might want to turn them off
      // animate: false,
      float: false,
      // TODO: do we like auto cell height? gridstack will just calculate whatever height to achieve a square with the height matching the width of the column
      // It'll also resize as you adjust your viewport, so we don't run into issues with small screens and a static cell height
      // We can decide when we've got gridstack in dashboard and see how responsive individual embeddables/visualizations are
      // cellHeight: 'auto',
      cellHeight: `${GRID_CONFIG[columns].cellHeight}px`,
      column: columns,
      handleClass: HANDLE_CLASS,
      margin: guttersize,
      minRow: columns / 6,
    }),
    [columns, guttersize]
  );

  const movePanel = useCallback(
    (previousWidget: GridStackNode, newWidget: GridStackNode, origin, destination) => {
      const { el: previousElement, grid: originGrid } = previousWidget;
      const { id, x, y, w, h } = newWidget;
      const widgetConfig = { id, x, y, w, h } as GridStackWidget;

      console.log('before', { ...panels });

      let wasPanelRemoved = false;

      // origin was main grid
      if (origin === dashboardId) {
        const indexToRemove = panels.findIndex((child) => child.id === id);
        panels.splice(indexToRemove, 1);
        wasPanelRemoved = true;
      } else {
        // origin was a subgrid
        const originGridConfig = panels.find((panel) => panel.id === origin)
          ?.subGrid as GridStackOptions;
        const indexToRemove = originGridConfig?.children?.findIndex((child) => child.id === id);
        if (indexToRemove !== undefined && indexToRemove >= 0) {
          originGridConfig!.children!.splice(indexToRemove, 1);
          wasPanelRemoved = true;
        }
      }

      if (wasPanelRemoved) {
        originGrid?.removeWidget(previousElement as GridItemHTMLElement);
        ReactDOM.unmountComponentAtNode(previousElement as Element);
        // previousElement?.parentNode?.removeChild(previousElement);

        // destination is main grid
        if (destination === dashboardId) {
          panels.push(widgetConfig);
        } else {
          // destination is a subgrid
          const destinationGrid = panels.find((panel) => panel.id === destination)
            ?.subGrid as GridStackOptions;
          destinationGrid?.children?.push(widgetConfig);
        }

        console.log('after', { ...panels });
        setPanels(panels);
      }
    },
    [panels]
  );

  useEffect(() => {
    gridRef.current =
      gridRef.current ||
      GridStack.init({
        ...sharedGridParams,
        class: GRID_CLASS,
        draggable: { scroll: true },
      });

    const grid = gridRef.current;

    grid.on('drag', (event, element) => {
      const node = (element as GridItemHTMLElement)?.gridstackNode;
      if (!node) return;
      setInfo(`you just dragged node #${node.id} to ${node.x},${node.y} – good job!`);
    });

    grid.on('dropped', (event: Event, previousWidget, newWidget) => {
      if (newWidget && previousWidget) {
        console.log({ newWidget, previousWidget });
        const originId = previousWidget.grid.el.id;
        if (originId !== dashboardId) {
          movePanel(
            previousWidget as GridStackNode,
            newWidget as GridStackNode,
            originId,
            dashboardId
          );
        }
      }
    });

    // This batches all the updates and only re-renders once you call grid.commit()
    grid.batchUpdate();
    grid.removeAll(true);

    panels.map((panel) => {
      const panelContainer = panelRefs.current[panel.id].current as GridItemHTMLElement;
      if (panelContainer) {
        if (!panelContainer.gridstackNode) {
          grid.makeWidget(panelContainer);
        }
        grid.update(panelContainer, { ...panel, subGrid: undefined, content: undefined });
      }
    });

    grid.commit();
  }, [panels, sharedGridParams, movePanel]);

  const addNewPanel = useCallback(() => {
    const grid = gridRef.current;

    if (!grid) {
      // TODO: error handling bc grid isn't instantiated
      return;
    }

    const id = htmlIdGenerator('panel')();

    const panelNode: GridStackWidget = {
      x: 0,
      y: grid.getRow(),
      w: Math.ceil((Math.random() * columns) / 2 + 1),
      h: Math.ceil((Math.random() * columns) / 6 + 1),
      id,
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
      h: columns / 6 + 1,
      noResize: true,
      subGrid: {
        ...sharedGridParams,
        children: [],
        class: 'dshPanelGroup__grid',
        acceptWidgets: `.${PANEL_CLASS}`,
      },
    };

    setPanels([...panels, groupNode]);
  }, [panels, columns, sharedGridParams]);

  console.log('grid render', { grid: gridRef.current, panels });

  return (
    <div>
      <EuiButton onClick={addNewPanel}>Add Panel</EuiButton>&nbsp;
      <EuiButton onClick={addNewPanelGroup}>Add Grid</EuiButton>&nbsp;
      <div>{info}</div>
      <div>Count:{panels.length}</div>
      <EuiAccordion id={`accordion`} buttonContent="Panel data">
        <div>{JSON.stringify(panels, null, 2)}</div>
      </EuiAccordion>
      <div
        id={dashboardId}
        className={`grid-stack dshGrid dshLayout--editing ${GRID_CONFIG[columns].class}`}
      >
        {panels.map((panel) => {
          return (
            <div
              ref={panelRefs.current[panel.id]}
              key={panel.id}
              className={`grid-stack-item react-grid-item ${
                panel.subGrid ? GROUP_CLASS : PANEL_CLASS
              }`}
            >
              {panel.subGrid ? (
                <GridGroup group={panel} parentGridRef={gridRef} movePanel={movePanel} />
              ) : (
                <GridItem panel={panel} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
