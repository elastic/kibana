/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import '../control_group.scss';

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
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
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { useReduxContainerContext } from '@kbn/presentation-util-plugin/public';
import { ControlGroupInput } from '../types';
import { controlGroupReducers } from '../state/control_group_reducers';
import { ControlClone, SortableControl } from './control_group_sortable_item';

export const ControlGroup = () => {
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
  const { panels, viewMode, controlStyle } = useEmbeddableSelector((state) => state);

  const isEditable = viewMode === ViewMode.EDIT;

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

  const emptyState = !(idsInOrder && idsInOrder.length > 0);
  // Empty, non-editable view is null
  if (!isEditable && emptyState) {
    return null;
  }

  let panelBg: 'subdued' | 'plain' | 'success' = 'subdued';
  if (emptyState) panelBg = 'plain';
  if (draggingId) panelBg = 'success';

  return (
    <>
      {idsInOrder.length > 0 ? (
        <EuiPanel
          borderRadius="m"
          color={panelBg}
          paddingSize={emptyState ? 's' : 'none'}
          data-test-subj="controls-group-wrapper"
          className={classNames('controlsWrapper', {
            'controlsWrapper--empty': emptyState,
            'controlsWrapper--twoLine': controlStyle === 'twoLine',
          })}
        >
          <EuiFlexGroup
            wrap={false}
            gutterSize="m"
            direction="row"
            responsive={false}
            alignItems="center"
            data-test-subj="controls-group"
            data-shared-items-count={idsInOrder.length}
          >
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
                    className={classNames('controlGroup', {
                      'controlGroup-isDragging': draggingId,
                    })}
                    alignItems="center"
                    gutterSize="s"
                    wrap={true}
                  >
                    {idsInOrder.map(
                      (controlId, index) =>
                        panels[controlId] && (
                          <SortableControl
                            isEditable={isEditable}
                            dragInfo={{ index, draggingIndex }}
                            embeddableId={controlId}
                            key={controlId}
                          />
                        )
                    )}
                  </EuiFlexGroup>
                </SortableContext>
                <DragOverlay>
                  {draggingId ? <ControlClone draggingId={draggingId} /> : null}
                </DragOverlay>
              </DndContext>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      ) : (
        <></>
      )}
    </>
  );
};
