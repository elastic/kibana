/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { MigrationLog } from '../../types';
export interface LogAwareState {
  controlState: string;
  logs: MigrationLog[];
}
export declare const logStateTransition: (
  logger: Logger,
  logPrefix: string,
  prevState: LogAwareState,
  currState: LogAwareState,
  tookMs: number
) => void;
export declare const logActionResponse: (
  logger: Logger,
  logMessagePrefix: string,
  state: LogAwareState,
  res: unknown
) => void;
