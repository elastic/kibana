/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { default as React, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { distinctUntilChanged } from 'rxjs';

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { BaseEventPayload, ElementDragType } from '@atlaskit/pragmatic-drag-and-drop/types';
import { EuiFlexGroup, EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ControlPanel } from './components/control_panel';
import { moveControlByStep, reorderControlsToIndex } from './components/drag_drop_reorder';
import {
  getDisplayPositions,
  getDropDestinationIndex,
  type ControlRect,
} from './components/drag_reflow';
import { useReflowAnimation } from './components/use_reflow_animation';
import type { ControlsLayout, ControlsRendererParentApi } from './types';
import { apiPublishesFocusedPanelId } from './utils';

/** The state of a pointer drag, measured when it started */
interface DragOrigin {
  /** Slots the controls occupied when the drag started; see `getDropDestinationIndex` */
  rects: ControlRect[];
  startIndex: number;
  /** Where in the dragged control the pointer took hold of it */
  grabOffset: { x: number; y: number };
  /** Where the group is currently showing the control landing */
  destinationIndex: number;
}

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
  const reorderInstructionsId = useId();

  const groupRef = useRef<HTMLUListElement | null>(null);
  const dragOrigin = useRef<DragOrigin | null>(null);
  /** The place each control takes while a drag is in progress, or `null` when there is not one */
  const [displayPositions, setDisplayPositions] = useState<number[] | null>(null);
  const captureLayout = useReflowAnimation(groupRef);

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
      // Deliberately not animated: a keyboard move is a discrete step the user asked for one press
      // at a time, so it reads better as an immediate swap than as a slide. Reordering by `id` keeps
      // the moved control's DOM node, so focus stays on its drag handle across the change.
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
    const group = groupRef.current;
    if (!group) return;

    const isReorderable = ({ source }: { source: { data: Record<string, unknown> } }) =>
      typeof source.data.id === 'string' && Boolean(controlState.controls[source.data.id]);

    /**
     * The slot the dragged control would take if it were dropped where the pointer is now, or
     * `null` when it would not be dropped into the group at all.
     */
    const resolveDestinationIndex = ({ location }: BaseEventPayload<ElementDragType>) => {
      const origin = dragOrigin.current;
      // Both a cancelled drag and a drop outside the group report no drop targets
      if (!origin || location.current.dropTargets.length === 0) return null;

      return getDropDestinationIndex({
        rects: origin.rects,
        startIndex: origin.startIndex,
        grabOffset: origin.grabOffset,
        pointer: { x: location.current.input.clientX, y: location.current.input.clientY },
      });
    };

    return combine(
      // A single target for the whole group, rather than one per control: which slot the control
      // lands in is decided by comparing it against the slots measured below, so all the drop
      // target has to say is whether the pointer is still somewhere the control can be dropped
      dropTargetForElements({ element: group, canDrop: isReorderable }),
      monitorForElements({
        canMonitor: isReorderable,
        onDragStart: ({ location, source }) => {
          // Measure once, up front: the group is about to rearrange itself around the drag, which
          // would make anything measured later describe the rearrangement rather than the layout
          const children = Array.from(group.children);
          const startIndex = children.indexOf(source.element);
          if (startIndex === -1) return;

          const rects = children.map((child) => child.getBoundingClientRect());
          const { clientX, clientY } = location.initial.input;
          dragOrigin.current = {
            rects,
            startIndex,
            grabOffset: {
              x: clientX - rects[startIndex].left,
              y: clientY - rects[startIndex].top,
            },
            destinationIndex: startIndex,
          };
          setDisplayPositions(children.map((_, index) => index));
        },
        onDrag: (args) => {
          const origin = dragOrigin.current;
          if (!origin) return;

          // `onDrag` fires on every pointer move, so only rearrange when the destination changes
          const destinationIndex = resolveDestinationIndex(args) ?? origin.startIndex;
          if (destinationIndex === origin.destinationIndex) return;
          origin.destinationIndex = destinationIndex;

          captureLayout();
          setDisplayPositions(
            getDisplayPositions({
              count: origin.rects.length,
              startIndex: origin.startIndex,
              destinationIndex,
            })
          );
        },
        onDrop: (args) => {
          const destinationIndex = resolveDestinationIndex(args);
          const sourceId = args.source.data.id;
          dragOrigin.current = null;

          const reordered =
            destinationIndex !== null && typeof sourceId === 'string'
              ? reorderControlsToIndex({
                  controls: controlState.controls,
                  sourceId,
                  destinationIndex,
                })
              : null;

          // A drop that reorders the controls lands them where the group has been showing them all
          // along, so there is nothing to animate. A drag that ends without one has to put them
          // back, and that is worth a slide.
          if (!reordered) captureLayout();

          setDisplayPositions(null);
          if (reordered) onControlsChanged({ controls: reordered });

          (document.activeElement as HTMLElement)?.blur(); // hide hover actions on drop; otherwise, they get stuck
        },
      })
    );
  }, [captureLayout, controlState.controls, onControlsChanged]);

  if (controlsInOrder.length === 0) {
    return null;
  }

  return (
    <>
      <EuiFlexGroup
        component="ul"
        ref={groupRef}
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
            control={control}
            displayPosition={displayPositions?.[index] ?? null}
            onKeyboardReorder={onKeyboardReorder}
            reorderInstructionsId={reorderInstructionsId}
          />
        ))}
      </EuiFlexGroup>
      <EuiScreenReaderOnly>
        {/* Shared usage instructions, referenced by every drag handle's `aria-describedby` */}
        <div id={reorderInstructionsId}>
          {i18n.translate('controls.controlGroup.ariaDescription.keyboardReorder', {
            defaultMessage:
              'Press the Left or Up arrow key to move this control earlier, or the Right or Down arrow key to move it later.',
          })}
        </div>
      </EuiScreenReaderOnly>
      <EuiScreenReaderOnly>
        <div aria-live="assertive">{announcement}</div>
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
