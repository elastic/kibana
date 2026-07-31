/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { default as React, useCallback, useEffect, useMemo, useState } from 'react';
import { distinctUntilChanged } from 'rxjs';

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { BaseEventPayload, ElementDragType } from '@atlaskit/pragmatic-drag-and-drop/types';
import { EuiFlexGroup, EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ControlPanel } from './components/control_panel';
import {
  getDropIndicatorPosition,
  moveControlByStep,
  reorderControlsByEdge,
  type DropIndicatorPosition,
} from './components/drag_drop_reorder';
import type { ControlsLayout, ControlsRendererParentApi } from './types';
import { apiPublishesFocusedPanelId } from './utils';

export const ControlsRenderer = ({
  controls: controlState,
  onControlsChanged,
  parentApi,
}: {
  controls: ControlsLayout;
  onControlsChanged: (controls: ControlsLayout) => void;
  parentApi: ControlsRendererParentApi;
}) => {
  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorPosition | null>(null);

  const controlsInOrder: Array<ControlsLayout['controls'][string] & { id: string }> =
    useMemo(() => {
      return Object.entries(controlState.controls)
        .map(([id, control]) => {
          return { id, ...control };
        })
        .sort((controlA, controlB) => {
          return controlA.order - controlB.order;
        });
    }, [controlState]);

  useEffect(() => {
    if (parentApi && apiPublishesFocusedPanelId(parentApi)) {
      const focusedPanelIdSubscription = parentApi.focusedPanelId$
        .pipe(distinctUntilChanged())
        .subscribe((focusId) => setIsEditFlyoutOpen(Boolean(focusId)));
      return () => focusedPanelIdSubscription.unsubscribe();
    }
  }, [parentApi]);

  /** Keyboard-driven reordering, triggered from each control's drag handle */
  const onKeyboardReorder = useCallback(
    (id: string, direction: 'back' | 'forward') => {
      const result = moveControlByStep({
        controls: controlState.controls,
        id,
        offset: direction === 'back' ? -1 : 1,
      });
      if (!result) return;
      onControlsChanged({ controls: result.controls });
      setAnnouncement(
        i18n.translate('controls.controlGroup.ariaLive.controlMoved', {
          defaultMessage: 'Control moved to position {position} of {total}',
          values: { position: result.position + 1, total: result.total },
        })
      );
    },
    [controlState.controls, onControlsChanged]
  );

  /** Pointer drag-and-drop reordering, handled by a single monitor for the whole group */
  useEffect(() => {
    /** Reads the drop target under the pointer, or `null` when there is nothing droppable there */
    const readDropTarget = ({ location, source }: BaseEventPayload<ElementDragType>) => {
      const target = location.current.dropTargets[0];
      if (!target) return null;

      const sourceId = source.data.id;
      const targetId = target.data.id;
      if (typeof sourceId !== 'string' || typeof targetId !== 'string') return null;

      return { sourceId, targetId, closestEdge: extractClosestEdge(target.data) };
    };

    return monitorForElements({
      canMonitor: ({ source }) =>
        typeof source.data.id === 'string' && Boolean(controlState.controls[source.data.id]),
      onDrag: (args) => {
        const dropTarget = readDropTarget(args);
        const next = dropTarget
          ? getDropIndicatorPosition({ controls: controlState.controls, ...dropTarget })
          : null;

        // `onDrag` fires on every pointer move, so only re-render when the slot itself changes
        setDropIndicator((current) =>
          current?.index === next?.index && current?.edge === next?.edge ? current : next
        );
      },
      onDrop: (args) => {
        setDropIndicator(null);

        const dropTarget = readDropTarget(args);
        if (!dropTarget) return;

        const result = reorderControlsByEdge({ controls: controlState.controls, ...dropTarget });
        if (result) {
          onControlsChanged({ controls: result });
        }

        (document.activeElement as HTMLElement)?.blur(); // hide hover actions on drop; otherwise, they get stuck
      },
    });
  }, [controlState.controls, onControlsChanged]);

  if (controlsInOrder.length === 0) {
    return null;
  }

  return (
    <>
      <EuiFlexGroup
        component="ul"
        className={`controlGroup ${isEditFlyoutOpen ? 'controlsGroup--editing' : ''}`}
        css={controlsGroupStyles.controlsGroup}
        alignItems="center"
        gutterSize="s"
        wrap={true}
        data-test-subj="controls-group-wrapper"
      >
        {controlsInOrder.map((control, index) => (
          <ControlPanel
            key={control.id}
            parentApi={parentApi}
            control={{
              ...control,
              id: control.id!,
            }}
            dropIndicatorEdge={dropIndicator?.index === index ? dropIndicator.edge : null}
            onKeyboardReorder={onKeyboardReorder}
          />
        ))}
      </EuiFlexGroup>
      <EuiScreenReaderOnly>
        <div aria-live="assertive" role="status">
          {announcement}
        </div>
      </EuiScreenReaderOnly>
    </>
  );
};

const controlsGroupStyles = {
  controlsGroup: css({
    '&.controlsGroup--editing .controlFrameFloatingActions': {
      visibility: 'hidden !important' as 'hidden',
    },
  }),
};
