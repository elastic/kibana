/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import uuid from 'uuid';

import './control_group.scss';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import classNames from 'classnames';
import { OptionsListEmbeddable, OptionsListEmbeddableFactory } from '../control_types/options_list';
import { FlightField, flightFieldLabels } from '../__stories__/flights';
import { ControlFrame, ControlFrameProps } from './control_frame/control_frame';
import { ManageControlGroupComponent } from './control_group_editor/manage_control_group_component';
import { ManageControlComponent } from './control_group_editor/manage_control';

interface OptionsListStorybookArgs {
  fields: string[];
  embeddableFactory: OptionsListEmbeddableFactory;
}

interface InputControlEmbeddableMap {
  [key: string]: OptionsListEmbeddable;
}

export type ControlWidth = 'auto' | 'small' | 'medium' | 'large';
export type ControlStyle = 'twoLine' | 'oneLine';

export interface InputControlMeta {
  id: string;
  width: ControlWidth;
  title: string;
}

// The clone of the control shown when dragging
const ControlDragClone = (frameProps: ControlFrameProps) => (
  <ControlFrame {...frameProps} dragInfo={{ isClone: true }} />
);

// A draggable wrapper around the InputControlFrame
const SortableControl = (frameProps: ControlFrameProps) => {
  const {
    embeddable: { id },
  } = frameProps;
  const {
    over,
    listeners,
    isSorting,
    transform,
    transition,
    attributes,
    isDragging,
    setNodeRef,
  } = useSortable({
    id,
    animateLayoutChanges: () => true,
  });

  return (
    <ControlFrame
      dragInfo={{ isOver: over?.id === id, isDragging, dragActive: isSorting }}
      ref={setNodeRef}
      {...frameProps}
      {...attributes}
      {...listeners}
      style={{
        transition: transition ?? undefined,
        transform: isSorting ? undefined : CSS.Translate.toString(transform),
      }}
    />
  );
};

export const ControlGroup = ({ fields, embeddableFactory }: OptionsListStorybookArgs) => {
  const [embeddablesMap, setEmbeddablesMap] = useState<InputControlEmbeddableMap>({});
  const [editingIndex, setEditingIndex] = useState<number>();

  const [controlMeta, setControlMeta] = useState<InputControlMeta[]>([]);
  const [controlStyle, setControlStyle] = useState<ControlStyle>('oneLine');

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const findIndexOfControlId = useCallback(
    (id: string) => controlMeta.findIndex((meta) => meta.id === id),
    [controlMeta]
  );

  const draggingIndex = useMemo(() => (draggingId ? findIndexOfControlId(draggingId) : -1), [
    findIndexOfControlId,
    draggingId,
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Temporary - load embeddables. This will be moved into embeddable container logic.
  useEffect(() => {
    const embeddableCreatePromises = fields.map((field) => {
      return embeddableFactory.create({
        field,
        id: uuid.v4(),
        indexPattern: '',
        multiSelect: true,
        title: flightFieldLabels[field as FlightField],
      });
    });
    Promise.all(embeddableCreatePromises).then((newEmbeddables) => {
      setEmbeddablesMap(
        newEmbeddables.reduce<InputControlEmbeddableMap>(
          (map, embeddable) => ((map[embeddable.id] = embeddable), map),
          {}
        )
      );
      setControlMeta(
        newEmbeddables.map((embeddable) => ({
          title: embeddable.getTitle(),
          id: embeddable.id,
          width: 'auto',
          grow: true,
        }))
      );
    });
  }, [fields, embeddableFactory]);

  const onDragEnd = ({ over }: DragEndEvent) => {
    if (over) {
      const overIndex = findIndexOfControlId(over.id);
      if (draggingIndex !== overIndex) {
        const newIndex = overIndex;
        setControlMeta((currentMeta) => arrayMove(currentMeta, draggingIndex, newIndex));
      }
    }
    setDraggingId(null);
  };

  return (
    <>
      <EuiFlexGroup direction="row" alignItems="center" wrap={false}>
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
            <SortableContext items={controlMeta} strategy={rectSortingStrategy}>
              <EuiFlexGroup
                alignItems="center"
                wrap={true}
                gutterSize={'s'}
                className={classNames('controlGroup', { 'controlGroup-isDragging': draggingId })}
              >
                {controlMeta.map((meta, index) => (
                  <SortableControl
                    onEdit={() => setEditingIndex(index)}
                    key={meta.id}
                    width={meta.width}
                    controlStyle={controlStyle}
                    embeddable={embeddablesMap[meta.id]}
                  />
                ))}
              </EuiFlexGroup>
            </SortableContext>
            <DragOverlay>
              {draggingId ? (
                <ControlDragClone
                  id={draggingId}
                  controlStyle={controlStyle}
                  embeddable={embeddablesMap[draggingId]}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ManageControlGroupComponent
            controlMeta={controlMeta}
            controlStyle={controlStyle}
            setControlMeta={setControlMeta}
            setControlStyle={setControlStyle}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {editingIndex && (
        <ManageControlComponent
          controlMeta={controlMeta[editingIndex]}
          index={editingIndex}
          setControlMeta={setControlMeta}
          onClose={() => setEditingIndex(undefined)}
        />
      )}
    </>
  );
};
