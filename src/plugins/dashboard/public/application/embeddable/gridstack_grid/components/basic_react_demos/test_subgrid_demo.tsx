/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import 'gridstack/dist/gridstack.min.css';
import { GridStack, GridStackOptions, GridStackWidget } from 'gridstack';
import 'gridstack/dist/h5/gridstack-dd-native';
import React, { createRef, MutableRefObject, useEffect, useRef, useState } from 'react';

const COLUMN_COUNT = 12;

const sub = [
  { id: '4', x: 0, y: 0, w: 2, h: 2 },
  { id: '5', x: 2, y: 0, h: 2 },
  { id: '6', x: 3, y: 0, w: 3 },
  { id: '7', x: 3, y: 1 },
  { id: '8', x: 4, y: 1, w: 2 },
  { id: '9', x: 0, y: 2 },
  { id: '10', x: 1, y: 2 },
];

const subOptions = {
  cellHeight: 50, // should be 50 - top/bottom
  column: COLUMN_COUNT,
  acceptWidgets: true, // will accept .grid-stack-item by default
  minRow: 2,
  margin: 5,
};

const Item = ({ id }: { id: string }) => (
  <div
    className="grid-stack-item-content"
    style={{
      backgroundColor: 'pink',
      cursor: 'move',
    }}
  >
    I am item: {id}
  </div>
);

export const SubgridDemo = () => {
  const panelRefs = useRef<{ [key: string]: MutableRefObject<HTMLDivElement> }>({});
  const subGridRefs = useRef<{ [key: string]: MutableRefObject<HTMLDivElement> }>({});
  const childrenRefs = useRef<{
    [subgridKey: string]: { [childKey: string]: MutableRefObject<HTMLDivElement> };
  }>({});
  const gridRef = useRef<GridStack>();
  const [items, setItems] = useState<GridStackWidget[]>([
    { id: '0', x: 0, y: 0 },
    { id: '1', x: 1, y: 0 },
    {
      id: 'group-1',
      x: 0,
      y: 1,
      w: COLUMN_COUNT,
      h: 5,
      noResize: true,
      subGrid: { children: sub, ...subOptions } as GridStackOptions,
    },
    {
      id: 'group-2',
      x: 0,
      y: 6,
      w: COLUMN_COUNT,
      h: 4,
      noResize: true,
      subGrid: {
        children: [],
        ...subOptions,
      } as GridStackOptions,
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
        cellHeight: 50,
        margin: 5,
        minRow: 2, // don't collapse when empty
        acceptWidgets: true,
        id: 'main',
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
  }, [items]);

  return (
    <div className={`grid-stack controlled`}>
      {items.map((item) => {
        const subgrid = item.subGrid;
        const children = (subgrid as GridStackOptions)?.children ?? [];

        return (
          <div
            ref={panelRefs.current[item.id!]}
            key={`panel-${item.id}`}
            className={'grid-stack-item'}
          >
            {subgrid ? (
              <div
                className="grid-stack-item-content"
                style={{
                  backgroundColor: 'lightblue',
                }}
              >
                <div
                  key={`group-${item.id}`}
                  ref={subGridRefs.current[item.id!]}
                  className="grid-stack grid-stack-nested"
                  style={{ background: '#e4e4c1' }}
                >
                  {children.map((child) => {
                    return (
                      <div
                        key={`group-${item.id}_child-${child.id}`}
                        ref={childrenRefs.current[item.id!][child.id!]}
                        className="grid-stack-item"
                      >
                        <Item id={child.id as string} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Item id={item.id as string} />
            )}
          </div>
        );
      })}
    </div>
  );
};
