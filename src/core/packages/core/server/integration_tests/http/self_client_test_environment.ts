/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { performance as nodePerformance } from 'node:perf_hooks';
import {
  clearInterval as nodeClearInterval,
  clearTimeout as nodeClearTimeout,
  setInterval as nodeSetInterval,
  setTimeout as nodeSetTimeout,
} from 'node:timers';

const originalPerformance = global.performance;
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;

global.setTimeout = nodeSetTimeout as typeof global.setTimeout;
global.clearTimeout = nodeClearTimeout as typeof global.clearTimeout;
global.setInterval = nodeSetInterval as typeof global.setInterval;
global.clearInterval = nodeClearInterval as typeof global.clearInterval;
Object.defineProperty(global, 'performance', {
  configurable: true,
  value: nodePerformance,
});

export const restoreSelfClientTestEnvironment = (): void => {
  global.setTimeout = originalSetTimeout;
  global.clearTimeout = originalClearTimeout;
  global.setInterval = originalSetInterval;
  global.clearInterval = originalClearInterval;
  Object.defineProperty(global, 'performance', {
    configurable: true,
    value: originalPerformance,
  });
};
