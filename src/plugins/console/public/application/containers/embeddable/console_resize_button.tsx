/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { EuiResizableButton, useEuiTheme, keys, EuiThemeComputed } from '@elastic/eui';

const CONSOLE_MIN_HEIGHT = 200;

const getMouseOrTouchY = (
  e: TouchEvent | MouseEvent | React.MouseEvent | React.TouchEvent
): number => {
  // Some Typescript fooling is needed here
  const y = (e as TouchEvent).targetTouches
    ? (e as TouchEvent).targetTouches[0].pageY
    : (e as MouseEvent).pageY;
  return y;
};

export interface EmbeddedConsoleResizeButtonProps {
  consoleHeight: number;
  setConsoleHeight: React.Dispatch<React.SetStateAction<number>>;
}

const parseOrDefaultValue = (value: string, defaultValue: number): number => {
  try {
    const result = parseInt(value, 10);
    if (!isNaN(result) && result >= 0) {
      return result;
    }
  } catch {
    // ignore bad values
  }
  return defaultValue;
};

export function getCurrentConsoleMaxSize(euiTheme: EuiThemeComputed<{}>) {
  const euiBaseSize = parseOrDefaultValue(euiTheme.size.base, 16);
  const winHeight = window.innerHeight;
  const bodyStyle = window.getComputedStyle(document.body);
  const headerOffset = parseOrDefaultValue(
    bodyStyle.getPropertyValue('--euiFixedHeadersOffset') ?? '0px',
    0
  );

  // We leave a buffer of baseSize to allow room for the user to hover on the top border for resizing
  return Math.max(winHeight - headerOffset - euiBaseSize, CONSOLE_MIN_HEIGHT);
}

export const EmbeddedConsoleResizeButton = ({
  consoleHeight,
  setConsoleHeight,
}: EmbeddedConsoleResizeButtonProps) => {
  const { euiTheme } = useEuiTheme();
  const [maxConsoleHeight, setMaxConsoleHeight] = useState<number>(800);
  const initialConsoleHeight = useRef(consoleHeight);
  const initialMouseY = useRef(0);

  useEffect(() => {
    function handleResize() {
      const newMaxConsoleHeight = getCurrentConsoleMaxSize(euiTheme);
      // Calculate and save the console max height. This is the window height minus the header
      // offset minuse the base size to allow a small buffer for grabbing the resize button.
      if (maxConsoleHeight !== newMaxConsoleHeight) {
        setMaxConsoleHeight(newMaxConsoleHeight);
      }
      if (consoleHeight > newMaxConsoleHeight && newMaxConsoleHeight > CONSOLE_MIN_HEIGHT) {
        // When the current console height is greater than the new max height,
        // we resize the console to the max height. This will ensure there is not weird
        // behavior with the drag resize.
        setConsoleHeight(newMaxConsoleHeight);
      }
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [maxConsoleHeight, euiTheme, consoleHeight, setConsoleHeight]);
  const onResizeMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const currentMouseY = getMouseOrTouchY(e);
      const mouseOffset = (currentMouseY - initialMouseY.current) * -1;
      const changedConsoleHeight = initialConsoleHeight.current + mouseOffset;

      const newConsoleHeight = Math.min(
        Math.max(changedConsoleHeight, CONSOLE_MIN_HEIGHT),
        maxConsoleHeight
      );

      setConsoleHeight(newConsoleHeight);
    },
    [maxConsoleHeight, setConsoleHeight]
  );
  const onResizeMouseUp = useCallback(
    (e: MouseEvent | TouchEvent) => {
      initialMouseY.current = 0;

      window.removeEventListener('mousemove', onResizeMouseMove);
      window.removeEventListener('mouseup', onResizeMouseUp);
      window.removeEventListener('touchmove', onResizeMouseMove);
      window.removeEventListener('touchend', onResizeMouseUp);
    },
    [onResizeMouseMove]
  );
  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      initialMouseY.current = getMouseOrTouchY(e);
      initialConsoleHeight.current = consoleHeight;

      // Window event listeners instead of React events are used
      // in case the user's mouse leaves the component
      window.addEventListener('mousemove', onResizeMouseMove);
      window.addEventListener('mouseup', onResizeMouseUp);
      window.addEventListener('touchmove', onResizeMouseMove);
      window.addEventListener('touchend', onResizeMouseUp);
    },
    [consoleHeight, onResizeMouseUp, onResizeMouseMove]
  );
  const onResizeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const KEYBOARD_OFFSET = 10;

      switch (e.key) {
        case keys.ARROW_UP:
          e.preventDefault(); // Safari+VO will screen reader navigate off the button otherwise
          setConsoleHeight((height) => Math.min(height + KEYBOARD_OFFSET, maxConsoleHeight));
          break;
        case keys.ARROW_DOWN:
          e.preventDefault(); // Safari+VO will screen reader navigate off the button otherwise
          setConsoleHeight((height) => Math.max(height - KEYBOARD_OFFSET, CONSOLE_MIN_HEIGHT));
      }
    },
    [maxConsoleHeight, setConsoleHeight]
  );
  const onResizeDoubleClick = useCallback(() => {
    if (consoleHeight < maxConsoleHeight) {
      setConsoleHeight(maxConsoleHeight);
    } else {
      setConsoleHeight(maxConsoleHeight / 2);
    }
  }, [consoleHeight, maxConsoleHeight, setConsoleHeight]);

  return (
    <EuiResizableButton
      indicator="border"
      isHorizontal={false}
      onMouseDown={onResizeMouseDown}
      onTouchStart={onResizeMouseDown}
      onKeyDown={onResizeKeyDown}
      onDoubleClick={onResizeDoubleClick}
    />
  );
};
