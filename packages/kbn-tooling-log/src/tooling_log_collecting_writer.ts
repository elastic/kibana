/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLogTextWriter } from './tooling_log_text_writer';
import { LogLevel } from './log_levels';
import { Message } from './message';

export class ToolingLogCollectingWriter extends ToolingLogTextWriter {
  messages: string[] = [];

  constructor(level: LogLevel = 'verbose') {
    super({
      level,
      writeTo: {
        write: (msg) => {
          // trim trailing new line
          this.messages.push(msg.slice(0, -1));
        },
      },
    });
  }

  /**
   * Called by ToolingLog, extends messages with the source and context if message include it.
   */
  write(msg: Message) {
    const args = [
      msg.source ? `source[${msg.source}]` : null,
      msg.context ? `context[${msg.context}]` : null,
    ]
      .filter(Boolean)
      .concat(msg.args);

    return super.write({ ...msg, args });
  }
}
