/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import '../control_group.scss';

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
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import classNames from 'classnames';
import React, { useMemo, useState } from 'react';
import { TypedUseSelectorHook, useSelector } from 'react-redux';

import { ViewMode } from '@kbn/embeddable-plugin/public';

import { ControlGroupStrings } from '../control_group_strings';
import { useControlGroupContainer } from '../embeddable/control_group_container';
import { ControlGroupReduxState } from '../types';
import { ControlClone, SortableControl } from './control_group_sortable_item';

const contextSelect = useSelector as TypedUseSelectorHook<ControlGroupReduxState>;

export const ControlGroup = () => {
  const controlGroup = useControlGroupContainer();

  // current state

  const panels = contextSelect((state) => state.explicitInput.panels);
  const viewMode = contextSelect((state) => state.explicitInput.viewMode);
  const controlStyle = contextSelect((state) => state.explicitInput.controlStyle);
  const showSelectionReset = contextSelect((state) => state.explicitInput.showSelectionReset);
  const showApplySelections = contextSelect((state) => state.explicitInput.showApplySelections);

  const showAddButton = contextSelect((state) => state.componentState.showAddButton);
  const unpublishedFilters = contextSelect((state) => state.componentState.unpublishedFilters);

  const applyResetButtonsEnabled = useMemo(() => {
    return Boolean(unpublishedFilters); // if undefined, no unpublished filters; otherwise, there exists unpublished filters
  }, [unpublishedFilters]);

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
        controlGroup.dispatch.setControlOrders({
          ids: arrayMove([...idsInOrder], draggingIndex, newIndex),
        });
      }
    }
    (document.activeElement as HTMLElement)?.blur();
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
            gutterSize="s"
            direction="row"
            responsive={false}
            alignItems="stretch"
            justifyContent="center"
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
            {(showAddButton || showSelectionReset || showApplySelections) && (
              <EuiFlexItem className="controlGroup--endButtonGroup" grow={false}>
                <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                  {showAddButton && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        size="m"
                        iconSize="m"
                        display="base"
                        iconType={'plusInCircle'}
                        aria-label={ControlGroupStrings.management.getAddControlTitle()}
                        onClick={() => controlGroup.openAddDataControlFlyout()}
                      />
                    </EuiFlexItem>
                  )}
                  {showSelectionReset && (
                    <EuiFlexItem>
                      <EuiButtonIcon
                        size="m"
                        disabled={!applyResetButtonsEnabled}
                        iconSize="m"
                        display="base"
                        color={'danger'}
                        iconType={'refresh'}
                        aria-label={ControlGroupStrings.management.getAddControlTitle()}
                        onClick={() => controlGroup.resetSelections()}
                      />
                    </EuiFlexItem>
                  )}
                  {showApplySelections && (
                    <EuiFlexItem>
                      <EuiButtonIcon
                        size="m"
                        disabled={!applyResetButtonsEnabled}
                        iconSize="m"
                        display="fill"
                        color={'success'}
                        iconType={'check'}
                        aria-label={ControlGroupStrings.management.getAddControlTitle()}
                        onClick={() => controlGroup.publishFilters({ filters: unpublishedFilters })}
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
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
