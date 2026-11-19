/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type HealthProfileName = 'healthy' | 'slow' | 'erroring' | 'critical';

/** Log-normal distribution described by its median and the standard deviation of its log. */
export interface Distribution {
  median: number;
  sigma: number;
}

const gaussian = (random: () => number) => {
  // Box-Muller transform; `1 - random()` avoids `log(0)`
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
};

export const sample = (
  { median, sigma }: Distribution,
  random: () => number = Math.random
): number => median * Math.exp(sigma * gaussian(random));
