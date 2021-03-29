/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from 'src/core/server';

export class ByteSizedQueue<Item = unknown> {
  private readonly queue: Buffer[];
  constructor(private readonly logger: Logger, private readonly maxByteSize: number) {
    this.queue = [];
  }

  public get size(): number {
    return this.queue.reduce((acc, buffer) => acc + buffer.length, 0);
  }

  public read(): Item | undefined {
    const buffer = this.queue.shift();
    return buffer && JSON.parse(buffer.toString());
  }

  public push(item: Item) {
    const buffer = Buffer.from(JSON.stringify(item));
    this.queue.push(buffer);
    this.ensureQueueSize();
  }

  /**
   * Ensures the memory size used by the queue doesn't go over the maxByteSize.
   * It allows one entry in the queue in the edge case the maxByteSize is too small.
   * @private
   */
  private ensureQueueSize() {
    while (this.queue.length > 1 && this.size > this.maxByteSize) {
      this.logger.debug(
        `The queue of size ${this.maxByteSize} bytes is full, dropping the old items.`
      );
      // clean the old items in the queue to make space for newer chunks
      this.queue.shift();
    }
  }
}
