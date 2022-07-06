/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import 'gridstack/dist/gridstack.min.css';
import { GridStack, GridStackOptions } from 'gridstack';
import 'gridstack/dist/h5/gridstack-dd-native';
import React, { createRef, MutableRefObject, useEffect, useRef, useState } from 'react';
import { EuiPanel, EuiIcon } from '@elastic/eui';
import { GridStackWidget } from '../lib/gridstack_helpers';
import { GridItem } from './grid_item';
import {
  MarkdownGridPanel,
  ControlsPanel,
  MetricsPanel,
  UniqueVisitorsPanel,
  ResponseCodesPanel,
  GraphPanel,
} from '../constants';
import SANKEY_CHART_GRAPH from '../images/sankey_chart.png';
import REQUEST_MAP from '../images/total_requests_map.png';

const COLUMN_COUNT = 12;

const sub = [
  { id: '4', x: 0, y: 0, w: 4, h: 3 },
  { id: '5', x: 4, y: 0, w: 3, h: 3 },
  { id: '6', x: 0, y: 3, w: 3, h: 4 },
  { id: '7', x: 3, y: 3, w: 3, h: 4 },
  { id: '8', x: 6, y: 3, w: 3, h: 4 },
  { id: '9', x: 0, y: 7 },
  { id: '10', x: 1, y: 7 },
];

const subOptions = {
  cellHeight: 28, // should be 50 - top/bottom
  column: COLUMN_COUNT,
  acceptWidgets: true, // will accept .grid-stack-item by default
  minRow: 2,
  margin: 5,
};

const Item = ({ id }: { id: string }) => (
  <EuiPanel className="grid-stack-item-content">I am item: {id}</EuiPanel>
);

