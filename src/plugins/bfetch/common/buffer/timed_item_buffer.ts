/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ItemBuffer, ItemBufferParams } from './item_buffer';

export interface TimedItemBufferParams<Item> extends ItemBufferParams<Item> {
  /**
   * Flushes buffer when oldest item reaches age specified by this parameter,
   * in milliseconds.
   */
  maxItemAge?: number;
}

export class TimedItemBuffer<Item> extends ItemBuffer<Item> {
  private timer: any;

  constructor(public readonly params: TimedItemBufferParams<Item>) {
    super(params);
  }

  public write(item: Item) {
    super.write(item);

    if (this.params.maxItemAge && this.length === 1) {
      this.timer = setTimeout(this.onTimeout, this.params.maxItemAge);
    }
  }

  public clear() {
    clearTimeout(this.timer);
    super.clear();
  }

  public flush() {
    clearTimeout(this.timer);
    super.flush();
  }

  private onTimeout = () => {
    this.flush();
  };
}
