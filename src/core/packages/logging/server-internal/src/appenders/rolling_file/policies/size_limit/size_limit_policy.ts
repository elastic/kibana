/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { LogRecord } from '@kbn/logging';
import type { SizeLimitTriggeringPolicyConfig } from '@kbn/core-logging-server';
import { RollingFileContext } from '../../rolling_file_context';
import { TriggeringPolicy } from '../policy';

export const sizeLimitTriggeringPolicyConfigSchema = schema.object({
  type: schema.literal('size-limit'),
  size: schema.byteSize({ min: '1b', defaultValue: '100mb' }),
});

/**
 * A triggering policy based on a fixed size limit.
 *
 * Will trigger a rollover when the current log size exceed the
 * given {@link SizeLimitTriggeringPolicyConfig.size | size}.
 */
export class SizeLimitTriggeringPolicy implements TriggeringPolicy {
  private readonly maxFileSize: number;

  constructor(
    config: SizeLimitTriggeringPolicyConfig,
    private readonly context: RollingFileContext
  ) {
    this.maxFileSize = config.size.getValueInBytes();
  }

  isTriggeringEvent(record: LogRecord): boolean {
    return this.context.currentFileSize >= this.maxFileSize;
  }
}
