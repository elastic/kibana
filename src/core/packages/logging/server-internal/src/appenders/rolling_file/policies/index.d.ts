/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type moment from 'moment-timezone';
import type { TriggeringPolicyConfig } from '@kbn/core-logging-server';
import type { TriggeringPolicy } from './policy';
import type { RollingFileContext } from '../rolling_file_context';
export type { TriggeringPolicy } from './policy';
export declare const triggeringPolicyConfigSchema: import('@kbn/config-schema').Type<
  | Readonly<
      {} & {
        type: 'size-limit';
        size: import('@kbn/config-schema').ByteSizeValue;
      }
    >
  | Readonly<
      {} & {
        type: 'time-interval';
        interval: moment.Duration;
        modulate: boolean;
      }
    >
>;
export declare const createTriggeringPolicy: (
  config: TriggeringPolicyConfig,
  context: RollingFileContext
) => TriggeringPolicy;
