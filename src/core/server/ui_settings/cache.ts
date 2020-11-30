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
const oneSec = 1000;
const defMaxAge = 5 * oneSec;
/**
 * @internal
 */
export class Cache<T = Record<string, any>> {
  private value: T | null;
  private timer?: NodeJS.Timeout;

  /**
   * Delete cached value after maxAge ms.
   */
  constructor(private readonly maxAge: number = defMaxAge) {
    this.value = null;
  }
  get() {
    return this.value;
  }
  set(value: T) {
    this.del();
    this.value = value;
    this.timer = setTimeout(() => this.del(), this.maxAge);
  }
  del() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.value = null;
  }
}
