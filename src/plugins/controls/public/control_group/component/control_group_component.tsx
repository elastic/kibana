/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import '../control_group.scss';

import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';
import { TypedUseSelectorHook, useSelector } from 'react-redux';

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
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTourStep,
} from '@elastic/eui';
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
  const showAddButton = contextSelect((state) => state.componentState.showAddButton);
  const controlWithInvalidSelectionsId = contextSelect(
    (state) => state.componentState.controlWithInvalidSelectionsId
  );
  const [tourStepOpen, setTourStepOpen] = useState<boolean>(true);
  const [suppressTourChecked, setSuppressTourChecked] = useState<boolean>(false);
  const [renderTourStep, setRenderTourStep] = useState(false);

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

  useEffect(() => {
    /**
     * This forces the tour step to get unmounted so that it can attach to the new invalid
     * control - otherwise, the anchor will remain attached to the old invalid control
     */
    setRenderTourStep(false);
    setTimeout(() => setRenderTourStep(true), 100);
  }, [controlWithInvalidSelectionsId]);

  const tourStep = useMemo(() => {
    if (
      !renderTourStep ||
      !controlGroup.canShowInvalidSelectionsWarning() ||
      !tourStepOpen ||
      !controlWithInvalidSelectionsId
    ) {
      return null;
    }
    const invalidControlType = panels[controlWithInvalidSelectionsId].type;

    return (
      <EuiTourStep
        step={1}
        stepsTotal={1}
        minWidth={300}
        maxWidth={300}
        display="block"
        isStepOpen={true}
        repositionOnScroll
        onFinish={() => {}}
        panelPaddingSize="m"
        anchorPosition="downCenter"
        panelClassName="controlGroup--invalidSelectionsTour"
        anchor={`#controlFrame--${controlWithInvalidSelectionsId}`}
        title={
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="warning" color="warning" />
            </EuiFlexItem>
            <EuiFlexItem>{ControlGroupStrings.invalidControlWarning.getTourTitle()}</EuiFlexItem>
          </EuiFlexGroup>
        }
        content={ControlGroupStrings.invalidControlWarning.getTourContent(invalidControlType)}
        footerAction={[
          <EuiCheckbox
            compressed
            checked={suppressTourChecked}
            id={'controlGroup--suppressTourCheckbox'}
            className="controlGroup--suppressTourCheckbox"
            onChange={(e) => setSuppressTourChecked(e.target.checked)}
            label={
              <EuiText size="xs" className="controlGroup--suppressTourCheckboxLabel">
                {ControlGroupStrings.invalidControlWarning.getSuppressTourLabel()}
              </EuiText>
            }
          />,
          <EuiButtonEmpty
            size="xs"
            flush="right"
            color="text"
            onClick={() => {
              setTourStepOpen(false);
              if (suppressTourChecked) {
                controlGroup.suppressInvalidSelectionsWarning();
              }
            }}
          >
            {ControlGroupStrings.invalidControlWarning.getDismissButton()}
          </EuiButtonEmpty>,
        ]}
      />
    );
  }, [
    panels,
    controlGroup,
    tourStepOpen,
    renderTourStep,
    suppressTourChecked,
    controlWithInvalidSelectionsId,
  ]);

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
            gutterSize="m"
            direction="row"
            responsive={false}
            alignItems="center"
            data-test-subj="controls-group"
          >
            {tourStep}
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
