/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { ToolingLog } from './src/tooling_log';
export type { ToolingLogOptions } from './src/tooling_log';
export type { ToolingLogTextWriterConfig } from './src/tooling_log_text_writer';
export { ToolingLogTextWriter } from './src/tooling_log_text_writer';
export type { LogLevel, ParsedLogLevel } from './src/log_levels';
export {
  DEFAULT_LOG_LEVEL,
  LOG_LEVEL_FLAGS,
  pickLevelFromFlags,
  parseLogLevel,
  getLogLevelFlagsHelp,
} from './src/log_levels';
export { ToolingLogCollectingWriter } from './src/tooling_log_collecting_writer';
export type { Writer } from './src/writer';
export type { Message } from './src/message';
