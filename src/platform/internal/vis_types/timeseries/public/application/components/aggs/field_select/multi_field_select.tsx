/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
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

const dragAriaLabel = i18n.translate('visTypeTimeseries.fieldSelect.dragAriaLabel', {
  defaultMessage: 'Drag field',
});

export function MultiFieldSelect(props: {
  values: Array<string | null>;
  onDragEnd: DragDropContextProps['onDragEnd'];
  WrappedComponent: FunctionComponent<{ value?: string | null; index?: number }>;
}) {
  return (
    <EuiDragDropContext onDragEnd={props.onDragEnd}>
      <EuiDroppable droppableId={DROPPABLE_ID} spacing="none">
        {props.values.map((value, index) => (
          <EuiDraggable
            spacing="m"
            key={index}
            index={index}
            draggableId={`${index}`}
            customDragHandle={true}
          >
            {(provided) => (
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiPanel
                    color="transparent"
                    paddingSize="s"
                    {...provided.dragHandleProps}
                    aria-label={dragAriaLabel}
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
