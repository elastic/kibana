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
