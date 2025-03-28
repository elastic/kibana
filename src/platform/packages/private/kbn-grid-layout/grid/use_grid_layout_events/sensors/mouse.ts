/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UserInteractionEvent } from '../types';
import { handleAutoscroll, startAutoScroll, stopAutoScroll } from './autoscroll';

export type UserMouseEvent = MouseEvent | React.MouseEvent<HTMLButtonElement, MouseEvent>;

export const isMouseEvent = (e: Event | React.UIEvent<HTMLElement>): e is UserMouseEvent => {
  return 'clientX' in e;
};

export const getMouseSensorPosition = ({ clientX, clientY }: UserMouseEvent) => ({
  clientX,
  clientY,
});

const MOUSE_BUTTON_LEFT = 0;

/*
 * This function should be attached to `mousedown` event listener.
 * It follows the flow of `mousedown` -> `mousemove` -> `mouseup` where the consumer is responsible for handling the interaction logic and defining what happens on each event.
 * Additionally, it adds autoscroll behavior - when the cursor during the interaction is near the viewport's edge, the page will scroll in that direction.
 */

export const startMouseInteraction = ({
  e,
  onStart,
  onMove,
  onEnd,
}: {
  e: UserMouseEvent;
  onStart: (e: UserInteractionEvent) => void;
  onMove: (e: UserInteractionEvent) => void;
  onEnd: () => void;
}) => {
  if (e.button !== MOUSE_BUTTON_LEFT) return;
  e.stopPropagation();
  startAutoScroll();

  const handleMouseMove = (ev: UserMouseEvent) => {
    handleAutoscroll(ev);
    onMove(ev);
  };

  const handleEnd = (ev: Event) => {
    document.removeEventListener('scroll', onMove);
    document.removeEventListener('mousemove', handleMouseMove);
    stopAutoScroll();
    onEnd();
  };

  document.addEventListener('scroll', onMove, { passive: true });
  document.addEventListener('mousemove', handleMouseMove, { passive: true });
  document.addEventListener('mouseup', handleEnd, { once: true, passive: true });
  onStart(e);
};
