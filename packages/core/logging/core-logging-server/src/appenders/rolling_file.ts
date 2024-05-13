/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ByteSizeValue } from '@kbn/config-schema';
import type { Duration } from 'moment-timezone';
import { LayoutConfigType } from '../layout';

/**
 * Configuration of a rolling-file appender
 * @public
 */
export interface RollingFileAppenderConfig {
  type: 'rolling-file';
  /**
   * The layout to use when writing log entries
   */
  layout: LayoutConfigType;
  /**
   * The absolute path of the file to write to.
   */
  fileName: string;
  /**
   * The {@link TriggeringPolicy | policy} to use to determine if a rollover should occur.
   */
  policy: TriggeringPolicyConfig;
  /**
   * The {@link RollingStrategy | rollout strategy} to use for rolling.
   */
  strategy: RollingStrategyConfig;
}

/**
 * Any of the existing policy's configuration
 *
 * See {@link SizeLimitTriggeringPolicyConfig} and {@link TimeIntervalTriggeringPolicyConfig}
 */
export type TriggeringPolicyConfig =
  | SizeLimitTriggeringPolicyConfig
  | TimeIntervalTriggeringPolicyConfig;

export interface SizeLimitTriggeringPolicyConfig {
  type: 'size-limit';

  /**
   * The minimum size the file must have to roll over.
   */
  size: ByteSizeValue;
}

export interface TimeIntervalTriggeringPolicyConfig {
  type: 'time-interval';

  /**
   * How often a rollover should occur.
   *
   * @remarks
   * Due to how modulate rolling works, it is required to have an integer value for the highest time unit
   * of the duration (you can't overflow to a higher unit).
   * For example, `15m` and `4h` are valid values , but `90m` is not (as it is `1.5h`).
   */
  interval: Duration;

  /**
   * Indicates whether the interval should be adjusted to cause the next rollover to occur on the interval boundary.
   *
   * For example, if the interval is `4h` and the current hour is 3 am then
   * the first rollover will occur at 4 am and then next ones will occur at 8 am, noon, 4pm, etc.
   * The default value is true.
   */
  modulate: boolean;
}

export type RollingStrategyConfig = NumericRollingStrategyConfig;

export interface NumericRollingStrategyConfig {
  type: 'numeric';
  /**
   * The suffix pattern to apply when renaming a file. The suffix will be applied
   * after the `appender.fileName` file name, but before the file extension.
   *
   * Must include `%i`, as it is the value that will be converted to the file index
   *
   * @example
   * ```yaml
   * logging:
   *   appenders:
   *     rolling-file:
   *       type: rolling-file
   *       fileName: /var/logs/kibana.log
   *       strategy:
   *         type: default
   *         pattern: "-%i"
   *         max: 5
   * ```
   *
   * will create `/var/logs/kibana-1.log`, `/var/logs/kibana-2.log`, and so on.
   *
   * Defaults to `-%i`.
   */
  pattern: string;
  /**
   * The maximum number of files to keep. Once this number is reached, oldest
   * files will be deleted. Defaults to `7`
   */
  max: number;
}
