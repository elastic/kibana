/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps } from 'react';
import {
  EuiDraggable,
  EuiPanel,
  EuiFlexGroup,
  EuiToken,
  EuiText,
  EuiDragDropContext,
  EuiDroppable,
} from '@elastic/eui';

interface SelectionListComponentProps
  extends Pick<ComponentProps<typeof EuiDragDropContext>, 'onDragEnd'> {
  selectionListItems: string[];
}

export function SelectedListComponent({
  selectionListItems,
  onDragEnd,
}: SelectionListComponentProps) {
  return (
    <EuiDragDropContext onDragEnd={onDragEnd}>
      <EuiDroppable droppableId="data-cascade-grouping">
        {selectionListItems.map((selectionListItem, idx) => (
          <EuiDraggable
            draggableId={`data-cascade-grouping-${selectionListItem}`}
            index={idx}
            key={selectionListItem}
            spacing="m"
            usePortal
          >
            {(provided, state) => (
              <EuiPanel
                hasBorder={false}
                hasShadow={state.isDragging}
                paddingSize="xs"
                panelRef={provided.innerRef}
                data-test-subj={`DataCascadeColumnSelection-${selectionListItem}`}
              >
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiToken iconType="tokenString" />
                  <EuiText size="s">{selectionListItem}</EuiText>
                </EuiFlexGroup>
              </EuiPanel>
            )}
          </EuiDraggable>
        ))}
      </EuiDroppable>
    </EuiDragDropContext>
  );
}
