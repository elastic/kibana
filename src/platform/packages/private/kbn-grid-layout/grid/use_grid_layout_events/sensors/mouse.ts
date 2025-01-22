/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UserInteractionEvent } from '../../types';
import { handleAutoscroll, stopAutoScroll } from './autoscroll';

export type UserMouseEvent = MouseEvent | React.MouseEvent<HTMLButtonElement, MouseEvent>;

export const isMouseEvent = (e: Event | React.UIEvent<HTMLElement>): e is UserMouseEvent => {
  return 'clientX' in e;
};

const MOUSE_BUTTON_LEFT = 0;

export const startMouseInteraction = ({
  e,
  onStart,
  onMove,
  onEnd,
}: {
  e: UserMouseEvent;
  onStart: () => void;
  onMove: (e: UserInteractionEvent) => void;
  onEnd: () => void;
}) => {
  if (e.button !== MOUSE_BUTTON_LEFT) return;

  const handleMouseMove = (ev: UserMouseEvent) => {
    handleAutoscroll(ev);
    onMove(ev);
  };

  const handleEnd = () => {
    document.removeEventListener('scroll', onMove);
    document.removeEventListener('mousemove', handleMouseMove);
    stopAutoScroll();
    onEnd();
  };

  document.addEventListener('scroll', onMove, { passive: true });
  document.addEventListener('mousemove', handleMouseMove, { passive: true });
  document.addEventListener('mouseup', handleEnd, { once: true, passive: true });
  onStart();
};
