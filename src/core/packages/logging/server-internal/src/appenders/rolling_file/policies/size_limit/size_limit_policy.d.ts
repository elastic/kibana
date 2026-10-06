/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogRecord } from '@kbn/logging';
import type { SizeLimitTriggeringPolicyConfig } from '@kbn/core-logging-server';
import type { RollingFileContext } from '../../rolling_file_context';
import type { TriggeringPolicy } from '../policy';
export declare const sizeLimitTriggeringPolicyConfigSchema: import('@kbn/config-schema').ObjectType<{
  type: import('@kbn/config-schema').Type<'size-limit'>;
  size: import('@kbn/config-schema').Type<import('@kbn/config-schema').ByteSizeValue>;
}>;
/**
 * A triggering policy based on a fixed size limit.
 *
 * Will trigger a rollover when the current log size exceed the
 * given {@link SizeLimitTriggeringPolicyConfig.size | size}.
 */
export declare class SizeLimitTriggeringPolicy implements TriggeringPolicy {
  private readonly context;
  private readonly maxFileSize;
  constructor(config: SizeLimitTriggeringPolicyConfig, context: RollingFileContext);
  isTriggeringEvent(record: LogRecord): boolean;
}
