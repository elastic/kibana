/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Internal API for registering the Usage Tracker used for Core's usage data payload.
 *
 * @note This API should never be used to drive application logic and is only
 * intended for telemetry purposes.
 *
 * @public
 */
export interface CoreUsageDataSetup {
  /**
   * API for a usage tracker plugin to inject the {@link CoreUsageCounter} to use
   * when tracking events.
   */
  registerUsageCounter: (usageCounter: CoreUsageCounter) => void;
}

/**
 * @public
 * API to track whenever an event occurs, so the core can report them.
 */
export interface CoreUsageCounter {
  /** @internal {@link CoreIncrementUsageCounter} **/
  incrementCounter: CoreIncrementUsageCounter;
}

/**
 * @public Details about the counter to be incremented
 */
export interface CoreIncrementCounterParams {
  /** The name of the counter **/
  counterName: string;
  /** The counter type ("count" by default) **/
  counterType?: string;
  /** Increment the counter by this number (1 if not specified) **/
  incrementBy?: number;
}

/**
 * @public
 * Method to call whenever an event occurs, so the counter can be increased.
 */
export type CoreIncrementUsageCounter = (params: CoreIncrementCounterParams) => void;
