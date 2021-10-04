/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import '../control_group.scss';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
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
import { ControlGroupStrings } from '../control_group_strings';
import { ControlGroupContainer } from '../control_group_container';
import { controlGroupReducers } from '../state/control_group_reducers';
import { ControlClone, SortableControl } from './control_group_sortable_item';
import { OPTIONS_LIST_CONTROL } from '../../control_types/options_list/options_list_embeddable';
import { useReduxEmbeddableContext } from '../../../redux_embeddables/redux_embeddable_context';

interface ControlGroupProps {
  controlGroupContainer: ControlGroupContainer;
}

export const ControlGroup = ({ controlGroupContainer }: ControlGroupProps) => {
  const reduxEmbeddableContext = useReduxEmbeddableContext<
    ControlGroupInput,
    typeof controlGroupReducers
  >();

  const currentState = reduxEmbeddableContext.useEmbeddableSelector((state) => state);
  const [controlIds, setControlIds] = useState<string[]>([]);

  useEffect(() => {
    setControlIds((currentIds) => {
      // sync control Ids with panels from state.
      const newIds: string[] = [];
      const allIds = [...currentIds, ...Object.keys(currentState.panels)];
      allIds.forEach((id) => {
        const currentIndex = currentIds.indexOf(id);
        if (!currentState.panels[id] && currentIndex !== -1) {
          currentIds.splice(currentIndex, 1);
        }
        if (currentIndex === -1 && Boolean(currentState.panels[id])) {
          newIds.push(id);
        }
      });
      return [...currentIds, ...newIds];
    });
  }, [currentState.panels]);

  const [draggingId, setDraggingId] = useState<string | null>(null);

  const draggingIndex = useMemo(
    () => (draggingId ? controlIds.indexOf(draggingId) : -1),
    [controlIds, draggingId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ over }: DragEndEvent) => {
    if (over) {
      const overIndex = controlIds.indexOf(over.id);
      if (draggingIndex !== overIndex) {
        const newIndex = overIndex;
        setControlIds((currentControlIds) => arrayMove(currentControlIds, draggingIndex, newIndex));
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
          <SortableContext items={controlIds} strategy={rectSortingStrategy}>
            <EuiFlexGroup
              className={classNames('controlGroup', { 'controlGroup-isDragging': draggingId })}
              alignItems="center"
              gutterSize={'m'}
              wrap={true}
            >
              {controlIds.map((controlId, index) => (
                <SortableControl
                  onEdit={() => controlGroupContainer.editControl(controlId)}
                  onRemove={() => controlGroupContainer.removeEmbeddable(controlId)}
                  dragInfo={{ index, draggingIndex }}
                  container={controlGroupContainer}
                  controlStyle={currentState.controlStyle}
                  embeddableId={controlId}
                  width={currentState.panels[controlId].width}
                  key={controlId}
                />
              ))}
            </EuiFlexGroup>
          </SortableContext>
          <DragOverlay>
            {draggingId ? (
              <ControlClone
                width={currentState.panels[draggingId].width}
                embeddableId={draggingId}
                container={controlGroupContainer}
              />
            ) : null}
          </DragOverlay>
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
                onClick={() => controlGroupContainer.editControlGroup(reduxEmbeddableContext)}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiToolTip content={ControlGroupStrings.management.getAddControlTitle()}>
              <EuiButtonIcon
                aria-label={ControlGroupStrings.management.getManageButtonTitle()}
                iconType="plus"
                color="text"
                data-test-subj="inputControlsSortingButton"
                onClick={() => controlGroupContainer.createNewControl(OPTIONS_LIST_CONTROL)} // use popover when there are multiple types of control
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
