/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import { assertNever } from '@kbn/std';
import moment from 'moment-timezone';
import { RollingFileContext } from '../rolling_file_context';
import type { TriggeringPolicy } from './policy';
import type { SizeLimitTriggeringPolicyConfig } from './size_limit/size_limit_policy';
import {
  SizeLimitTriggeringPolicy,
  sizeLimitTriggeringPolicyConfigSchema,
} from './size_limit/size_limit_policy';
import type { TimeIntervalTriggeringPolicyConfig } from './time_interval/time_interval_policy';
import {
  TimeIntervalTriggeringPolicy,
  timeIntervalTriggeringPolicyConfigSchema,
} from './time_interval/time_interval_policy';

export type { TriggeringPolicy } from './policy';

/**
 * Any of the existing policy's configuration
 *
 * See {@link SizeLimitTriggeringPolicyConfig} and {@link TimeIntervalTriggeringPolicyConfig}
 */
export type TriggeringPolicyConfig =
  | SizeLimitTriggeringPolicyConfig
  | TimeIntervalTriggeringPolicyConfig;

const defaultPolicy: TimeIntervalTriggeringPolicyConfig = {
  type: 'time-interval',
  interval: moment.duration(24, 'hour'),
  modulate: true,
};

export const triggeringPolicyConfigSchema = schema.oneOf(
  [sizeLimitTriggeringPolicyConfigSchema, timeIntervalTriggeringPolicyConfigSchema],
  { defaultValue: defaultPolicy }
);

export const createTriggeringPolicy = (
  config: TriggeringPolicyConfig,
  context: RollingFileContext
): TriggeringPolicy => {
  switch (config.type) {
    case 'size-limit':
      return new SizeLimitTriggeringPolicy(config, context);
    case 'time-interval':
      return new TimeIntervalTriggeringPolicy(config, context);
    default:
      return assertNever(config);
  }
};
