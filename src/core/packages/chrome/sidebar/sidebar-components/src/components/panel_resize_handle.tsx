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
import { useSidebarSide } from '@kbn/core-chrome-browser-hooks/use_sidebar_side';
import { css } from '@emotion/react';
import { useSidebarWidth, useSidebar } from '../hooks';

const resizeButtonStyles = css`
  flex-shrink: 0;
`;

const KEYBOARD_RESIZE_STEP = 10;

/**
 * A resize handle component that can be placed on the edge of a panel.
 * Supports panels on either side of the viewport — drag direction and
 * keyboard arrows are flipped automatically when the sidebar is on the left.
 */
export const PanelResizeHandle: FC<{}> = () => {
  const { setWidth } = useSidebar();
  const currentWidth = useSidebarWidth();
  const sidebarSide = useSidebarSide();
  // When the sidebar is on the left, dragging right grows it and left shrinks it.
  // When on the right (default), dragging left grows it and right shrinks it.
  const directionFactor = sidebarSide === 'left' ? -1 : 1;

  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      startXRef.current = e.clientX;
      startWidthRef.current = currentWidth;

      const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
        const delta = (startXRef.current - moveEvent.clientX) * directionFactor;
        setWidth(startWidthRef.current + delta);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [currentWidth, directionFactor, setWidth]
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      startXRef.current = touch.clientX;
      startWidthRef.current = currentWidth;

      const handleTouchMove = (moveEvent: globalThis.TouchEvent) => {
        const moveTouch = moveEvent.touches[0];
        const delta = (startXRef.current - moveTouch.clientX) * directionFactor;
        setWidth(startWidthRef.current + delta);
      };

      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    },
    [currentWidth, directionFactor, setWidth]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      let delta = 0;
      if (e.key === 'ArrowLeft') {
        delta = KEYBOARD_RESIZE_STEP * directionFactor;
      } else if (e.key === 'ArrowRight') {
        delta = -KEYBOARD_RESIZE_STEP * directionFactor;
      }

      if (delta !== 0) {
        e.preventDefault();
        setWidth(currentWidth + delta);
      }
    },
    [currentWidth, directionFactor, setWidth]
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
