/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Message } from './message';

/**
 * An object which received ToolingLog `Messages` and sends them to
 * some interface for collecting logs like stdio, or a file
 */
export interface Writer {
  /**
   * Called with every log message, should return true if the message
   * was written and false if it was ignored.
   * @param msg The log message to write
   */
  write(msg: Message): boolean;
}
