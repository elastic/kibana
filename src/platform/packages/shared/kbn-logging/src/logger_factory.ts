/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Logger } from './logger';

/**
 * The single purpose of `LoggerFactory` interface is to define a way to
 * retrieve a context-based logger instance.
 *
 * @public
 */
export interface LoggerFactory {
  /**
   * Returns a `Logger` instance for the specified context.
   *
   * @param contextParts - Parts of the context to return logger for. For example
   * get('plugins', 'pid') will return a logger for the `plugins.pid` context.
   */
  get(...contextParts: string[]): Logger;
}
