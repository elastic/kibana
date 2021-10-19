/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import '../control_group.scss';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import classNames from 'classnames';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  LayoutMeasuringStrategy,
} from '@dnd-kit/core';

import { ControlGroupInput } from '../types';
import { pluginServices } from '../../../../services';
import { ControlGroupStrings } from '../control_group_strings';
import { CreateControlButton } from '../editor/create_control';
import { EditControlGroup } from '../editor/edit_control_group';
import { forwardAllContext } from '../editor/forward_all_context';
import { ControlClone, SortableControl } from './control_group_sortable_item';
import { useReduxContainerContext } from '../../../redux_embeddables/redux_embeddable_context';
import { controlGroupReducers } from '../state/control_group_reducers';

export const ControlGroup = () => {
  // Presentation Services Context
  const { overlays } = pluginServices.getHooks();
  const { openFlyout } = overlays.useService();

  // Redux embeddable container Context
  const reduxContainerContext = useReduxContainerContext<
    ControlGroupInput,
    typeof controlGroupReducers
  >();
  const {
    useEmbeddableSelector,
    useEmbeddableDispatch,
    actions: { setControlOrders },
  } = reduxContainerContext;
  const dispatch = useEmbeddableDispatch();

  // current state
  const { panels } = useEmbeddableSelector((state) => state);

  const idsInOrder = useMemo(
    () =>
      Object.values(panels)
        .sort((a, b) => (a.order > b.order ? 1 : -1))
        .reduce((acc, panel) => {
          acc.push(panel.explicitInput.id);
          return acc;
        }, [] as string[]),
    [panels]
  );

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingIndex = useMemo(
    () => (draggingId ? idsInOrder.indexOf(draggingId) : -1),
    [idsInOrder, draggingId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ over }: DragEndEvent) => {
    if (over) {
      const overIndex = idsInOrder.indexOf(over.id);
      if (draggingIndex !== overIndex) {
        const newIndex = overIndex;
        dispatch(setControlOrders({ ids: arrayMove([...idsInOrder], draggingIndex, newIndex) }));
      }
    }
    setDraggingId(null);
  };

  return (
    <EuiFlexGroup wrap={false} direction="row" alignItems="center" className="superWrapper">
      <EuiFlexItem>
        <DndContext
          onDragStart={({ active }) => setDraggingId(active.id)}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDraggingId(null)}
          sensors={sensors}
          collisionDetection={closestCenter}
          layoutMeasuring={{
            strategy: LayoutMeasuringStrategy.Always,
          }}
        >
          <SortableContext items={idsInOrder} strategy={rectSortingStrategy}>
            <EuiFlexGroup
              className={classNames('controlGroup', { 'controlGroup-isDragging': draggingId })}
              alignItems="center"
              gutterSize={'m'}
              wrap={true}
            >
              {idsInOrder.map(
                (controlId, index) =>
                  panels[controlId] && (
                    <SortableControl
                      dragInfo={{ index, draggingIndex }}
                      embeddableId={controlId}
                      key={controlId}
                    />
                  )
              )}
            </EuiFlexGroup>
          </SortableContext>
          <DragOverlay>{draggingId ? <ControlClone draggingId={draggingId} /> : null}</DragOverlay>
        </DndContext>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" direction="row" gutterSize="xs">
          <EuiFlexItem>
            <EuiToolTip content={ControlGroupStrings.management.getManageButtonTitle()}>
              <EuiButtonIcon
                aria-label={ControlGroupStrings.management.getManageButtonTitle()}
                iconType="gear"
                color="text"
                data-test-subj="inputControlsSortingButton"
                onClick={() =>
                  openFlyout(forwardAllContext(<EditControlGroup />, reduxContainerContext))
                }
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiToolTip content={ControlGroupStrings.management.getAddControlTitle()}>
              <CreateControlButton />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
