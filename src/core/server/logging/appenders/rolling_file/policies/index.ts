/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schema } from '@kbn/config-schema';
import moment from 'moment-timezone';
import { assertNever } from '@kbn/std';
import { TriggeringPolicy } from './policy';
import { RollingFileContext } from '../rolling_file_context';
import {
  sizeLimitTriggeringPolicyConfigSchema,
  SizeLimitTriggeringPolicyConfig,
  SizeLimitTriggeringPolicy,
} from './size_limit';
import {
  TimeIntervalTriggeringPolicyConfig,
  TimeIntervalTriggeringPolicy,
  timeIntervalTriggeringPolicyConfigSchema,
} from './time_interval';

export { TriggeringPolicy } from './policy';

/**
 * Any of the existing policy's configuration
 *
 * See {@link SizeLimitTriggeringPolicyConfig} and {@link TimeIntervalTriggeringPolicyConfig}
 */
export type TriggeringPolicyConfig =
  | SizeLimitTriggeringPolicyConfig
  | TimeIntervalTriggeringPolicyConfig;

const defaultPolicy: TimeIntervalTriggeringPolicyConfig = {
  kind: 'time-interval',
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
  switch (config.kind) {
    case 'size-limit':
      return new SizeLimitTriggeringPolicy(config, context);
    case 'time-interval':
      return new TimeIntervalTriggeringPolicy(config, context);
    default:
      return assertNever(config);
  }
};
