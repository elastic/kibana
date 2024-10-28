/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ItemBufferParams<Item> {
  /**
   * Flushes buffer automatically if number of items in the buffer reaches
   * this number. Omit it or set to `Infinity` to never flush on max buffer
   * size automatically.
   */
  flushOnMaxItems?: number;

  /**
   * Callback that is called every time buffer is flushed. It receives a single
   * argument which is a list of all buffered items. If `.flush()` is called
   * when buffer is empty, `.onflush` is called with empty array.
   */
  onFlush: (items: Item[]) => void | Promise<void>;
}

/**
 * A simple buffer that collects items. Can be cleared or flushed; and can
 * automatically flush when specified number of items is reached.
 */
export class ItemBuffer<Item> {
  private list: Item[] = [];

  constructor(public readonly params: ItemBufferParams<Item>) {}

  /**
   * Get current buffer size.
   */
  public get length(): number {
    return this.list.length;
  }

  /**
   * Add item to the buffer.
   */
  public write(item: Item) {
    this.list.push(item);

    const { flushOnMaxItems } = this.params;
    if (flushOnMaxItems) {
      if (this.list.length >= flushOnMaxItems) {
        this.flush();
      }
    }
  }

  /**
   * Remove all items from the buffer.
   */
  public clear() {
    this.list = [];
  }

  /**
   * Call `.onFlush` method and clear buffer.
   */
  public flush() {
    this.flushAsync().catch(() => {});
  }

  /**
   * Same as `.flush()` but asynchronous, and returns a promise, which
   * rejects if `.onFlush` throws.
   */
  public async flushAsync(): Promise<void> {
    let list;
    [list, this.list] = [this.list, []];
    await this.params.onFlush(list);
  }
}
