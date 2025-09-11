/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';

import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ControlState } from '@kbn/controls-schemas';
import type { HasSerializedChildState } from '@kbn/presentation-containers';

import { ControlPanel } from './components/control_panel';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-constants';

export const ControlsRenderer = ({
  parentApi,
  getInitialState,
}: {
  parentApi: HasSerializedChildState<object>;
  getInitialState: () => {
    [controlId: string]: ControlState;
  };
}) => {
  console.log({ parentApi });
  const controlsInOrder = Object.values(getInitialState()).sort((controlA, controlB) => {
    return controlA.order - controlB.order;
  });

  /** Handle drag and drop */
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const onDragEnd = useCallback(({ over, active }: DragEndEvent) => {
    // const oldIndex = active?.data.current?.sortable.index;
    // const newIndex = over?.data.current?.sortable.index;
    // if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
    //   controlsManager.controlsInOrder$.next(arrayMove([...controlsInOrder], oldIndex, newIndex));
    // }
    // (document.activeElement as HTMLElement)?.blur(); // hide hover actions on drop; otherwise, they get stuck
    // setDraggingId(null);
  }, []);

  if (controlsInOrder.length === 0) {
    return null;
  }

  return (
    <EuiPanel
      borderRadius="m"
      paddingSize="none"
      color={draggingId ? 'success' : 'transparent'}
      className="controlsWrapper"
      data-test-subj="controls-group-wrapper"
    >
      <EuiFlexGroup
        gutterSize="s"
        direction="row"
        responsive={false}
        data-test-subj="controls-group"
      >
        <EuiFlexItem>
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
              <EuiFlexGroup
                component="ul"
                className="controlGroup"
                alignItems="center"
                gutterSize="s"
                wrap={true}
              >
                {controlsInOrder.map(({ id, type, grow, width }) => (
                  <ControlPanel
                    key={id}
                    type={type}
                    uuid={id!}
                    grow={grow ?? DEFAULT_CONTROL_GROW}
                    width={width ?? DEFAULT_CONTROL_WIDTH}
                    parentApi={parentApi}
                  />
                ))}
              </EuiFlexGroup>
            </SortableContext>
            {/* <DragOverlay>
              {draggingId ? (
                <ControlClone
                  key={draggingId}
                  labelPosition={labelPosition}
                  controlApi={controlsManager.getControlApi(draggingId)}
                />
              ) : null}
            </DragOverlay> */}
          </DndContext>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  // return Object.values(getInitialState()).map((control) => (
  //   <EmbeddableRenderer
  //     key={control.id}
  //     maybeId={control.id}
  //     type={control.type}
  //     getParentApi={() => parentApi}
  //     onApiAvailable={(api) => {
  //       // console.log('REFIST', parentApi.registerChildApi);
  //       parentApi.registerChildApi(api);
  //     }}
  //     hidePanelChrome
  //   />
  // ));
};
