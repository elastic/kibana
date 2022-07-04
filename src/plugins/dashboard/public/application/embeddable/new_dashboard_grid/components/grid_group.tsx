/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GridItemHTMLElement, GridStack, GridStackOptions } from 'gridstack';
import 'gridstack/dist/h5/gridstack-dd-native';
import React, { FC, createRef, useState, RefObject, useEffect, useRef } from 'react';
import { EuiPanel } from '@elastic/eui';
import { GridItem } from './grid_item';
import { GridStackNode, GridStackWidget } from '../lib/gridstack_helpers';

interface Props {
  group: GridStackWidget;
  movePanel: (
    previousWidget: GridStackNode,
    newwidget: GridStackNode,
    origin: string,
    destination: string
  ) => void;
}

export const GridGroup: FC<Props> = ({ group, movePanel }) => {
  const gridConfig = group.subGrid as GridStackOptions;
  const gridElementRef = createRef<HTMLDivElement>();
  const [panels, setPanels] = useState<GridStackWidget[]>(group.subGrid.children || []);
  const gridRef = useRef<GridStack>();
  const panelRefs = useRef<{ [key: string]: RefObject<HTMLDivElement> }>({});

  console.log({ id: group.id, grid: gridRef.current, panels });

  panels.forEach(({ id }) => {
    if (!panelRefs.current[id]) {
      panelRefs.current[id] = createRef();
    }
  });

  useEffect(() => {
    if (gridElementRef.current) {
      gridRef.current =
        gridRef.current ||
        GridStack.init(
          { ...gridConfig, children: [], column: gridConfig.column, class: 'dshPanelGroup' },
          gridElementRef.current
        );

      const grid = gridRef.current;

      grid.on('dropped', (event: Event, previousWidget, newWidget) => {
        if (newWidget && previousWidget) {
          console.log({ newWidget, previousWidget });

          const originId = previousWidget.grid.el.id;
          if (originId !== group.id) {
            movePanel(
              previousWidget as GridStackNode,
              newWidget as GridStackNode,
              originId,
              group.id!
            );
          }
        }
      });

      // This batches all the updates and only re-renders once you call grid.commit()
      grid.column(gridConfig.column as number);
      grid.batchUpdate();
      grid.removeAll(false);

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
    }
  }, [movePanel, gridConfig, panels, gridElementRef, group.id]);

  return (
    <EuiPanel className={'grid-stack-item-content'}>
      <h2>{group.id}</h2>
      <div ref={gridElementRef} id={`grid-${group.id}`} className="grid-stack">
        {panels.map((panel) => {
          return (
            <div
              ref={panelRefs.current[panel.id!]}
              key={panel.id}
              className={'grid-stack-item react-grid-item'}
            >
              <GridItem panel={panel as GridStackWidget} />
            </div>
          );
        })}
      </div>
    </EuiPanel>
  );
};
