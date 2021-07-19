/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogLevel, LogLevelId } from './log_level';

/**
 * Essential parts of every log message.
 * @internal
 */
export interface LogRecord {
  timestamp: Date;
  level: LogLevel;
  context: string;
  message: string;
  error?: Error;
  meta?: { [name: string]: any };
  pid: number;
}

/**
 * Serializable version of a log record, used for IPC.
 * @internal
 */
export interface SerializableLogRecord {
  timestamp: string; // ISO-8601 timestamp
  level: LogLevelId;
  context: string;
  message: string;
  error?: { name: string; message: string; stack?: string };
  meta?: { [name: string]: any };
  pid: number;
}
