/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Euigroup } from '@elastic/eui';
import { GridItemHTMLElement, GridStack, GridStackOptions, GridStackWidget } from 'gridstack';
import React, { createRef, MutableRefObject, useEffect, useRef, useState } from 'react';
import { TestGridItem } from './new_grid_item';

interface Props {
  group: GridStackWidget & { render?: () => JSX.Element };
  // widget: GridItemHTMLElement;
  parent?: GridStack;
}

export const TestGridGroup = React.forwardRef<HTMLDivElement, Props>(({ group, parent }, ref) => {
  const [children, setChildren] = useState((group.subGrid as GridStackOptions)?.children ?? []);
  const childrenRefs = useRef<{ [key: string]: MutableRefObject<HTMLDivElement> }>({});

  console.log(group);

  if (Object.keys(childrenRefs.current).length !== children.length) {
    // this happens on each render - so when a group is added, we loop through all existing
    // groups and only change the ref for the new group
    children.forEach((child) => {
      childrenRefs.current[child.id!] = childrenRefs.current[child.id!] || createRef();
    });
  }

  useEffect(() => {
    parent?.load(children);
  }, [parent, children]);

  // useEffect(() => {
  //   if (!parent) return;

  //   // parent.load(children);

  //   // GridStack.addGrid(ref, group.subGrid as GridStackOptions);

  //   console.log(parent);
  //   // debugger;

  //   // children.forEach((child) => {
  //   //   console.log(child);
  //   //   const inner = parent.makeWidget(childrenRefs.current[child.id!].current);
  //   //   console.log('inner:', inner);
  //   //   parent.update(inner, child); // need this so that the size and position are updated **before** the commit
  //   // });
  // }, [parent, children]);

  return (
    <div id={group.id as string} ref={ref} key={group.id} className={'grid-stack-item'}>
      <div className={'grid-stack-item-content'}>
        {/* {JSON.stringify(group)} */}
        <div className="grid-stack grid-stack-nested" style={{ height: '100px' }}>
          {/* {children.map((child) => {
            // return (
            //   <div
            //     id={child.id as string}
            //     ref={childrenRefs.current[child.id!]}
            //     className={'grid-stack-item'}
            //   >
            //     <div className={'grid-stack-item-content'} style={{ backgroundColor: 'red' }}>
            //       {child.content}
            //     </div>
            //   </div>
            // );
            return <TestGridItem panel={child} ref={childrenRefs.current[child.id!]} />;
          })} */}
        </div>
      </div>
    </div>
  );
});

// <div
//   class="grid-stack-item ui-draggable ui-resizable grid-stack-nested ui-resizable-autohide"
//   gs-x="6"
//   gs-y="0"
//   gs-w="3"
//   gs-h="4"
//   style=""
// >
//   <div class="grid-stack-item-content" draggable="true">
//     <style type="text/css" gs-style-id="gridstack-style-38923"></style>
// <div
//   class="grid-stack sub2 grid-stack-nested grid-stack-instance-9299 grid-stack-animate grid-stack-3 ui-droppable"
//   gs-current-row="1"
//   style="height: 50px;"
// >
//   <div
//     class="grid-stack-item ui-draggable ui-resizable ui-resizable-autohide"
//     gs-x="0"
//     gs-y="0"
//     gs-w="2"
//     gs-h="1"
//     style=""
//   >
//     <div class="grid-stack-item-content" draggable="true">
//       7
//     </div>
//     <div
//       class="ui-resizable-handle ui-resizable-se"
//       style="z-index: 100; user-select: none;"
//     ></div>
//   </div>
// </div>
//   </div>
//   <div class="ui-resizable-handle ui-resizable-se" style="z-index: 100; user-select: none;"></div>
// </div>;
