/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ToolingLogTextWriter } from './tooling_log_text_writer';
import { LogLevel } from './log_levels';

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
}
