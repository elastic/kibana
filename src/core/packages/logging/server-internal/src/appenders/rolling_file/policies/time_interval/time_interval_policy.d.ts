/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogRecord } from '@kbn/logging';
import type { TimeIntervalTriggeringPolicyConfig } from '@kbn/core-logging-server';
import type { RollingFileContext } from '../../rolling_file_context';
import type { TriggeringPolicy } from '../policy';
export declare const timeIntervalTriggeringPolicyConfigSchema: import('@kbn/config-schema').ObjectType<{
  type: import('@kbn/config-schema').Type<'time-interval'>;
  interval: import('@kbn/config-schema').Type<import('moment').Duration>;
  modulate: import('@kbn/config-schema').Type<boolean>;
}>;
/**
 * A triggering policy based on a fixed time interval
 */
export declare class TimeIntervalTriggeringPolicy implements TriggeringPolicy {
  private readonly config;
  /**
   * milliseconds timestamp of when the next rollover should occur.
   */
  private nextRolloverTime;
  constructor(config: TimeIntervalTriggeringPolicyConfig, context: RollingFileContext);
  isTriggeringEvent(record: LogRecord): boolean;
}
