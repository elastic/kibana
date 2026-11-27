/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserInteractionEvent } from '../types';

export type UserTouchEvent = TouchEvent | React.TouchEvent<HTMLButtonElement>;

export const isTouchEvent = (e: Event | React.UIEvent<HTMLElement>): e is UserTouchEvent => {
  return 'touches' in e;
};

export const getTouchSensorPosition = ({ touches }: UserTouchEvent) => ({
  clientX: touches[0].clientX,
  clientY: touches[0].clientY,
});

/*
 * This function should be attached to `touchstart` event listener.
 * It follows the flow of `touchstart` -> `touchmove` -> `touchend` / `touchcancel` where the consumer is
 * responsible for handling the interaction logic and defining what happens on each event.
 * When the browser aborts the touch (`touchcancel`), `onCancel` is called to revert the interaction; without it, `onEnd` is the fallback.
 */
export const startTouchInteraction = ({
  e,
  onMove,
  onEnd,
  onCancel,
  onStart,
}: {
  e: UserTouchEvent;
  onStart: (e: UserInteractionEvent) => void;
  onMove: (e: UserInteractionEvent) => void;
  onEnd: () => void;
  onCancel?: () => void;
}) => {
  if (e.touches.length > 1) return;

  const teardown = () => {
    e.target!.removeEventListener('touchmove', onMove);
    e.target!.removeEventListener('touchend', handleEnd);
    e.target!.removeEventListener('touchcancel', handleCancel);
  };

  const handleEnd = () => {
    teardown();
    onEnd();
  };

  const handleCancel = () => {
    teardown();
    (onCancel ?? onEnd)();
  };

  e.target!.addEventListener('touchmove', onMove);
  e.target!.addEventListener('touchend', handleEnd);
  e.target!.addEventListener('touchcancel', handleCancel);
  onStart(e);
};
