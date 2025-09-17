/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, useState } from 'react';

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
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-constants';
import type { ControlsGroupState } from '@kbn/controls-schemas';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasSerializedChildState, PresentationContainer } from '@kbn/presentation-containers';
import type {
  PublishesDisabledActionIds,
  PublishesTitle,
  PublishesViewMode,
} from '@kbn/presentation-publishing';

import { ControlClone } from './components/control_clone';
import { ControlPanel } from './components/control_panel';
import { css } from '@emotion/react';
import classNames from 'classnames';

export const ControlsRenderer = ({
  parentApi,
  getInitialState,
}: {
  parentApi: PresentationContainer &
    PublishesViewMode &
    HasSerializedChildState<ControlsGroupState['controls'][number] & { order: number }> &
    Partial<PublishesDisabledActionIds> & {
      registerChildApi: (api: DefaultEmbeddableApi) => void;
    };
  getInitialState: () => {
    controls: { [controlId: string]: ControlsGroupState['controls'][number] & { order: number } };
    compressed?: boolean;
  };
}) => {
  const controlPanelRefs = useRef<{ [id: string]: HTMLElement | null }>({});
  const setControlPanelRef = useCallback((id: string, ref: HTMLElement | null) => {
    controlPanelRefs.current = { ...controlPanelRefs.current, [id]: ref };
  }, []);

  const [controlsInOrder, setControlsInOrder] = useState(
    Object.values(getInitialState().controls).sort((controlA, controlB) => {
      return controlA.order - controlB.order;
    })
  );
  /** Handle drag and drop */
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const onDragEnd = useCallback(
    ({ over, active }: DragEndEvent) => {
      console.log('HERE 2!!!');
      const oldIndex = active?.data.current?.sortable.index;
      const newIndex = over?.data.current?.sortable.index;
      if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
        setControlsInOrder(arrayMove([...controlsInOrder], oldIndex, newIndex));
      }
      (document.activeElement as HTMLElement)?.blur(); // hide hover actions on drop; otherwise, they get stuck
      setDraggingId(null);
    },
    [controlsInOrder]
  );

  if (controlsInOrder.length === 0) {
    return null;
  }

  return (
    <DndContext
      onDragStart={({ active }) => {
        console.log('HERE!!!!', { active });
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
          className={'controlGroup'}
          alignItems="center"
          gutterSize="s"
          wrap={true}
          css={css({
            padding: '8px',
            paddingTop: '0',
          })}
          data-test-subj="controls-group-wrapper"
        >
          {controlsInOrder.map(({ id, type, grow, width }) => (
            <ControlPanel
              key={id}
              type={type}
              uuid={id!}
              grow={grow ?? DEFAULT_CONTROL_GROW}
              width={width ?? DEFAULT_CONTROL_WIDTH}
              parentApi={parentApi}
              compressed={getInitialState().compressed ?? true}
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
