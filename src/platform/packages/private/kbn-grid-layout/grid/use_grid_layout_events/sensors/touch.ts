/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UserInteractionEvent } from '../types';

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
 * It follows the flow of `touchstart` -> `touchmove` -> `touchend` where the consumer is responsible for handling the interaction logic and defining what happens on each event.
 */

export const startTouchInteraction = ({
  e,
  onMove,
  onEnd,
  onStart,
}: {
  e: UserTouchEvent;
  onStart: (e: UserInteractionEvent) => void;
  onMove: (e: UserInteractionEvent) => void;
  onEnd: () => void;
}) => {
  if (e.touches.length > 1) return;

  const handleEnd = () => {
    e.target!.removeEventListener('touchmove', onMove);
    onEnd();
  };

  e.target!.addEventListener('touchmove', onMove);
  e.target!.addEventListener('touchend', handleEnd, { once: true });
  onStart(e);
};
