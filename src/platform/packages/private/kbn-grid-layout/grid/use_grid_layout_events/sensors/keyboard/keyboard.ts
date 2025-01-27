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

export const onKeyDown = ({
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
  const pressedKey = e.code;
  const {
    interactionEvent$: { value: interactionEvent },
  } = gridLayoutStateManager;

  if (keyboardCodes.move.includes(e.code)) {
    e.preventDefault();
  }
  
  const handleActiveEvent = (event: UserKeyboardEvent) => {
    console.log('keydown', event);
    if (!isKeyboardEvent(event)) {
      document.removeEventListener('keydown', handleActiveEvent);
      return;
    }
    // if the user pressed a move key, move the interaction event
    if (keyboardCodes.move.includes(event.code)) {
      // avoiding scroll
      // handleScrollToView(interactionEvent.panelDiv, gridLayoutStateManager.runtimeSettings$.value);
      // todo: scroll to the visible area if handle outside of the viewport
      return onMove(event);
    }

    if (keyboardCodes.end.includes(pressedKey)) {
      // document.removeEventListener('scroll', () => onMove(e, gridLayoutStateManager));
      document.removeEventListener('keydown', handleActiveEvent);
      return onEnd();
    }

    if (keyboardCodes.cancel.includes(pressedKey)) {
      document.removeEventListener('keydown', handleActiveEvent);
      return onCancel();
    }
  };

  if (!interactionEvent) {
    if (keyboardCodes.start.includes(pressedKey)) {
     


      document.addEventListener('keydown', handleActiveEvent, {
        capture: true, // this disables arrow key scrolling in modern Chrome
        passive: true,
      });
      // e.target!.addEventListener('blur', onBlur, { once: true });

      //   document.addEventListener('scroll', () => onMove(e, gridLayoutStateManager));
      onStart();
    }
    // if user pressed anything else, ignore the event
    return;
  } else {
    document.removeEventListener('keydown', handleActiveEvent);
  }
};

// export const handleScrollToView = (
//   panelDivRect: HTMLDivElement,
//   { gutterSize, rowHeight }: RuntimeGridSettings
// ) => {
//   panelDivRect.scrollIntoView({
//     behavior: 'smooth',
//     block: 'end',
//     inline: 'end',
//   });
// };
