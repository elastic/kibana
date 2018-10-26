/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'vscode-jsonrpc';
import { LoggerFactory } from './log_factory';

export class ConsoleLoggerFactory implements LoggerFactory {
  public getLogger(tags: string[]): Logger {
    return console;
  }
}
