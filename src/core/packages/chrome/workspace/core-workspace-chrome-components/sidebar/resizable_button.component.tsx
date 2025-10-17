/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef } from 'react';
import { css } from '@emotion/react';
import { EuiResizableButton, keys } from '@elastic/eui';
import type {
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useIsSidebarFullSize } from '@kbn/core-workspace-chrome-state';

export interface ResizableButtonProps {
  /** Whether the resizer is horizontal (true) or vertical (false) */
  isHorizontal?: boolean;
  /** Custom CSS styles */
  css?: any;
  /** Callback fired when resize occurs with the difference value (positive for left, negative for right). */
  onResize?: (delta: number) => void;
  /** Callback fired when resize starts */
  onResizeStart?: () => void;
  /** Callback fired when resize ends */
  onResizeEnd?: () => void;
}

export const ResizableButton: React.FC<ResizableButtonProps> = ({
  isHorizontal = true,
  css: customCss,
  onResize,
  onResizeStart,
  onResizeEnd,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef<number>(0);
  const isFullSize = useIsSidebarFullSize();

  // Get the current position from mouse or touch event
  const getPosition = useCallback(
    (
      event: ReactMouseEvent | ReactTouchEvent | globalThis.MouseEvent | globalThis.TouchEvent
    ): number => {
      const direction = isHorizontal ? 'clientX' : 'clientY';
      if ('touches' in event && event.touches.length > 0) {
        return (event.touches[0] as any)[direction];
      }
      return (event as any)[direction];
    },
    [isHorizontal]
  );

  // Handle mouse/touch down
  const handlePointerDown = useCallback(
    (event: ReactMouseEvent | ReactTouchEvent) => {
      // Ignore secondary clicks (right-click, middle-click, etc.)
      if ('button' in event && event.button !== 0) {
        return;
      }

      event.preventDefault();

      const position = getPosition(event);
      const container = containerRef.current;

      if (!container) return;

      lastPositionRef.current = position;

      onResizeStart?.();

      // Add global event listeners
      const handlePointerMove = (moveEvent: globalThis.MouseEvent | globalThis.TouchEvent) => {
        // Ignore resize if panel is full size
        if (isFullSize) {
          return;
        }

        const currentPosition = getPosition(moveEvent);
        const delta = lastPositionRef.current - currentPosition;

        // Always call onResize to handle constraints
        onResize?.(delta);

        // Always update last position to prevent bouncing
        lastPositionRef.current = currentPosition;
      };

      const handlePointerUp = () => {
        onResizeEnd?.();

        // Remove global event listeners
        document.removeEventListener('mousemove', handlePointerMove as EventListener);
        document.removeEventListener('mouseup', handlePointerUp);
        document.removeEventListener('touchmove', handlePointerMove as EventListener);
        document.removeEventListener('touchend', handlePointerUp);
      };

      // Add global event listeners
      document.addEventListener('mousemove', handlePointerMove as EventListener);
      document.addEventListener('mouseup', handlePointerUp);
      document.addEventListener('touchmove', handlePointerMove as EventListener);
      document.addEventListener('touchend', handlePointerUp);
    },
    [getPosition, onResize, onResizeStart, onResizeEnd, isFullSize]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      // Ignore resize if panel is full size
      if (isFullSize) {
        return;
      }

      const { key } = event;

      let delta = 0;
      if (isHorizontal) {
        if (key === keys.ARROW_LEFT) {
          delta = 10; // Move left (positive)
        } else if (key === keys.ARROW_RIGHT) {
          delta = -10; // Move right (negative)
        }
      } else {
        if (key === keys.ARROW_UP) {
          delta = 10; // Move up (positive)
        } else if (key === keys.ARROW_DOWN) {
          delta = -10; // Move down (negative)
        }
      }

      if (delta !== 0) {
        event.preventDefault();
        onResize?.(delta);
      }
    },
    [isHorizontal, onResize, isFullSize]
  );

  // Handle focus events
  const handleFocus = useCallback(() => {
    onResizeStart?.();
  }, [onResizeStart]);

  const handleBlur = useCallback(() => {
    onResizeEnd?.();
  }, [onResizeEnd]);

  return (
    <div
      ref={containerRef}
      css={({ euiTheme }) => css`
        position: relative;
        height: 100%;
        ${!isFullSize && `left: -${euiTheme.size.xs};`}
        z-index: 2000;
      `}
    >
      <EuiResizableButton
        ref={buttonRef}
        isHorizontal={isHorizontal}
        css={customCss}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        tabIndex={0}
        aria-label={`Resize ${isHorizontal ? 'horizontally' : 'vertically'}`}
      />
    </div>
  );
};
