/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type UserTouchEvent = TouchEvent | React.TouchEvent<HTMLButtonElement>;

export const isTouchEvent = (e: Event | React.UIEvent<HTMLElement>): e is UserTouchEvent => {
  return 'touches' in e;
};

export const startTouchInteraction = ({
  e,
  onMove,
  onEnd,
}: {
  e: UserTouchEvent;
  onMove: (e: Event) => void;
  onEnd: () => void;
}) => {
  if (e.touches.length > 1) return;

  const handleEnd = () => {
    e.target!.removeEventListener('touchmove', onMove);
    onEnd();
  };

  e.target!.addEventListener('touchmove', onMove, { passive: false });
  e.target!.addEventListener('touchend', handleEnd, { once: true });
};
