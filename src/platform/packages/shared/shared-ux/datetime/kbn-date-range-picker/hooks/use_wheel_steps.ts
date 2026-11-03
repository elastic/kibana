/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, type RefObject } from 'react';

/** Accumulated wheel delta (px) for each further step within one gesture; tames trackpad bursts. */
const WHEEL_STEP_THRESHOLD = 15;
/** Idle time (ms) after which the next wheel event starts a new gesture and steps immediately. */
const WHEEL_GESTURE_GAP_MS = 150;

/**
 * Turns mouse wheel / trackpad scrolling over an element into discrete steps.
 * The first tick of a gesture steps immediately; continuous scrolling steps every
 * `WHEEL_STEP_THRESHOLD` px. Uses a native, non-passive listener so the page doesn't
 * scroll while stepping (React's onWheel is passive).
 *
 * `onStep` returns `false` when the event isn't over a steppable target, letting the
 * page scroll normally. `direction` is 1 for scrolling up and -1 for scrolling down.
 */
export function useWheelSteps<T extends HTMLElement>(
  ref: RefObject<T>,
  isActive: boolean,
  onStep: (event: WheelEvent, direction: 1 | -1) => boolean
) {
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;

  useEffect(() => {
    const element = ref.current;
    if (!element || !isActive) return;

    let accumulated = 0;
    let lastEventTime = 0;
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;

      const now = event.timeStamp;
      const isNewGesture = now - lastEventTime > WHEEL_GESTURE_GAP_MS;

      // Reset when starting a new gesture or reversing direction
      if (isNewGesture || Math.sign(accumulated) !== Math.sign(event.deltaY)) accumulated = 0;
      accumulated += event.deltaY;

      // First tick of a gesture and line/page-mode wheels step immediately
      const shouldStep =
        isNewGesture ||
        event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL ||
        Math.abs(accumulated) >= WHEEL_STEP_THRESHOLD;

      const direction = event.deltaY < 0 ? 1 : -1;
      const handled = shouldStep ? onStepRef.current(event, direction) : true;
      if (!handled) return;

      event.preventDefault();
      lastEventTime = now;
      if (shouldStep) accumulated = 0;
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [ref, isActive]);
}
