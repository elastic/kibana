/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, MouseEvent, TouchEvent, KeyboardEvent } from 'react';
import React, { useCallback, useRef } from 'react';
import { EuiResizableButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useSidebarWidth, useSidebar } from '../hooks';

const resizeButtonStyles = css`
  flex-shrink: 0;
`;

const KEYBOARD_RESIZE_STEP = 10;

/**
 * A resize handle component that can be placed on the edge of a panel
 * to allow users to resize it by dragging or using keyboard arrows.
 *
 * Designed for panels positioned on the right side of the viewport,
 * where dragging left increases width and dragging right decreases width.
 */
export const PanelResizeHandle: FC<{}> = () => {
  const { setWidth } = useSidebar();
  const currentWidth = useSidebarWidth();

  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      startXRef.current = e.clientX;
      startWidthRef.current = currentWidth;

      const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
        // Dragging left increases width, dragging right decreases (panel is on the right)
        const delta = startXRef.current - moveEvent.clientX;
        const newWidth = startWidthRef.current + delta;
        setWidth(newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [currentWidth, setWidth]
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      startXRef.current = touch.clientX;
      startWidthRef.current = currentWidth;

      const handleTouchMove = (moveEvent: globalThis.TouchEvent) => {
        const moveTouch = moveEvent.touches[0];
        const delta = startXRef.current - moveTouch.clientX;
        const newWidth = startWidthRef.current + delta;
        setWidth(newWidth);
      };

      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    },
    [currentWidth, setWidth]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      let delta = 0;
      if (e.key === 'ArrowLeft') {
        delta = KEYBOARD_RESIZE_STEP; // Increase width
      } else if (e.key === 'ArrowRight') {
        delta = -KEYBOARD_RESIZE_STEP; // Decrease width
      }

      if (delta !== 0) {
        e.preventDefault();
        setWidth(currentWidth + delta);
      }
    },
    [currentWidth, setWidth]
  );

  return (
    <EuiResizableButton
      css={resizeButtonStyles}
      indicator="border"
      isHorizontal
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      data-test-subj="sidebarResizeHandle"
      aria-label={i18n.translate('core.ui.chrome.sidebar.resizePanelAriaLabel', {
        defaultMessage: 'Resize side panel. Use left and right arrow keys to adjust width.',
      })}
    />
  );
};
