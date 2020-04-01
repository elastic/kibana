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

const URL_MAX_IE = 2000;
const URL_MAX_OTHERS = 25000;
export const IE_REGEX = /(; ?MSIE |Edge\/\d|Trident\/[\d+\.]+;.*rv:*11\.\d+)/;

export class UrlOverflowService {
  private readonly _ieLike: boolean;
  private _val?: string | null;
  private readonly _sync: () => void;
  constructor() {
    const key = 'error/url-overflow/url';
    const store = window.sessionStorage || {
      getItem() {},
      setItem() {},
      removeItem() {},
    };

    // FIXME: Couldn't find a way to test for browser compatibility without
    // complex redirect and cookie based "feature-detection" page, so going
    // with user-agent detection for now.
    this._ieLike = IE_REGEX.test(window.navigator.userAgent);

    this._val = store.getItem(key);
    this._sync = () => {
      if (typeof this._val === 'string') {
        store.setItem(key, this._val);
      } else {
        store.removeItem(key);
      }
    };
  }

  failLength() {
    return this._ieLike ? URL_MAX_IE : URL_MAX_OTHERS;
  }

  set(v: string) {
    this._val = v;
    this._sync();
  }

  get() {
    return this._val;
  }

  check(absUrl: string) {
    if (!this.get()) {
      const urlLength = absUrl.length;
      const remaining = this.failLength() - urlLength;

      if (remaining > 0) {
        return remaining;
      }

      this.set(absUrl);
    }

    throw new Error(`
      The URL has gotten too big and kibana can no longer
      continue. Please refresh to return to your previous state.
    `);
  }

  clear() {
    this._val = undefined;
    this._sync();
  }
}
