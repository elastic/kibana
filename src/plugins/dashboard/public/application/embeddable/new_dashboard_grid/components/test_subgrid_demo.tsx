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

const sub = [
  { id: '3', x: 0, y: 0 },
  { id: '4', x: 1, y: 0 },
  { id: '5', x: 2, y: 0 },
  { id: '6', x: 3, y: 0 },
  { id: '7', x: 0, y: 1 },
  { id: '8', x: 1, y: 1 },
];

const subOptions = {
  cellHeight: 50, // should be 50 - top/bottom
  column: 'auto', // size to match container. make sure to include gridstack-extra.min.css
  acceptWidgets: true, // will accept .grid-stack-item by default
  margin: 5,
  minRow: 2,
};

const Item = ({ id }: { id: string }) => (
  <div
    className="grid-stack-item-content"
    style={{
      backgroundColor: 'pink',
    }}
  >
    I am item: {id}
  </div>
);

export const SubgridDemo = () => {
  const refs = useRef<{ [key: string]: MutableRefObject<HTMLDivElement> }>({});
  const subGridRefs = useRef<{ [key: string]: MutableRefObject<HTMLDivElement> }>({});
  const gridRef = useRef<GridStack>();
  const [items, setItems] = useState<GridStackWidget[]>([
    { id: '0', x: 0, y: 0 },
    { id: '1', x: 0, y: 1 },
    {
      id: '2',
      x: 1,
      y: 0,
      w: 4,
      h: 5,
      subGrid: {
        children: [],
        ...subOptions,
      } as GridStackOptions,
    },
    {
      x: 5,
      w: 3,
      h: 4,
      subGrid: { children: sub, class: 'sub2', ...subOptions } as GridStackOptions,
    },
  ]);

  if (Object.keys(refs.current).length !== items.length) {
    items.forEach((item) => {
      refs.current[item.id!] = refs.current[item.id!] || createRef();
      if (item.subGrid) {
        const children = (item.subGrid as GridStackOptions).children;
        children?.forEach((child) => {
          subGridRefs.current[child.id!] = subGridRefs.current[child.id!] || createRef();
        });
      }
    });
  }

  useEffect(() => {
    console.log('on mount');
    return () => {
      console.log('on dismount');
    };
  }, []);

  useEffect(() => {
    gridRef.current =
      gridRef.current ||
      GridStack.init(
        {
          float: false,
          column: 12,
          cellHeight: 50,
          margin: 5,
          minRow: 2, // don't collapse when empty
          acceptWidgets: true,
          id: 'main',
        },
        '.controlled'
      );
    const grid = gridRef.current;
    grid.batchUpdate();
    grid.removeAll(false);
    items.forEach((item) => {
      const widget = grid.makeWidget(refs.current[item.id!].current);
      grid.update(widget, item);
      if (item.subGrid) {
        const newGrid = GridStack.addGrid(widget, {
          ...item.subGrid,
          children: [],
        } as GridStackOptions);

        const children = (item.subGrid as GridStackOptions)?.children;
        children?.forEach((child) => {
          const childWidget = newGrid?.addWidget(subGridRefs.current[child.id!].current);
          if (childWidget) newGrid.update(childWidget, child);
        });
      }
    });
    grid.commit();
  }, [items]);

  return (
    <div className={`grid-stack controlled`}>
      {items.map((item, i) => {
        const subgrid = item.subGrid;
        const children = (subgrid as GridStackOptions)?.children;

        return (
          <div ref={refs.current[item.id!]} key={item.id} className={'grid-stack-item'}>
            {subgrid ? (
              <div
                className="grid-stack-item-content"
                style={{
                  backgroundColor: 'lightblue',
                }}
              >
                {children &&
                  children.map((child) => {
                    return (
                      <div ref={subGridRefs.current[child.id!]} className="grid-stack-item">
                        <Item id={child.id as string} />
                      </div>
                    );
                  })}
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
