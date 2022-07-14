/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type LogLevel = 'verbose' | 'debug' | 'info';

export interface SomeDevLog {
  info(msg: string, ...rest: any[]): void;
  debug(msg: string, ...rest: any[]): void;
  error(msg: string, ...rest: any[]): void;
  warning(msg: string, ...rest: any[]): void;
  verbose(msg: string, ...rest: any[]): void;
}
