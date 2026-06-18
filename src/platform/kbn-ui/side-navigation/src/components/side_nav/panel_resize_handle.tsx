/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, KeyboardEvent, MouseEvent, TouchEvent } from 'react';
import React, { useCallback, useRef, useState } from 'react';
import { EuiResizableButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

import {
  getSidePanelDragIndicatorState,
  MIN_SIDE_PANEL_WIDTH,
  type SidePanelDragIndicatorState,
} from '../../utils/side_panel_width_utils';
import { SidePanelResizeIndicator } from './panel_resize_indicator';

const resizeButtonStyles = css`
  flex-shrink: 0;
`;

const resizeButtonDraggingStyles = css`
  &::before,
  &::after {
    opacity: 0;
  }

  &:focus,
  &:active {
    background-color: transparent;
  }
`;

const KEYBOARD_RESIZE_STEP = 10;

interface DragIndicatorBounds extends SidePanelDragIndicatorState {
  top: number;
  height: number;
}

export interface SidePanelResizeHandleProps {
  width: number;
  onDragWidthChange: (rawWidth: number) => void;
  onDragWidthCommit: (rawWidth: number) => boolean;
  onCollapse: () => void;
  onWidthChange: (width: number) => void;
}

/**
 * Resize handle for the secondary navigation side panel.
 *
 * Designed for panels on the left side of the viewport, where dragging right
 * increases width and dragging left decreases width. Dragging past the minimum
 * width applies elastic resistance; releasing far enough past the minimum collapses
 * the panel.
 */
export const SidePanelResizeHandle: FC<SidePanelResizeHandleProps> = ({
  width,
  onDragWidthChange,
  onDragWidthCommit,
  onCollapse,
  onWidthChange,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const lastRawWidthRef = useRef<number>(width);
  const dragBoundsRef = useRef<{ top: number; height: number }>({ top: 0, height: 0 });
  const [dragIndicator, setDragIndicator] = useState<DragIndicatorBounds | null>(null);

  const clearDragIndicator = useCallback(() => {
    setDragIndicator(null);
  }, []);

  const updateDragIndicator = useCallback((clientX: number, rawWidth: number) => {
    const indicatorState = getSidePanelDragIndicatorState(
      rawWidth,
      startXRef.current,
      startWidthRef.current,
      clientX
    );

    setDragIndicator({
      ...indicatorState,
      top: dragBoundsRef.current.top,
      height: dragBoundsRef.current.height,
    });
  }, []);

  const finishDrag = useCallback(() => {
    buttonRef.current?.blur();
    clearDragIndicator();
    if (onDragWidthCommit(lastRawWidthRef.current)) {
      onCollapse();
    }
  }, [clearDragIndicator, onCollapse, onDragWidthCommit]);

  const beginDrag = useCallback(
    (clientX: number) => {
      if (buttonRef.current) {
        const { top, height } = buttonRef.current.getBoundingClientRect();
        dragBoundsRef.current = { top, height };
      }

      startXRef.current = clientX;
      startWidthRef.current = width;
      lastRawWidthRef.current = width;
      updateDragIndicator(clientX, width);
    },
    [updateDragIndicator, width]
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      beginDrag(e.clientX);

      const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current;
        const rawWidth = startWidthRef.current + delta;
        lastRawWidthRef.current = rawWidth;
        onDragWidthChange(rawWidth);
        updateDragIndicator(moveEvent.clientX, rawWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        finishDrag();
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [beginDrag, finishDrag, onDragWidthChange, updateDragIndicator]
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      beginDrag(touch.clientX);

      const handleTouchMove = (moveEvent: globalThis.TouchEvent) => {
        const moveTouch = moveEvent.touches[0];
        const delta = moveTouch.clientX - startXRef.current;
        const rawWidth = startWidthRef.current + delta;
        lastRawWidthRef.current = rawWidth;
        onDragWidthChange(rawWidth);
        updateDragIndicator(moveTouch.clientX, rawWidth);
      };

      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        finishDrag();
      };

      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    },
    [beginDrag, finishDrag, onDragWidthChange, updateDragIndicator]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onWidthChange(width + KEYBOARD_RESIZE_STEP);
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (width <= MIN_SIDE_PANEL_WIDTH) {
          onCollapse();
          return;
        }
        onWidthChange(width - KEYBOARD_RESIZE_STEP);
      }
    },
    [onCollapse, onWidthChange, width]
  );

  return (
    <>
      <EuiResizableButton
        ref={buttonRef}
        css={[resizeButtonStyles, dragIndicator && resizeButtonDraggingStyles]}
        indicator="border"
        isHorizontal
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onKeyDown={handleKeyDown}
        data-test-subj="secondaryNavResizeHandle"
        aria-label={i18n.translate('kbnUI.sideNavigation.resizeSecondaryPanelAriaLabel', {
          defaultMessage:
            'Resize secondary navigation panel. Use left and right arrow keys to adjust width.',
        })}
      />
      {dragIndicator && <SidePanelResizeIndicator {...dragIndicator} />}
    </>
  );
};
