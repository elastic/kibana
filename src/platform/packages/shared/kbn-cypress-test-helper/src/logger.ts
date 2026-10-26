/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLogTextWriterConfig } from '@kbn/tooling-log';
import { ToolingLog } from '@kbn/tooling-log';
import type { Flags } from '@kbn/dev-cli-runner';

interface CreateLoggerInterface {
  (level?: Partial<ToolingLogTextWriterConfig>['level']): ToolingLog;

  /**
   * The default log level if one is not provided to the `createToolingLogger()` utility.
   * Can be used to globally set the log level to calls made to this utility with no `level` set
   * on input.
   */
  defaultLogLevel: ToolingLogTextWriterConfig['level'];

  /**
   * Set the default logging level based on the flag arguments provide to a CLI script that runs
   * via `@kbn/dev-cli-runner`
   * @param flags
   */
  setDefaultLogLevelFromCliFlags: (flags: Flags) => void;
}

/**
 * Creates an instance of `ToolingLog` that outputs to `stdout`.
 * The default log `level` for all instances can be set by setting the function's `defaultLogLevel`
 * property. Default logging level can also be set from CLI scripts that use the `@kbn/dev-cli-runner`
 * by calling the `setDefaultLogLevelFromCliFlags(flags)` and passing in the `flags` property.
 *
 * @param level
 *
 * @example
 * // Set default log level - example: from cypress for CI jobs
 * createLogger.defaultLogLevel = 'verbose'
 */
export const createToolingLogger: CreateLoggerInterface = (level): ToolingLog => {
  return new ToolingLog({
    level: level || createToolingLogger.defaultLogLevel,
    writeTo: process.stdout,
  });
};
createToolingLogger.defaultLogLevel = 'info';
createToolingLogger.setDefaultLogLevelFromCliFlags = (flags) => {
  createToolingLogger.defaultLogLevel = flags.verbose
    ? 'verbose'
    : flags.debug
    ? 'debug'
    : flags.silent
    ? 'silent'
    : flags.quiet
    ? 'error'
    : 'info';
};
