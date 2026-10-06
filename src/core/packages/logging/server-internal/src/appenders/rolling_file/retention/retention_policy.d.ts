/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RetentionPolicyConfig } from '@kbn/core-logging-server';
import type { RollingFileContext } from '../rolling_file_context';
export declare const retentionPolicyConfigSchema: import('@kbn/config-schema').ObjectType<{
  maxFiles: import('@kbn/config-schema').Type<number | undefined>;
  maxAccumulatedFileSize: import('@kbn/config-schema').Type<
    import('@kbn/config-schema').ByteSizeValue | undefined
  >;
  removeOlderThan: import('@kbn/config-schema').Type<import('moment').Duration | undefined>;
}>;
export interface RetentionPolicy {
  /**
   * Apply the configured policy, checking the existing log files bound to the appender
   * and disposing of those that should.
   */
  apply(): Promise<void>;
}
export declare class GenericRetentionPolicy implements RetentionPolicy {
  private readonly config;
  private readonly context;
  private readonly logFileFolder;
  constructor(config: RetentionPolicyConfig, context: RollingFileContext);
  apply(): Promise<void>;
}
