/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GridItemHTMLElement, GridStack, GridStackOptions } from 'gridstack';
import React, { FC, createRef, RefObject, MutableRefObject, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { debounce } from 'lodash';
import 'gridstack/dist/h5/gridstack-dd-native';
import { EuiPanel } from '@elastic/eui';
import { GridStackWidget } from '../lib/gridstack_helpers';

interface Props {
  group: GridStackWidget;
  parentGridRef?: MutableRefObject<GridStack | undefined>;
  addPanelToGroup?: (items: GridStackWidget[], groupId: string) => void;
}

export const GridGroup: FC<Props> = ({ group, parentGridRef, addPanelToGroup }) => {
  const gridConfig = group.subGrid as GridStackOptions;
  const children = gridConfig.children as GridStackWidget[];
  const gridElementRef = createRef<HTMLDivElement>();
  const gridRef = useRef<GridStack>();
  const childrenRefs = useRef<{ [key: string]: RefObject<HTMLDivElement> }>({});

  if (Object.keys(childrenRefs.current).length !== children.length) {
    // this happens on each render - so when a group is added, we loop through all existing
    // groups and only change the ref for the new group
    children.forEach((child) => {
      childrenRefs.current[child.id!] = childrenRefs.current[child.id!] || createRef();
    });
  }

  useEffect(() => {
    if (gridElementRef.current) {
      gridRef.current =
        gridRef.current ||
        GridStack.init(
          { ...gridConfig, children: undefined, column: gridConfig.column },
          gridElementRef.current
        );

      const grid = gridRef.current;

      console.log({ grid });

      grid.on(
        'drag resize',
        debounce((event, el) => {
          if (parentGridRef?.current && gridElementRef.current) {
            parentGridRef.current.update(gridElementRef.current, { h: grid.getRow() + 2 });
          }
        })
      );

      // grid.on('dropped', (_, previousWidget, newWidget) => {
      //   console.log('sub', group.id, { previousWidget, newWidget, children });
      // });

      // grid.on('added', (_, items) => {
      //   if (items && addPanelToGroup) {
      //     if (!Array.isArray(items)) {
      //       items = [items];
      //     }

      //     // for some reason, we get duplicate elements so we need to dedupe here
      //     items = uniqBy(items, ({ id }) => id);

      //     console.log('added', [...items], [...children]);

      //     items = items.map(({ id, x, y, h, resizeHandles, w }) => ({
      //       id,
      //       x,
      //       y,
      //       h,
      //       resizeHandles,
      //       w,
      //     }));
      //     // Assumption here is that panels all start on the parent grid and can't be added directly to a group.
      //     // This is a handler from the parent grid component that handles committing changes to group.
      //     // might not be compatible with embeddables bc dashboard shouldn't need to know about
      //     addPanelToGroup(items as GridStackWidget[], group.id);
      //   }
      // });

      // grid.on('added removed change', (e, items) => {
      //   console.log({ items });
      //   setChildren(items);
      // });

      // This batches all the updates and only re-renders once you call grid.commit()
      grid.batchUpdate();
      // grid.removeAll(false);

      children.map((panel) => {
        if (!document.querySelector(`div[gs-id='${panel.id}']`)) {
          grid.addWidget({ ...panel, content: undefined });
        }

        ReactDOM.render(
          <GridItem panel={panel} />,
          document.querySelector(`div[gs-id='${panel.id}']`)
        );
      });

      grid.commit();
    }
  }, [gridConfig, children, gridElementRef, parentGridRef, group.id, addPanelToGroup]);

  return (
    <EuiPanel className={'grid-stack-item-content'}>
      <h2>{group.content}</h2>
      <div
        ref={gridElementRef}
        id={group.id}
        className="grid-stack grid-stack-nested dshPanelGroup"
      >
        {/* {children.map((child: GridStackWidget) => {
          return (
            <div
              ref={childrenRefs.current[child.id!]}
              key={child.id}
              className={'grid-stack-item react-grid-item'}
            >
              <GridItem panel={child} />
            </div>
          );
        })}
      */}
      </div>
    </EuiPanel>
  );
};