export const StyledSubgridDemo = () => {
  const panelRefs = useRef<{ [key: string]: MutableRefObject<HTMLDivElement> }>({});
  const subGridRefs = useRef<{ [key: string]: MutableRefObject<HTMLDivElement> }>({});
  const childrenRefs = useRef<{
    [subgridKey: string]: { [childKey: string]: MutableRefObject<HTMLDivElement> };
  }>({});
  const gridRef = useRef<GridStack>();
  const [items, setItems] = useState<GridStackWidget[]>([
    {
      id: 'panel1',
      x: 0,
      y: 0,
      w: 4,
      h: 6,
      render: () => <MarkdownGridPanel />,
    },
    {
      id: 'panel2',
      x: 4,
      y: 0,
      w: 8,
      h: 6,
      render: () => <ControlsPanel />,
    },
    {
      id: 'group-1',
      x: 0,
      y: 7,
      w: COLUMN_COUNT,
      h: 12,
      title: 'Error responses',
      noResize: true,
      subGrid: {
        children: [
          {
            x: 0,
            y: 0,
            w: 3,
            h: 8,
            id: 'panel3',
            render: () => <MetricsPanel value="4.4%" label="HTTP 4xx" fontSize="12px" />,
          },
          {
            x: 3,
            y: 0,
            w: 3,
            h: 8,
            id: 'panel4',
            render: () => <MetricsPanel value="3.4%" label="HTTP 5xx" fontSize="12px" />,
          },
        ],
        ...subOptions,
        minRow: 12,
      } as GridStackOptions,
    },
    {
      id: 'group-2',
      x: 0,
      y: 19,
      w: COLUMN_COUNT,
      h: 12,
      title: 'New group',
      noResize: true,
      subGrid: {
        children: [],
        ...subOptions,
        minRow: 12,
      } as GridStackOptions,
    },
    {
      x: 0,
      y: 31,
      w: 3,
      h: 10,
      id: '11',
      render: () => <UniqueVisitorsPanel />,
    },
    {
      x: 3,
      y: 31,
      w: 3,
      h: 10,
      id: '15',
      title: '[Logs] Response Codes Over Time + Annotations',
      render: () => <ResponseCodesPanel />,
    },
    {
      x: 6,
      y: 31,
      w: 3,
      h: 10,
      id: '20',
      title: '[Logs] Total Requests and Bytes',
      render: () => <GraphPanel graph={REQUEST_MAP} />,
    },
    {
      x: 9,
      y: 31,
      w: 3,
      h: 10,
      id: '14',
      title: '[Logs] Machine OS and Destination Sankey Chart',
      render: () => <GraphPanel graph={SANKEY_CHART_GRAPH} />,
    },
  ]);

  if (Object.keys(panelRefs.current).length !== items.length) {
    items.forEach((item) => {
      panelRefs.current[item.id!] = panelRefs.current[item.id!] || createRef();
      if (item.subGrid) {
        subGridRefs.current[item.id!] = subGridRefs.current[item.id!] || createRef();

        const children = (item.subGrid as GridStackOptions).children;
        children?.forEach((child) => {
          if (!childrenRefs.current[item.id!]) childrenRefs.current[item.id!] = {};
          childrenRefs.current[item.id!][child.id!] =
            childrenRefs.current?.[item.id!]?.[child.id!] || createRef();
        });
      }
    });
  }

  useEffect(() => {
    gridRef.current =
      gridRef.current ||
      GridStack.init({
        float: false,
        column: COLUMN_COUNT,
        cellHeight: 28,
        margin: 5,
        minRow: 2, // don't collapse when empty
        acceptWidgets: true,
        id: 'main',
        handle: 'embPanel__header',
        handleClass: 'react-resizable-handle',
      });

    const grid = gridRef.current;

    grid.batchUpdate();
    grid.removeAll(false);

    items.forEach((item) => {
      const widget = grid.makeWidget(panelRefs.current[item.id!].current);
      grid.update(widget, item);

      if (item.subGrid) {
        const newGrid = GridStack.init(
          {
            ...item.subGrid,
            children: [], // need to set children to empty so I can handle the render myself
          } as GridStackOptions,
          subGridRefs.current[item.id!].current
        );

        newGrid.batchUpdate();
        // H: if we want panel groups that **don't** take up an entire row, this won't work
        // C: I think we can set column count to the same number as the width of the group widget, e.g. item.w?
        newGrid.column(COLUMN_COUNT);
        newGrid.removeAll(false);

        const children = (item.subGrid as GridStackOptions)?.children ?? [];
        children.forEach((child) => {
          const childWidget = newGrid.makeWidget(childrenRefs.current[item.id!][child.id!].current);
          newGrid.update(childWidget, child);
        });

        newGrid.commit();
      }
    });

    grid.commit();
    console.log({ grid: gridRef.current?.save(false, false) });
  }, [items]);

  return (
    <div className={`grid-stack`}>
      {items.map((item) => {
        const subgrid = item.subGrid;
        const children = ((subgrid as GridStackOptions)?.children ?? []) as GridStackWidget[];

        return (
          <div
            ref={panelRefs.current[item.id!]}
            key={`panel-${item.id}`}
            className={'grid-stack-item react-grid-item'}
          >
            {subgrid ? (
              <EuiPanel
                className="grid-stack-item-content embPanel embPanel--editing"
                paddingSize="none"
                style={{ overflow: 'hidden' }}
              >
                <figcaption className="embPanel__header">
                  <h2 className="embPanel__title embPanel__dragger">
                    <span className="embPanel__titleInner">
                      <span className="embPanel__titleText">
                        <EuiIcon type="arrowDown" />
                        &nbsp;
                        {item.title ?? 'Panel group title'}
                      </span>
                    </span>
                  </h2>
                </figcaption>
                <div style={{ padding: '4px', background: 'none', overflow: 'scroll' }}>
                  <div
                    key={`group-${item.id}`}
                    ref={subGridRefs.current[item.id!]}
                    className="grid-stack grid-stack-nested"
                  >
                    {children.map((child) => {
                      return (
                        <div
                          key={`group-${item.id}_child-${child.id}`}
                          ref={childrenRefs.current[item.id!][child.id!]}
                          className="grid-stack-item"
                        >
                          <GridItem panel={child} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </EuiPanel>
            ) : (
              <GridItem panel={item} />
            )}
          </div>
        );
      })}
    </div>
  );
};
