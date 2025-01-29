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

  if (keyboardCodes.move.includes(e.code)) {
    e.preventDefault();
  }

  function handleActiveEvent(event: UserKeyboardEvent) {
    console.log('handleActiveEvent', event.code);

    if (!gridLayoutStateManager.interactionEvent$.value) {
      return;
    }
    console.log('keydown', event);

    // if the user pressed a move key, move the interaction event
    if (isMoveKey(event)) {
      event.stopPropagation();
      event.preventDefault();
      handleScrollToView(e.target, interactionEvent?.panelDiv, gridLayoutStateManager.runtimeSettings$.value);
      return onMove(event);
    }

    if (isEndKey(event)) {
      event.preventDefault();
      // document.removeEventListener('scroll', () => onMove(e, gridLayoutStateManager));
      removeEventListener();
      return onEnd();
    }

    if (isCancelKey(event)) {
      removeEventListener();
      return onCancel();
    }
  }

  const removeEventListener = () => {
    console.log('removeEventListener');
    document.removeEventListener('keydown', handleActiveEvent);
  };

  if (!interactionEvent) {
    if (isStartKey(e)) {
      e.stopPropagation();
      e.preventDefault();
      //   document.addEventListener('scroll', () => onMove(e, gridLayoutStateManager));
      onStart();
      document.addEventListener('keydown', handleActiveEvent);
      e.target!.addEventListener(
        'blur',
        () => {
          onBlur();
        },
        { once: true }
      );
    }
    // if user pressed anything else, ignore the event
    return;
  } else {
  }
};

export const handleScrollToView = (
  target: UserKeyboardEvent['target'],
  { gutterSize, rowHeight }: RuntimeGridSettings
) => {
  const keyboardDif = gutterSize + rowHeight;
  // get window height
  const windowHeight = window.innerHeight;
  if (target.getBoundingClientRect().top < 0.2 *  interactionEvent?.panelDiv) {
    scrollBy(0, -keyboardDif);
  } else if (target.getBoundingClientRect().bottom >  interactionEvent?.panelDiv) {
    scrollBy(0, keyboardDif);
  }
};
