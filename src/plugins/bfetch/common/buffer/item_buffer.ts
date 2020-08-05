/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  onFlush: (items: Item[]) => void;
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
   * Call `.onflush` method and clear buffer.
   */
  public flush() {
    let list;
    [list, this.list] = [this.list, []];
    this.params.onFlush(list);
  }
}
