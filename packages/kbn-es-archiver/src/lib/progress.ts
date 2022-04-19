/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';

const SECOND = 1000;

export class Progress {
  private total?: number;
  private complete?: number;
  private loggingInterval?: NodeJS.Timer;

  getTotal() {
    return this.total;
  }

  getComplete() {
    return this.complete;
  }

  getPercent() {
    if (this.complete === undefined || this.total === undefined) {
      return 0;
    }

    return Math.round((this.complete / this.total) * 100);
  }

  isActive() {
    return !!this.loggingInterval;
  }

  activate(log: ToolingLog) {
    if (this.loggingInterval) {
      throw new Error('Progress is already active');
    }

    // if the action takes longer than 10 seconds, log info about the transfer every 10 seconds
    this.loggingInterval = setInterval(() => {
      if (this.complete === undefined) {
        return;
      }

      if (this.total === undefined) {
        log.info('progress: %d', this.getComplete());
        return;
      }

      log.info('progress: %d/%d (%d%)', this.getComplete(), this.getTotal(), this.getPercent());
    }, 10 * SECOND);
  }

  deactivate() {
    if (!this.loggingInterval) {
      throw new Error('Progress is not active');
    }

    clearInterval(this.loggingInterval);
    this.loggingInterval = undefined;
  }

  addToTotal(n: number) {
    this.total = this.total === undefined ? n : this.total + n;
  }

  addToComplete(n: number) {
    this.complete = this.complete === undefined ? n : this.complete + n;
  }
}
