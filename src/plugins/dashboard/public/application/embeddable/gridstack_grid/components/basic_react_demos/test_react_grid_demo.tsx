/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton } from '@elastic/eui';
import { GridStack } from 'gridstack';
import React, { createRef, MutableRefObject, useEffect, useRef, useState } from 'react';

interface ItemType {
  id: string;
  colorString: string;
}
const Item = ({ id }: ItemType) => <div>I am item: {id}</div>;

export const ControlledStack = () => {
  const refs = useRef<{ [key: string]: MutableRefObject<HTMLDivElement> }>({});
  const gridRef = useRef<GridStack>();
  const [items, setItems] = useState<ItemType[]>([]);

  if (Object.keys(refs.current).length !== items.length) {
    items.forEach(({ id }) => {
      refs.current[id] = refs.current[id] || createRef();
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
          acceptWidgets: true,
          minRow: 4,
        },
        '.controlled'
      );
    const grid = gridRef.current;
    grid.batchUpdate();
    grid.removeAll(false);
    items.forEach(({ id }) => grid.makeWidget(refs.current[id].current));
    grid.commit();
  }, [items]);

  const addItem = () => {
    const getRandomColor = () => Math.floor(Math.random() * 255);

    setItems([
      ...items,
      {
        id: `item-${items.length + 1}`,
        colorString: `rgb(${getRandomColor()}, ${getRandomColor()}, ${getRandomColor()})`,
      },
    ]);
  };

  return (
    <div>
      <EuiButton onClick={addItem}>Add new widget</EuiButton>
      <div className={`grid-stack controlled`}>
        {items.map((item, i) => {
          return (
            <div ref={refs.current[item.id]} key={item.id} className={'grid-stack-item'}>
              <div
                className="grid-stack-item-content"
                style={{
                  backgroundColor: item.colorString,
                }}
              >
                <Item {...item} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
