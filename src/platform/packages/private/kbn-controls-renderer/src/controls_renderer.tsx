/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { distinctUntilChanged, map } from 'rxjs';

import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { EuiFlexGroup } from '@elastic/eui';

import { ControlClone } from './components/control_clone';
import { ControlPanel } from './components/control_panel';
import type { ControlsRendererParentApi, ControlsLayout } from './types';

export const ControlsRenderer = ({ parentApi }: { parentApi: ControlsRendererParentApi }) => {
  const controlPanelRefs = useRef<{ [id: string]: HTMLElement | null }>({});
  const setControlPanelRef = useCallback((id: string, ref: HTMLElement | null) => {
    controlPanelRefs.current = { ...controlPanelRefs.current, [id]: ref };
  }, []);

  const [controlState, setControlState] = useState(parentApi.layout$.getValue().controls);

  const controlsInOrder: Array<ControlsLayout['controls'][string] & { id: string }> =
    useMemo(() => {
      return Object.entries(controlState)
        .map(([id, control]) => {
          return { id, ...control };
        })
        .sort((controlA, controlB) => {
          return controlA.order - controlB.order;
        });
    }, [controlState]);

  useEffect(() => {
    const layoutSubscription = parentApi.layout$
      .pipe(
        map(({ controls }) => controls),
        distinctUntilChanged(deepEqual)
      )
      .subscribe((controls) => {
        setControlState(controls);
      });

    return () => {
      layoutSubscription.unsubscribe();
    };
  }, [parentApi]);

  /** Handle drag and drop */
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const onDragEnd = useCallback(
    ({ over, active }: DragEndEvent) => {
      const oldIndex = active?.data.current?.sortable.index;
      const newIndex = over?.data.current?.sortable.index;
      if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
        const result = arrayMove([...controlsInOrder], oldIndex, newIndex);
        parentApi.layout$.next({
          ...parentApi.layout$.getValue(),
          // based on the result of `arrayMove`, assign the order to each control
          controls: result.reduce((prev, control, index) => {
            const { id, ...rest } = control;
            return { ...prev, [id!]: { ...rest, order: index } };
          }, {}),
        });
      }
      (document.activeElement as HTMLElement)?.blur(); // hide hover actions on drop; otherwise, they get stuck
      setDraggingId(null);
    },
    [parentApi.layout$, controlsInOrder]
  );

  if (controlsInOrder.length === 0) {
    return null;
  }

  return (
    <DndContext
      onDragStart={({ active }) => {
        setDraggingId(`${active.id}`);
      }}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingId(null)}
      sensors={sensors}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.BeforeDragging,
        },
      }}
    >
      <SortableContext items={controlsInOrder} strategy={rectSortingStrategy}>
        <EuiFlexGroup
          component="ul"
          className="controlGroup"
          alignItems="center"
          gutterSize="s"
          wrap={true}
          data-test-subj="controls-group-wrapper"
        >
          {controlsInOrder.map(({ id, type }) => (
            <ControlPanel
              key={id}
              type={type}
              uuid={id!}
              parentApi={parentApi}
              setControlPanelRef={setControlPanelRef}
            />
          ))}
        </EuiFlexGroup>
      </SortableContext>
      <DragOverlay>
        {draggingId ? (
          <ControlClone
            key={draggingId}
            state={parentApi.getSerializedStateForChild(draggingId)}
            width={controlPanelRefs.current[draggingId]?.getBoundingClientRect().width}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
