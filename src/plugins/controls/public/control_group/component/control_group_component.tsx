/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import '../control_group.scss';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
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
import { ControlClone, SortableControl } from './control_group_sortable_item';
import { useControlGroupContainerContext } from '../control_group_renderer';
import { ControlGroupStrings } from '../control_group_strings';

export const ControlGroup = () => {
  // Redux embeddable container Context
  const reduxContext = useControlGroupContainerContext();
  const {
    embeddableInstance: controlGroup,
    actions: { setControlOrders },
    useEmbeddableSelector: select,
    useEmbeddableDispatch,
  } = reduxContext;
  const dispatch = useEmbeddableDispatch();

  // current state
  const panels = select((state) => state.explicitInput.panels);
  const viewMode = select((state) => state.explicitInput.viewMode);
  const controlStyle = select((state) => state.explicitInput.controlStyle);
  const showAddButton = select((state) => state.componentState.showAddButton);

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

  let panelBg: 'transparent' | 'plain' | 'success' = 'transparent';
  if (emptyState) panelBg = 'plain';
  if (draggingId) panelBg = 'success';

  return (
    <>
      {idsInOrder.length > 0 || showAddButton ? (
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
                            embeddableType={panels[controlId].type}
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
            {showAddButton && (
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  size="s"
                  iconSize="m"
                  display="base"
                  iconType={'plusInCircle'}
                  aria-label={ControlGroupStrings.management.getAddControlTitle()}
                  onClick={() => controlGroup.openAddDataControlFlyout()}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      ) : (
        <></>
      )}
    </>
  );
};
