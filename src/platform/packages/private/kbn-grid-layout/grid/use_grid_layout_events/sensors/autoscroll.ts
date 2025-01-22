/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UserMouseEvent } from './mouse';

const MIN_SPEED = 50;
const MAX_SPEED = 150;

let scrollInterval: NodeJS.Timeout | null = null;

const scrollOnInterval = (direction: 'up' | 'down') => {
  let count = 0;
  let currentSpeed = MIN_SPEED;
  let maxSpeed = MIN_SPEED;
  let turnAroundPoint: number | undefined;

  scrollInterval = setInterval(() => {
    /**
     * Since "smooth" scrolling on an interval is jittery on Chrome, we are manually creating
     * an "ease" effect via the parabola formula `y = a(x - h)^2 + k`
     *
     * Scrolling slowly speeds up as the user drags, and it slows down again as they approach the
     * top and/or bottom of the screen.
     */
    const nearTop = direction === 'up' && scrollY < window.innerHeight;
    const nearBottom =
      direction === 'down' &&
      window.innerHeight + window.scrollY > document.body.scrollHeight - window.innerHeight;
    if (!turnAroundPoint && (nearTop || nearBottom)) {
      // reverse the direction of the parabola
      maxSpeed = currentSpeed;
      turnAroundPoint = count;
    }

    currentSpeed = turnAroundPoint
      ? Math.max(-3 * (count - turnAroundPoint) ** 2 + maxSpeed, MIN_SPEED) // slow down fast
      : Math.min(0.1 * count ** 2 + MIN_SPEED, MAX_SPEED); // speed up slowly
    window.scrollBy({
      top: direction === 'down' ? currentSpeed : -currentSpeed,
    });

    count++; // increase the counter to increase the time interval used in the parabola formula
  }, 60);
  return scrollInterval;
};

export const stopAutoScroll = () => {
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
};

export const handleAutoscroll = (e: UserMouseEvent) => {
  // auto scroll when an event is happening close to the top or bottom of the screen
  const heightPercentage = 100 - ((window.innerHeight - e.clientY) / window.innerHeight) * 100;
  const atTheTop = window.scrollY <= 0;
  const atTheBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight;

  const startScrollingUp = heightPercentage < 5 && !atTheTop; // don't scroll up when resizing
  const startScrollingDown = heightPercentage > 95 && !atTheBottom;
  if (startScrollingUp || startScrollingDown) {
    if (!scrollInterval) {
      // only start scrolling if it's not already happening
      scrollInterval = scrollOnInterval(startScrollingUp ? 'up' : 'down');
    }
  } else {
    stopAutoScroll();
  }
};
