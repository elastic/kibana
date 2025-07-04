/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UserMouseEvent } from './mouse';

const DEADZONE = 0.35; // percent of the distance from the center of the screen on either side of the middle is considered deadzone and will not scroll.
const MAX_DISTANCE = 0.6; // percent of the distance from the center of the screen on either side of the middle is considered max distance and will scroll at max speed.
const PIXELS_PER_SECOND = 2000; // how many pixels to scroll per second when at max distance.
const EDGE_SLOWDOWN_THRESHOLD = 500; // how many pixels from the bottom or top of the scroll height to start slowing down the scroll.

let shouldAutoScroll = false;
let latestMouseEvent: UserMouseEvent | null = null;

export const stopAutoScroll = () => {
  shouldAutoScroll = false;
};

export const startAutoScroll = () => {
  if (shouldAutoScroll) return;
  shouldAutoScroll = true;

  let lastFrameTime: number = +(document?.timeline?.currentTime ?? 0);

  const autoScroll: FrameRequestCallback = (now: number) => {
    if (!shouldAutoScroll) return;

    const deltaTime = (now - lastFrameTime) / 1000;

    if (latestMouseEvent) {
      // Scroll faster depending on how far the user's drag is from the center of the screen.
      const distanceFromCenterOfScreen = window.innerHeight / 2 - latestMouseEvent.clientY;
      const scrollDirection = distanceFromCenterOfScreen > 0 ? 'up' : 'down';
      const distanceFromCenterOfScreenPercentage = distanceFromCenterOfScreen / window.innerHeight;

      const dragDistanceSpeedMultiplier = Math.min(
        1,
        Math.max(
          0,
          (Math.abs(distanceFromCenterOfScreenPercentage) - DEADZONE) / (MAX_DISTANCE - DEADZONE)
        )
      );

      // scroll slower as we approach the bottom or the top of the page.
      const distanceToTop = scrollDirection === 'up' ? window.scrollY : Number.MAX_VALUE;
      const distanceToBottom =
        scrollDirection === 'down'
          ? document.body.scrollHeight - window.innerHeight - window.scrollY
          : Number.MAX_VALUE;
      const nearestScrollEdgeDistance = Math.min(distanceToTop, distanceToBottom);
      const edgeSlowdownMultiplier = Math.min(
        1,
        Math.max(0.01, nearestScrollEdgeDistance / EDGE_SLOWDOWN_THRESHOLD)
      );

      // apply scroll
      const pixelsToScroll =
        PIXELS_PER_SECOND * (dragDistanceSpeedMultiplier * edgeSlowdownMultiplier) * deltaTime;

      if (pixelsToScroll > 0) {
        window.scrollBy({ top: scrollDirection === 'up' ? -pixelsToScroll : pixelsToScroll });
      }
    }

    lastFrameTime = now;
    window.requestAnimationFrame(autoScroll);
  };
  window.requestAnimationFrame(autoScroll);
};

export const handleAutoscroll = (e: UserMouseEvent) => {
  latestMouseEvent = e;
};
