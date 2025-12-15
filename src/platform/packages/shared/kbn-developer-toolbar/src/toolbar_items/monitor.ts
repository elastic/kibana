/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Common interface that all monitors must implement
 */
export interface Monitor<T> {
  /**
   * Check if monitoring is supported in the current environment
   */
  isSupported(): boolean;

  /**
   * Start monitoring
   */
  startMonitoring(): void;

  /**
   * Stop monitoring
   */
  stopMonitoring(): void;

  /**
   * Clean up all resources and reset state
   */
  destroy(): void;

  /**
   * Subscribe to monitor updates
   * @returns Unsubscribe function
   */
  subscribe(callback: (info: T) => void): () => void;
}
