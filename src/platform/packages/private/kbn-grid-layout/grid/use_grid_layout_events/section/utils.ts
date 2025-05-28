/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayoutStateManager } from '../../types';
import { updateClientY } from '../keyboard_utils';
import { KeyboardCode, UserKeyboardEvent } from '../sensors/keyboard/types';

export const getNextKeyboardPosition = (
  ev: UserKeyboardEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  handlePosition: { clientX: number; clientY: number },
  sectionId: string
) => {
  const {
    headerRefs: { current: headerRefs },
    runtimeSettings$: {
      value: { keyboardDragTopLimit },
    },
  } = gridLayoutStateManager;

  const headerRef = headerRefs[sectionId];
  const headerRefHeight = (headerRef?.getBoundingClientRect().height ?? 48) * 0.5;
  const stepY = headerRefHeight;

  switch (ev.code) {
    case KeyboardCode.Down: {
      const bottomOfPageReached = window.innerHeight + window.scrollY >= document.body.scrollHeight;

      // check if next key will cross the bottom edge
      // if we're at the bottom of the page, the handle can go down even more so we can reorder with the last row
      const bottomMaxPosition = bottomOfPageReached
        ? handlePosition.clientY + stepY
        : handlePosition.clientY + 2 * stepY;
      const isCloseToBottom = bottomMaxPosition > window.innerHeight;

      return {
        ...handlePosition,
        clientY: updateClientY(handlePosition.clientY, stepY, isCloseToBottom),
      };
    }
    case KeyboardCode.Up: {
      // check if next key will cross the top edge
      const isCloseToTop = handlePosition.clientY - stepY - keyboardDragTopLimit < 0;

      return {
        ...handlePosition,
        clientY: updateClientY(handlePosition.clientY, -stepY, isCloseToTop),
      };
    }
    default:
      return handlePosition;
  }
};
