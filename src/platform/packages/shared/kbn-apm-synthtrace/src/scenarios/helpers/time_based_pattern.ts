/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function timeBasedPattern({
  min,
  max,
  cycle,
  peak,
}: {
  min: number;
  max: number;
  cycle: number;
  peak: number;
}) {
  return function (timestamp: number) {
    // Calculate the midpoint to determine the base level of the pattern
    const baseLevel = (max + min) / 2;

    // Adjust amplitude based on min and max
    const adjustedAmplitude = (max - min) / 2;

    // Calculate the current position in the cycle
    const cyclePosition = (timestamp % cycle) / cycle;

    // Determine the phase shift to align peak times with the specified peak
    const phaseShift = peak * 2 * Math.PI - Math.PI / 2; // Subtract π/2 to make the cosine function start at its maximum

    // Calculate the value using a cosine function to create a smooth wave pattern
    const value =
      baseLevel + adjustedAmplitude * Math.cos(cyclePosition * 2 * Math.PI - phaseShift);

    // Ensure the value is within the specified range
    return Math.max(min, Math.min(value, max));
  };
}
