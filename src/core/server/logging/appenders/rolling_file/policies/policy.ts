/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { LogRecord } from '@kbn/logging';

/**
 * A policy used to determinate when a rollout should be performed.
 */
export interface TriggeringPolicy {
  /**
   * Determines whether a rollover should occur before logging given record.
   **/
  isTriggeringEvent(record: LogRecord): boolean;
}
