/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState, type FC } from 'react';
import { css } from '@emotion/react';

import type { DragStart, DropResult } from '@elastic/eui';
import { EuiDragDropContext, EuiDroppable, useEuiTheme } from '@elastic/eui';

/** Unique identifier for the droppable zone containing tabs */
const DROPPABLE_ID = 'unifiedTabsOrder';

/**
 * Styling for the droppable container.
 * Uses flexbox to align tabs horizontally without wrapping.
 */
const droppableCss = css`
  display: flex;
  align-items: center;
  wrap: no-wrap;
`;

interface DroppableWrapperProps {
  /** Content to render inside the droppable zone */
  children: React.ReactNode;
  /** When false, wraps children with drag-drop context; when true, renders as plain div */
  disableDragAndDrop: boolean;
  /** Callback fired when a drag operation starts */
  onDragStart: (start: DragStart) => void;
  /** Callback fired when a drag operation completes with new ordering */
  onDragEnd: (result: DropResult) => void;
}

/**
 * OptionalDroppable - Conditionally provides drag-and-drop context for the tabs
 *
 * When drag-and-drop is disabled, renders children in a plain div with consistent styling.
 * When enabled, wraps children with EuiDragDropContext and EuiDroppable.
 * Used as the parent container for OptionalDraggable items. The droppable context
 * enables reordering of tabs when drag-and-drop is enabled.
 */
export const OptionalDroppable: FC<DroppableWrapperProps> = ({
  children,
  disableDragAndDrop,
  onDragStart: originalOnDragStart,
  onDragEnd: originalOnDragEnd,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isDragging, setIsDragging] = useState(false);

  const draggingCss = useMemo(
    () => css`
      .unifiedTabs__tabWithBackground {
        pointer-events: none;
      }

      .unifiedTabs__tabWithBackground:not(.unifiedTabs__tabWithBackground--selected) {
        background-color: transparent;

        &::before {
          background-color: ${euiTheme.colors.accentSecondary};
        }
      }
    `,
    [euiTheme.colors.accentSecondary]
  );

  const onDragStart = useCallback(
    (start: DragStart) => {
      setIsDragging(true);
      originalOnDragStart(start);
    },
    [originalOnDragStart]
  );

  const onDragEnd = useCallback(
    (result: DropResult) => {
      setIsDragging(false);
      originalOnDragEnd(result);
    },
    [originalOnDragEnd]
  );

  // When drag-and-drop is disabled, render children in a plain flex container
  if (disableDragAndDrop) {
    return (
      <div css={droppableCss} data-test-subj="unifiedTabs_droppable_disabled">
        {children}
      </div>
    );
  }

  // When enabled, provide drag-drop context and droppable zone
  return (
    <EuiDragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <EuiDroppable
        droppableId={DROPPABLE_ID}
        direction="horizontal"
        css={[droppableCss, isDragging && draggingCss]}
        grow
        data-test-subj="unifiedTabs_droppable_enabled"
      >
        {() => <>{children}</>}
      </EuiDroppable>
    </EuiDragDropContext>
  );
};
