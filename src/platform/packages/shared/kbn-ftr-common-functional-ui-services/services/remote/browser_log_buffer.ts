/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';

interface BrowserLogEntry {
  message: string;
  level: string;
  timestamp: number;
}

/**
 * Buffers browser console logs and only displays them on test failure.
 * SEVERE errors are always logged immediately.
 */
export class BrowserLogBuffer {
  private buffer: BrowserLogEntry[] = [];
  private readonly maxBufferSize = 100;
  private enabled = true;

  constructor(private readonly log: ToolingLog) {}

  /**
   * Add a log entry to the buffer
   */
  addLog(message: string, level: string): void {
    if (!this.enabled) {
      // If buffering is disabled, log immediately
      this.writeLog(message, level);
      return;
    }

    // Always log SEVERE errors immediately
    if (level === 'SEVERE' || level === 'error') {
      this.writeLog(message, level);
      return;
    }

    // Add to buffer
    this.buffer.push({
      message,
      level,
      timestamp: Date.now(),
    });

    // Keep buffer size under control (circular buffer)
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * Flush all buffered logs to output (called on test failure)
   */
  flush(): void {
    if (this.buffer.length === 0) {
      return;
    }

    this.log.write('');
    this.log.write('═'.repeat(80));
    this.log.write('  BROWSER CONSOLE LOGS (captured during this test)');
    this.log.write('═'.repeat(80));

    for (const entry of this.buffer) {
      this.writeLog(entry.message, entry.level);
    }

    this.log.write('═'.repeat(80));
    this.buffer = [];
  }

  /**
   * Clear the buffer without logging (called on test success)
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Disable buffering and log everything immediately
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Enable buffering
   */
  enable(): void {
    this.enabled = true;
  }

  private writeLog(message: string, level: string): void {
    const msg = message.replace(/\\n/g, '\n');
    const levelLabel = level === 'SEVERE' ? 'ERROR' : level.toUpperCase();
    this.log.write(`${chalk.magenta('[Browser]')} [${levelLabel}] ${msg}`);
  }
}
