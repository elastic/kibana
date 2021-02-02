/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Generates file transfer progress messages
 */
export class Progress {
  constructor(logger) {
    const self = this;

    self.dotCount = 0;
    self.runningTotal = 0;
    self.totalSize = 0;
    self.logger = logger;
  }

  init(size) {
    this.totalSize = size;
    const totalDesc = this.totalSize || 'unknown number of';

    this.logger.log(`Transferring ${totalDesc} bytes`, true);
  }

  progress(size) {
    if (!this.totalSize) return;

    this.runningTotal += size;
    let newDotCount = Math.round(((this.runningTotal / this.totalSize) * 100) / 5);
    if (newDotCount > 20) newDotCount = 20;
    for (let i = 0; i < newDotCount - this.dotCount; i++) {
      this.logger.log('.', true);
    }
    this.dotCount = newDotCount;
  }

  complete() {
    this.logger.log(`Transfer complete`, false);
  }
}
