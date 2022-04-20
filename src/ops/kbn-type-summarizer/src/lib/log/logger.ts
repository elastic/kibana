/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Logger interface used by @kbn/type-summarizer
 */
export interface Logger {
  /**
   * Write a message to the log with the level "info"
   * @param msg any message
   * @param args any serializeable values you would like to be appended to the log message
   */
  info(msg: string, ...args: any[]): void;
  /**
   * Write a message to the log with the level "warn"
   * @param msg any message
   * @param args any serializeable values you would like to be appended to the log message
   */
  warn(msg: string, ...args: any[]): void;
  /**
   * Write a message to the log with the level "error"
   * @param msg any message
   * @param args any serializeable values you would like to be appended to the log message
   */
  error(msg: string, ...args: any[]): void;
  /**
   * Write a message to the log with the level "debug"
   * @param msg any message
   * @param args any serializeable values you would like to be appended to the log message
   */
  debug(msg: string, ...args: any[]): void;
  /**
   * Write a message to the log with the level "verbose"
   * @param msg any message
   * @param args any serializeable values you would like to be appended to the log message
   */
  verbose(msg: string, ...args: any[]): void;
  /**
   * Write a message to the log, only excluded in silent mode
   * @param msg any message
   * @param args any serializeable values you would like to be appended to the log message
   */
  success(msg: string, ...args: any[]): void;
}
