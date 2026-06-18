/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, KeyboardEvent, MouseEvent, TouchEvent } from 'react';
import React, { useCallback, useRef } from 'react';
import { EuiResizableButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

import { MIN_SIDE_PANEL_WIDTH } from '../../utils/side_panel_width_utils';

const resizeButtonStyles = css`
  flex-shrink: 0;
`;

const KEYBOARD_RESIZE_STEP = 10;

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

  const finishDrag = useCallback(() => {
    buttonRef.current?.blur();
    if (onDragWidthCommit(lastRawWidthRef.current)) {
      onCollapse();
    }
  }, [onCollapse, onDragWidthCommit]);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      lastRawWidthRef.current = width;

      const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current;
        const rawWidth = startWidthRef.current + delta;
        lastRawWidthRef.current = rawWidth;
        onDragWidthChange(rawWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        finishDrag();
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [finishDrag, onDragWidthChange, width]
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      startXRef.current = touch.clientX;
      startWidthRef.current = width;
      lastRawWidthRef.current = width;

      const handleTouchMove = (moveEvent: globalThis.TouchEvent) => {
        const moveTouch = moveEvent.touches[0];
        const delta = moveTouch.clientX - startXRef.current;
        const rawWidth = startWidthRef.current + delta;
        lastRawWidthRef.current = rawWidth;
        onDragWidthChange(rawWidth);
      };

      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        finishDrag();
      };

      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    },
    [finishDrag, onDragWidthChange, width]
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
    <EuiResizableButton
      ref={buttonRef}
      css={resizeButtonStyles}
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
  );
};
