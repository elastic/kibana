/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface CounterMetric {
  domainId: string;
  namespace: string;
  counterName: string;
  counterType: string;
  incrementBy: number;
}

/**
 * Details about the counter to be incremented
 */
export interface IncrementCounterParams {
  /** The namespace to increment this counter on */
  namespace?: string;
  /** The name of the counter **/
  counterName: string;
  /** The counter type ("count" by default) **/
  counterType?: string;
  /** Increment the counter by this number (1 if not specified) **/
  incrementBy?: number;
}
