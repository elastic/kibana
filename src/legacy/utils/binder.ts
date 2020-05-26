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

export interface Emitter {
  on: (...args: any[]) => void;
  off: (...args: any[]) => void;
  addListener: Emitter['on'];
  removeListener: Emitter['off'];
}

export class BinderBase {
  private disposal: Array<() => void> = [];

  public on(emitter: Emitter, ...args: any[]) {
    const on = emitter.on || emitter.addListener;
    const off = emitter.off || emitter.removeListener;

    on.apply(emitter, args);
    this.disposal.push(() => off.apply(emitter, args));
  }

  public destroy() {
    const destroyers = this.disposal;
    this.disposal = [];
    destroyers.forEach((fn) => fn());
  }
}
