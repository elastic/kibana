/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { statSync } from 'fs';

export type GetOrderedRolledFileFn = () => Promise<string[]>;

/**
 * Context shared between the rolling file manager, policy and strategy.
 */
export class RollingFileContext {
  constructor(public readonly filePath: string) {}
  /**
   * The size of the currently opened file.
   */
  public currentFileSize: number = 0;
  /**
   * The time the currently opened file was created.
   */
  public currentFileTime: number = 0;

  public refreshFileInfo() {
    try {
      const { birthtime, size } = statSync(this.filePath);
      this.currentFileTime = birthtime.getTime();
      this.currentFileSize = size;
    } catch (e) {
      if (e.code !== 'ENOENT') {
        // eslint-disable-next-line no-console
        console.error('[RollingFileAppender] error accessing the log file', e);
      }
      this.currentFileTime = Date.now();
      this.currentFileSize = 0;
    }
  }

  #orderedRolledFileFn?: GetOrderedRolledFileFn;

  public async getOrderedRolledFiles(): Promise<string[]> {
    if (this.#orderedRolledFileFn) {
      return this.#orderedRolledFileFn();
    }
    throw new Error('orderedRolledFileFn not registered on the context');
  }

  public setOrderedRolledFileFn(fn: GetOrderedRolledFileFn) {
    this.#orderedRolledFileFn = fn;
  }
}
