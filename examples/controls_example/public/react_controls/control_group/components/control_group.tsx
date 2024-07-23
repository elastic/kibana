/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
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
import { EuiFlexGroup, EuiLoadingChart, EuiPanel } from '@elastic/eui';
import { ControlStyle } from '@kbn/controls-plugin/public';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { ControlsInOrder } from '../init_controls_manager';
import { ControlGroupApi } from '../types';
import { ControlRenderer } from '../../control_renderer';
import { ControlClone } from '../../components/control_clone';
import { DefaultControlApi } from '../../types';

interface Props {
  controlGroupApi: ControlGroupApi;
  controlsManager: {
    controlsInOrder$: BehaviorSubject<ControlsInOrder>;
    getControlApi: (uuid: string) => DefaultControlApi | undefined;
    setControlApi: (uuid: string, controlApi: DefaultControlApi) => void;
  };
  labelPosition: ControlStyle;
}

export function ControlGroup({ controlGroupApi, controlsManager, labelPosition }: Props) {
  const [isInitialized, setIsInitialized] = useState(false);
  const controlsInOrder = useStateFromPublishingSubject(controlsManager.controlsInOrder$);

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
        controlsManager.controlsInOrder$.next(arrayMove([...controlsInOrder], oldIndex, newIndex));
      }
      (document.activeElement as HTMLElement)?.blur(); // hide hover actions on drop; otherwise, they get stuck
      setDraggingId(null);
    },
    [controlsInOrder, controlsManager.controlsInOrder$]
  );

  useEffect(() => {
    let ignore = false;
    controlGroupApi.untilInitialized().then(() => {
      if (!ignore) {
        setIsInitialized(true);
      }
    });

    return () => {
      ignore = true;
    };
  }, [controlGroupApi]);

  return (
    <EuiPanel borderRadius="m" paddingSize="none" color={draggingId ? 'success' : 'transparent'}>
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap={true}>
        {!isInitialized && <EuiLoadingChart />}
        <DndContext
          onDragStart={({ active }) => setDraggingId(`${active.id}`)}
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
            {controlsInOrder.map(({ id, type }) => (
              <ControlRenderer
                key={id}
                uuid={id}
                type={type}
                getParentApi={() => controlGroupApi}
                onApiAvailable={(controlApi) => {
                  controlsManager.setControlApi(id, controlApi);
                }}
                isControlGroupInitialized={isInitialized}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {draggingId ? (
              <ControlClone
                key={draggingId}
                labelPosition={labelPosition}
                controlApi={controlsManager.getControlApi(draggingId)}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
