/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useGridLayoutContext } from '../../use_grid_layout_context';
import { useGridLayoutPanelEvents } from '../../use_grid_layout_events';
import type { UserInteractionEvent } from '../../../common/types';
import { useCustomDragHandles } from '../../../common/use_custom_drag_handles';

const DRAG_HANDLE_CLASS = 'kbnGridPanel--dragHandle';

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

  const setDragHandles = useCustomDragHandles({ startDrag, dragHandleClass: DRAG_HANDLE_CLASS });

  return {
    startDrag,
    setDragHandles: useCustomDragHandle ? setDragHandles : undefined,
  };
};
