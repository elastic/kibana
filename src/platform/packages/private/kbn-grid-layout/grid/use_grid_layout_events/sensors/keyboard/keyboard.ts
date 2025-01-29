/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayoutStateManager } from '../../../types';
import { KeyboardCode, KeyboardCodes, UserKeyboardEvent } from './types';

export const isKeyboardEvent = (e: Event | React.UIEvent<HTMLElement>): e is UserKeyboardEvent => {
  return 'key' in e;
};

const keyboardCodes: KeyboardCodes = {
  start: [KeyboardCode.Space, KeyboardCode.Enter],
  cancel: [KeyboardCode.Esc],
  end: [KeyboardCode.Space, KeyboardCode.Enter, KeyboardCode.Tab],
  move: [KeyboardCode.Right, KeyboardCode.Left, KeyboardCode.Down, KeyboardCode.Up],
};

const isStartKey = (e: UserKeyboardEvent) => keyboardCodes.start.includes(e.code);
const isEndKey = (e: UserKeyboardEvent) => keyboardCodes.end.includes(e.code);
const isCancelKey = (e: UserKeyboardEvent) => keyboardCodes.cancel.includes(e.code);
const isMoveKey = (e: UserKeyboardEvent) => keyboardCodes.move.includes(e.code);

export const startKeyboardInteraction = ({
  e,
  gridLayoutStateManager,
  onStart,
  onMove,
  onEnd,
  onCancel,
  onBlur,
}: {
  e: UserKeyboardEvent;
  gridLayoutStateManager: GridLayoutStateManager;
  onMove: (e: UserKeyboardEvent) => void;
  onStart: () => void;
  onEnd: () => void;
  onCancel: () => void;
  onBlur: () => void;
}) => {
  console.log('startKeyboardInteraction', e.code);
  const {
    interactionEvent$: { value: interactionEvent },
  } = gridLayoutStateManager;

  if (!interactionEvent) {
    if (isStartKey(e)) {
      e.stopPropagation();
      e.preventDefault();
      onStart();
      document.addEventListener('scroll', onMove, { passive: true });
      e.target!.addEventListener('blur', onBlur, { once: true });
    }
    // if user pressed anything else, ignore the event
    return;
  } else {

    if (isMoveKey(e)) {
      e.stopPropagation();
      e.preventDefault();
      // handleScrollToView(e.target, interactionEvent?.panelDiv, gridLayoutStateManager.runtimeSettings$.value);
      console.log('moveKeyboardInteraction', document.activeElement);
      document.activeElement?.scrollIntoView(false);
      return onMove(e);
    }

    if (isEndKey(e)) {
      document.removeEventListener('scroll', onMove);
      e.preventDefault();
      // document.removeEventListener('scroll', () => onMove(e, gridLayoutStateManager));
      return onEnd();
    }

    if (isCancelKey(e)) {
      document.removeEventListener('scroll', onMove);
      return onCancel();
    }
  }
};
