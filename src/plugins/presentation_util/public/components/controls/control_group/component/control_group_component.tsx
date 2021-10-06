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
import { pluginServices } from '../../../../services';
import { ControlGroupStrings } from '../control_group_strings';
import { CreateControlButton } from '../editor/create_control';
import { EditControlGroup } from '../editor/edit_control_group';
import { forwardAllContext } from '../editor/forward_all_context';
import { ControlClone, SortableControl } from './control_group_sortable_item';
import { useReduxContainerContext } from '../../../redux_embeddables/redux_embeddable_context';

export const ControlGroup = () => {
  // Presentation Services Context
  const { overlays } = pluginServices.getHooks();
  const { openFlyout } = overlays.useService();

  // Redux embeddable container Context
  const reduxContainerContext = useReduxContainerContext<ControlGroupInput>();
  const { useEmbeddableSelector } = reduxContainerContext;

  // current state
  const { panels } = useEmbeddableSelector((state) => state);
  const [controlIds, setControlIds] = useState<string[]>([]);

  useEffect(() => {
    setControlIds((currentIds) => {
      // sync control Ids with panels from state.
      const newIds: string[] = [];
      const allIds = [...currentIds, ...Object.keys(panels)];
      allIds.forEach((id) => {
        const currentIndex = currentIds.indexOf(id);
        if (!panels[id] && currentIndex !== -1) {
          currentIds.splice(currentIndex, 1);
        }
        if (currentIndex === -1 && Boolean(panels[id])) {
          newIds.push(id);
        }
      });
      return [...currentIds, ...newIds];
    });
  }, [panels]);

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
              {controlIds.map(
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
