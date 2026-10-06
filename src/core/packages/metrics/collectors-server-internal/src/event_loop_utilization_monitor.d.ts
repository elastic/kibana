/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventLoopUtilization } from 'perf_hooks';
export declare class EventLoopUtilizationMonitor {
  private elu;
  /**
   * Creating a new instance of EventLoopUtilizationMonitor will capture the
   * current ELU to use as a point of comparison against the first call to
   * `collect`.
   */
  constructor();
  /**
   * Get ELU between now and last time the ELU was reset.
   */
  collect(): EventLoopUtilization;
  /**
   * Resets the ELU to now. Will be used to calculate the diff on the next call to `collect`.
   */
  reset(): void;
}
