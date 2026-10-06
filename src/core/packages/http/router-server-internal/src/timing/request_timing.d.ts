/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestTiming, Timer, TimingEvent } from '@kbn/core-http-server';
import type { RequestTimingState } from './types';
/**
 * Internal implementation of the RequestTiming API
 * @internal
 */
export declare class RequestTimingImpl implements RequestTiming {
  private readonly state;
  constructor(state: RequestTimingState);
  start(name: string, description?: string): Timer;
  measure(name: string, duration: number, description?: string): void;
  getEvents(): readonly TimingEvent[];
}
