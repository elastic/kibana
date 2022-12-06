/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import moment from 'moment-timezone';
import { assertNever } from '@kbn/std';
import type {
  TriggeringPolicyConfig,
  TimeIntervalTriggeringPolicyConfig,
} from '@kbn/core-logging-server';
import { TriggeringPolicy } from './policy';
import { RollingFileContext } from '../rolling_file_context';
import { sizeLimitTriggeringPolicyConfigSchema, SizeLimitTriggeringPolicy } from './size_limit';
import {
  TimeIntervalTriggeringPolicy,
  timeIntervalTriggeringPolicyConfigSchema,
} from './time_interval';

export type { TriggeringPolicy } from './policy';

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
