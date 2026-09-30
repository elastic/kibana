/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';

import { useGridLayoutContext } from '../../use_grid_layout_context';
import { useGridLayoutPanelEvents } from '../../use_grid_layout_events';
import type { UserInteractionEvent } from '../../use_grid_layout_events/types';

/** Add this attribute to an element inside a drag handle to prevent it from starting a drag */
const NO_DRAG_ATTRIBUTE = 'data-kbn-grid-no-drag';

const TEXT_INPUT_SELECTOR = `input, textarea, select, [contenteditable="true"], [${NO_DRAG_ATTRIBUTE}]`;
const INTERACTIVE_SELECTOR = `${TEXT_INPUT_SELECTOR}, button, a`;

/**
 * Drag handles can contain interactive elements (e.g. an inline editable panel title).
 * Interacting with a form field should never start a drag, and keyboard events on nested
 * buttons or links should activate them rather than start a keyboard drag.
 */
const isFromNestedInteractiveElement = (e: Event) => {
  const target = e.target;
  if (!(target instanceof Element) || target === e.currentTarget) return false;
  return Boolean(target.closest(e.type === 'keydown' ? INTERACTIVE_SELECTOR : TEXT_INPUT_SELECTOR));
};

export interface DragHandleApi {
  startDrag: (e: UserInteractionEvent) => void;
  setDragHandles?: (refs: Array<HTMLElement | null>) => void;
}

export const useDragHandleApi = ({
  panelId,
  sectionId,
}: {
  panelId: string;
  sectionId?: string;
}): DragHandleApi => {
  const { useCustomDragHandle } = useGridLayoutContext();

  const startDrag = useGridLayoutPanelEvents({
    interactionType: 'drag',
    panelId,
    sectionId,
  });

  const removeEventListenersRef = useRef<(() => void) | null>(null);

  const setDragHandles = useCallback(
    (dragHandles: Array<HTMLElement | null>) => {
      /**
       * if new `startDrag` reference (which happens when, for example, panels change sections),
       * then clean up the old event listeners
       */
      removeEventListenersRef.current?.();

      const onDragStart = (e: Event) => {
        if (isFromNestedInteractiveElement(e)) return;
        startDrag(e as UserInteractionEvent);
      };

      for (const handle of dragHandles) {
        if (handle === null) return;
        handle.addEventListener('mousedown', onDragStart, { passive: true });
        handle.addEventListener('touchstart', onDragStart, { passive: true });
        handle.addEventListener('keydown', onDragStart);
        handle.classList.add('kbnGridPanel--dragHandle');
      }
      removeEventListenersRef.current = () => {
        for (const handle of dragHandles) {
          if (handle === null) return;
          handle.removeEventListener('mousedown', onDragStart);
          handle.removeEventListener('touchstart', onDragStart);
          handle.removeEventListener('keydown', onDragStart);
        }
      };
    },
    [startDrag]
  );

  useEffect(
    () => () => {
      // on unmount, remove all drag handle event listeners
      removeEventListenersRef.current?.();
    },
    []
  );

  return {
    startDrag,
    setDragHandles: useCustomDragHandle ? setDragHandles : undefined,
  };
};
