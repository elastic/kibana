/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { RuntimeField, RuntimeFieldSpec } from '../types';
export declare const removeFieldAttrs: (runtimeField: RuntimeField) => RuntimeFieldSpec;
/**
 * Helper function to run forkJoin
 * with restrictions on how many input observables can be subscribed to concurrently
 */
export declare function rateLimitingForkJoin<T>(
  observables: Array<Observable<T>>,
  maxConcurrentRequests: number | undefined,
  failValue: T
): Observable<T[]>;
