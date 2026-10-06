/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Observable, type Subscription } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { PluginName } from '@kbn/core-base-common';
import type { PluginStatus } from './types';
interface LogPluginsStatusChangesParams {
  logger: Logger;
  plugins$: Observable<Record<PluginName, PluginStatus>>;
  stop$: Observable<void>;
  maxMessagesPerPluginPerInterval?: number;
  throttleIntervalMillis?: number;
  maxThrottledMessages?: number;
}
export declare const logPluginsStatusChanges: ({
  logger,
  plugins$,
  stop$,
  maxMessagesPerPluginPerInterval,
  throttleIntervalMillis,
  maxThrottledMessages,
}: LogPluginsStatusChangesParams) => Subscription;
export {};
