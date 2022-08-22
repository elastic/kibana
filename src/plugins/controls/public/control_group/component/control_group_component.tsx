/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { useMemo, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  LayoutMeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { useReduxContainerContext } from '@kbn/presentation-util-plugin/public';

import { controlGroupReducers } from '../control_group_reducers';
import { ControlGroupReduxState } from '../types';
import { SortableControl } from './control_group_sortable_control';
import { ControlClone } from './control_group_control_clone';

import '../control_group.scss';

export const ControlGroup = () => {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Redux embeddable container Context
  const reduxContainerContext = useReduxContainerContext<
    ControlGroupReduxState,
    typeof controlGroupReducers
  >();
  const {
    actions: { setControlOrders },
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
  } = reduxContainerContext;
  const dispatch = useEmbeddableDispatch();

  // current state
  const controlStyle = select((state) => state.explicitInput.controlStyle);
  const panels = select((state) => state.explicitInput.panels);
  const viewMode = select((state) => state.explicitInput.viewMode);

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

  let panelBg: 'transparent' | 'plain' | 'success' = 'transparent';
  if (emptyState) panelBg = 'plain';
  if (draggingId) panelBg = 'success';

  return (
    <>
      {idsInOrder.length > 0 ? (
        <EuiPanel
          borderRadius="m"
          className={classNames('controlsWrapper', {
            'controlsWrapper--empty': emptyState,
            'controlsWrapper--twoLine': controlStyle === 'twoLine',
          })}
          color={panelBg}
          data-test-subj="controls-group-wrapper"
          paddingSize={emptyState ? 's' : 'none'}
        >
          <EuiFlexGroup
            alignItems="center"
            data-test-subj="controls-group"
            direction="row"
            gutterSize="m"
            responsive={false}
            wrap={false}
          >
            <EuiFlexItem>
              <DndContext
                collisionDetection={closestCenter}
                layoutMeasuring={{
                  strategy: LayoutMeasuringStrategy.Always,
                }}
                onDragCancel={() => setDraggingId(null)}
                onDragEnd={onDragEnd}
                onDragStart={({ active }) => setDraggingId(active.id)}
                sensors={sensors}
              >
                <SortableContext items={idsInOrder} strategy={rectSortingStrategy}>
                  <EuiFlexGroup
                    alignItems="center"
                    className={classNames('controlGroup', {
                      'controlGroup-isDragging': draggingId,
                    })}
                    gutterSize="s"
                    wrap={true}
                  >
                    {idsInOrder.map(
                      (controlId, index) =>
                        panels[controlId] && (
                          <SortableControl
                            dragInfo={{ index, draggingIndex }}
                            embeddableId={controlId}
                            embeddableType={panels[controlId].type}
                            isEditable={isEditable}
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
