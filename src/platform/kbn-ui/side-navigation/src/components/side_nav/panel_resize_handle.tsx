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

const resizeButtonStyles = css`
  flex-shrink: 0;
`;

const KEYBOARD_RESIZE_STEP = 10;

export interface SidePanelResizeHandleProps {
  width: number;
  onWidthChange: (width: number) => void;
}

/**
 * Resize handle for the secondary navigation side panel.
 *
 * Designed for panels on the left side of the viewport, where dragging right
 * increases width and dragging left decreases width.
 */
export const SidePanelResizeHandle: FC<SidePanelResizeHandleProps> = ({ width, onWidthChange }) => {
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      startXRef.current = e.clientX;
      startWidthRef.current = width;

      const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current;
        onWidthChange(startWidthRef.current + delta);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [onWidthChange, width]
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      startXRef.current = touch.clientX;
      startWidthRef.current = width;

      const handleTouchMove = (moveEvent: globalThis.TouchEvent) => {
        const moveTouch = moveEvent.touches[0];
        const delta = moveTouch.clientX - startXRef.current;
        onWidthChange(startWidthRef.current + delta);
      };

      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    },
    [onWidthChange, width]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      let delta = 0;
      if (e.key === 'ArrowRight') {
        delta = KEYBOARD_RESIZE_STEP;
      } else if (e.key === 'ArrowLeft') {
        delta = -KEYBOARD_RESIZE_STEP;
      }

      if (delta !== 0) {
        e.preventDefault();
        onWidthChange(width + delta);
      }
    },
    [onWidthChange, width]
  );

  return (
    <EuiResizableButton
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
