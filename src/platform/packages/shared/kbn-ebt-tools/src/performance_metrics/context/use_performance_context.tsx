/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import type { EventData } from './performance_context';
export interface PerformanceApi {
  /**
   * Marks the end of the page ready state and measures the performance between the start of the page change and the end of the page ready state.
   * @param eventData - Data to send with the performance measure, conforming the structure of a {@link EventData}.
   */
  onPageReady(eventData?: EventData): void;
  /**
   * Marks the start of a page refresh event for performance tracking.
   * This method adds a performance marker start::pageRefresh to indicate when a page refresh begins.
   *
   * Usage:
   * ```ts
   * onPageRefreshStart();
   * ```
   *
   * The marker set by this function can later be used in performance measurements
   * along with an end marker end::pageReady to determine the total refresh duration.
   */
  onPageRefreshStart(): void;
}

export const PerformanceContext = createContext<PerformanceApi | undefined>(undefined);

export function usePerformanceContext() {
  const api = useContext(PerformanceContext);

  if (!api) {
    throw new Error('Missing Performance API in context');
  }

  return api;
}
