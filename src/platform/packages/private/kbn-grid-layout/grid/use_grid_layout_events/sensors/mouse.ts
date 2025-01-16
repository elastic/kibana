/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type UserMouseEvent = MouseEvent | React.MouseEvent<HTMLButtonElement, MouseEvent>;

export const isMouseEvent = (e: Event | React.UIEvent<HTMLElement>): e is UserMouseEvent => {
  return 'clientX' in e;
};

const MOUSE_BUTTON_LEFT = 0;

export const attachMouseEvents = (
  e: UserMouseEvent,
  onMove: (e: Event) => void,
  onDragEnd: () => void
) => {
  if (e.button !== MOUSE_BUTTON_LEFT) return;

  const onEnd = () => {
    document.removeEventListener('scroll', onMove);
    document.removeEventListener('mousemove', onMove);
    onDragEnd();
  };

  document.addEventListener('scroll', onMove);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd, { once: true });
};
