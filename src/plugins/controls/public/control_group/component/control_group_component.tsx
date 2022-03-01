/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import '../control_group.scss';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiButtonEmpty } from '@elastic/eui';
import React, { useMemo, useState, useCallback } from 'react';
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
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { ControlGroupInput } from '../types';
import { ViewMode } from '../../../../embeddable/public';
import { ControlGroupStrings } from '../control_group_strings';
import { CreateControlButton, CreateControlButtonTypes } from '../editor/create_control';
import { controlGroupReducers } from '../state/control_group_reducers';
import { ControlClone, SortableControl } from './control_group_sortable_item';
import { useReduxContainerContext } from '../../../../presentation_util/public';
import { ControlsIllustration } from './controls_illustration';

const CONTROLS_CALLOUT_STATE_KEY = 'dashboard:controlsCalloutDismissed';

export const ControlGroup = () => {
  const [controlsDismissed, setControlsDismissed] = useLocalStorage(
    CONTROLS_CALLOUT_STATE_KEY,
    false
  );
  const dismissControls = useCallback(() => {
    setControlsDismissed(true);
  }, [setControlsDismissed]);
  // Redux embeddable container Context
  const reduxContainerContext = useReduxContainerContext<
    ControlGroupInput,
    typeof controlGroupReducers
  >();
  const {
    useEmbeddableSelector,
    useEmbeddableDispatch,
    actions: { setControlOrders, setDefaultControlWidth },
    containerActions: { addNewEmbeddable },
  } = reduxContainerContext;
  const dispatch = useEmbeddableDispatch();

  // current state
  const { panels, viewMode, controlStyle, defaultControlWidth } = useEmbeddableSelector(
    (state) => state
  );

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

  const getCreateControlButton = (buttonType: CreateControlButtonTypes) => {
    return (
      <CreateControlButton
        buttonType={buttonType}
        defaultControlWidth={defaultControlWidth}
        updateDefaultWidth={(newDefaultControlWidth) =>
          dispatch(setDefaultControlWidth(newDefaultControlWidth))
        }
        addNewEmbeddable={(type, input) => addNewEmbeddable(type, input)}
      />
    );
  };

  return (
    <>
      {idsInOrder.length > 0 || !controlsDismissed ? (
        <EuiPanel
          borderRadius="m"
          color={panelBg}
          paddingSize={emptyState ? 's' : 'none'}
          className={classNames('controlsWrapper', {
            'controlsWrapper--empty': emptyState,
            'controlsWrapper--twoLine': controlStyle === 'twoLine',
          })}
        >
          {idsInOrder.length > 0 ? (
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
          ) : (
            <EuiFlexGroup alignItems="center" gutterSize="xs" data-test-subj="controls-empty">
              <EuiFlexItem grow={1} className="controlsIllustration__container">
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <ControlsIllustration />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    {' '}
                    <EuiText className="emptyStateText" size="s">
                      <p>{ControlGroupStrings.emptyState.getCallToAction()}</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{getCreateControlButton('callout')}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty size="s" onClick={dismissControls}>
                  {ControlGroupStrings.emptyState.getDismissButton()}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiPanel>
      ) : (
        <></>
      )}
    </>
  );
};
