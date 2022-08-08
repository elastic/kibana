/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';

/**
 * Logger interface used by @kbn/type-summarizer-* packages
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
  /**
   * Write a message to the log indicating the beginning of a step, then run the passed
   * block, any log output produced inside that step will be indented and at the end the
   * duration of the step will be written. If the log level is below verbose then any
   * "verbose steps" executed inside this step will be summaried by this step at the end
   * as well.
   * @param name a common name for steps of a specific type
   * @param desc a specific name to describe the unique information about this step
   * @param block the function body which defines this step
   */
  step<T>(name: string, desc: ts.Symbol | ts.Node | string | null, block: () => T): T;
  /**
   * Just like step(), except that unless the logging level is set to verbose the steps with
   * the same name will be summaried at the end of the containing step, rather than logged
   * directly.
   * @param name a common name for steps of a specific type
   * @param desc a specific name to describe the unique information about this step
   * @param block the function body which defines this step
   */
  verboseStep<T>(name: string, desc: ts.Symbol | ts.Node | string | null, block: () => T): T;
}
