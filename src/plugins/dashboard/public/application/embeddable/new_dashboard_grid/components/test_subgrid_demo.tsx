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
  column: 'auto', // size to match container. make sure to include gridstack-extra.min.css
  acceptWidgets: true, // will accept .grid-stack-item by default
  // margin: 5,
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
  const subGridRefs = useRef<{
    [subgridKey: string]: { [key: string]: MutableRefObject<HTMLDivElement> };
  }>({});
  const gridRef = useRef<GridStack>();
  const [items, setItems] = useState<GridStackWidget[]>([
    { id: '0', x: 0, y: 0 },
    { id: '1', x: 1, y: 0 },
    {
      id: 'group-1',
      x: 0,
      y: 1,
      w: 12,
      h: 5,
      noResize: true,
      subGrid: { children: sub, ...subOptions } as GridStackOptions,
    },
    {
      id: 'group-2',
      x: 0,
      y: 6,
      w: 12,
      h: 4,
      noResize: true,
      subGrid: {
        children: [{ id: '11', x: 0, y: 0, w: 2, h: 2 }],
        ...subOptions,
      } as GridStackOptions,
    },
  ]);

  if (Object.keys(refs.current).length !== items.length) {
    items.forEach((item) => {
      refs.current[item.id!] = refs.current[item.id!] || createRef();
      if (item.subGrid) {
        const children = (item.subGrid as GridStackOptions).children;

        children?.forEach((child) => {
          if (!subGridRefs.current[item.id!]) subGridRefs.current[item.id!] = {};
          subGridRefs.current[item.id!][child.id!] =
            subGridRefs.current?.[item.id!]?.[child.id!] || createRef();
        });

        // console.log(subGridRefs.current[item.id!]);
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
        const newGrid = GridStack.addGrid(
          widget.children[0] as HTMLDivElement,
          {
            ...item.subGrid,
            children: [], // need to set children to empty so I can handle the render myself
          } as GridStackOptions
        );

        const children = (item.subGrid as GridStackOptions)?.children;
        children?.forEach((child) => {
          const childWidget = newGrid?.addWidget(subGridRefs.current[item.id!][child.id!].current);
          if (childWidget) newGrid.update(childWidget, child);
        });
      }
    });
    grid.commit();
    // console.log(grid);
  }, [items]);

  return (
    <div className={`grid-stack controlled`}>
      {items.map((item) => {
        const subgrid = item.subGrid;
        const children = (subgrid as GridStackOptions)?.children;

        return (
          <div ref={refs.current[item.id!]} key={item.id} className={'grid-stack-item'}>
            {subgrid && children ? (
              <div
                className="grid-stack-item-content"
                style={{
                  backgroundColor: 'lightblue',
                }}
              >
                {children.map((child) => {
                  return (
                    <div ref={subGridRefs.current[item.id!][child.id!]} className="grid-stack-item">
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
