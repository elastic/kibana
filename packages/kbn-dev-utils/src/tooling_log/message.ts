/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type MessageTypes = 'verbose' | 'debug' | 'info' | 'success' | 'warning' | 'error' | 'write';

/**
 * The object shape passed to ToolingLog writers each time the log is used.
 */
export interface Message {
  /** level/type of message */
  type: MessageTypes;
  /** indentation intended when message written to a text log */
  indent: number;
  /** type of logger this message came from */
  source?: string;
  /** args passed to the logging method */
  args: any[];
}
