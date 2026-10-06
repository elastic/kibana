/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Observable, type Subject } from 'rxjs';
import type { LoggableServiceStatus } from './types';
export interface CreateLogThrottledBufferOptions<LoggableStatus extends LoggableServiceStatus> {
  buffer$: Subject<LoggableStatus>;
  stop$: Observable<void>;
  bufferTimeMillis?: number;
  maxThrottledMessages: number;
}
export declare function createLogThrottledBuffer<LoggableStatus extends LoggableServiceStatus>({
  buffer$,
  stop$,
  maxThrottledMessages,
  bufferTimeMillis,
}: CreateLogThrottledBufferOptions<LoggableStatus>): Observable<LoggableStatus | string>;
