/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

interface LoggerOptions {
  silent?: boolean;
  quiet?: boolean;
}

export declare class Logger {
  constructor(settings?: LoggerOptions);

  log(data: string, sameLine?: boolean): void;

  error(data: string): void;
}
