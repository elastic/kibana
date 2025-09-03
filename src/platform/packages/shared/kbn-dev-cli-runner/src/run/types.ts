/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProcRunner } from '@kbn/dev-proc-runner';
import type { LogLevel, ToolingLog } from '@kbn/tooling-log';
import type { CleanupTask } from '../cleanup';
import type { FlagsReader } from '../flags/flags_reader';
import type { MetricsMeta } from '../metrics';
import type { BaseFlags, FlagOptions, Flags } from '../flags/types';

export interface RunContext<TFlags extends BaseFlags = Flags> {
  log: ToolingLog;
  flags: TFlags;
  procRunner: ProcRunner;
  statsMeta: MetricsMeta;
  addCleanupTask: (task: CleanupTask) => void;
  flagsReader: FlagsReader;
}

export type RunFn<T = void, TFlags extends BaseFlags = Flags> = (
  context: RunContext<TFlags>
) => Promise<T> | void;

export interface RunOptions<TFlagOptions extends FlagOptions = FlagOptions> {
  usage?: string;
  description?: string;
  log?: {
    defaultLevel?: LogLevel;
    context?: string;
  };
  flags?: TFlagOptions;
}
