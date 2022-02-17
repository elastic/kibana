/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiDragDropContext,
  EuiDroppable,
  DragDropContextProps,
  EuiDraggable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiIcon,
} from '@elastic/eui';
import React, { FunctionComponent } from 'react';

const DROPPABLE_ID = 'onDragEnd';

export function MultiFieldSelect(props: {
  values: string[];
  onDragEnd: DragDropContextProps['onDragEnd'];
  WrappedComponent: FunctionComponent<{ value: string; index?: number }>;
}) {
  return (
    <EuiDragDropContext onDragEnd={props.onDragEnd}>
      <EuiDroppable droppableId={DROPPABLE_ID} spacing="m">
        {props.values.map((value, index) => (
          <EuiDraggable
            spacing="m"
            key={index}
            index={index}
            draggableId={`${index}`}
            customDragHandle={true}
          >
            {(provided) => (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiPanel
                    color="transparent"
                    paddingSize="s"
                    {...provided.dragHandleProps}
                    aria-label="Drag Handle"
                  >
                    <EuiIcon type="grab" />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem grow={true}>
                  <props.WrappedComponent value={value} index={index} />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiDraggable>
        ))}
      </EuiDroppable>
    </EuiDragDropContext>
  );
}
