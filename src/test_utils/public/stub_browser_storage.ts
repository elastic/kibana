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

export class StubBrowserStorage {
  private keys: string[] = [];
  private values: string[] = [];
  private size: number = 0;
  private sizeLimit: number = 5000000; // 5mb, minimum browser storage size;

  // -----------------------------------------------------------------------------------------------
  // Browser-specific methods.
  // -----------------------------------------------------------------------------------------------

  get length() {
    return this.keys.length;
  }

  public key(i: number) {
    return this.keys[i];
  }

  public getItem(key: any) {
    key = String(key);

    const i = this.keys.indexOf(key);
    if (i === -1) {
      return null;
    }
    return this.values[i];
  }

  public setItem(key: any, value: any) {
    key = String(key);
    value = String(value);
    const sizeOfAddition = this._getSizeOfAddition(key, value);
    this._updateSize(sizeOfAddition);

    const i = this.keys.indexOf(key);
    if (i === -1) {
      this.keys.push(key);
      this.values.push(value);
    } else {
      this.values[i] = value;
    }
  }

  public removeItem(key: any) {
    key = String(key);
    const sizeOfRemoval = this._getSizeOfRemoval(key);
    this._updateSize(sizeOfRemoval);

    const i = this.keys.indexOf(key);
    if (i === -1) {
      return;
    }
    this.keys.splice(i, 1);
    this.values.splice(i, 1);
  }

  // -----------------------------------------------------------------------------------------------
  // Test-specific methods.
  // -----------------------------------------------------------------------------------------------

  public getStubbedKeys() {
    return this.keys.slice();
  }

  public getStubbedValues() {
    return this.values.slice();
  }

  public setStubbedSizeLimit(sizeLimit: number) {
    // We can't reconcile a size limit with the "stored" items, if the stored items size exceeds it.
    if (sizeLimit < this.size) {
      throw new Error(`You can't set a size limit smaller than the current size.`);
    }

    this.sizeLimit = sizeLimit;
  }

  public getStubbedSizeLimit() {
    return this.sizeLimit;
  }

  public getStubbedSize() {
    return this.size;
  }

  private _getSizeOfAddition(key: any, value: any) {
    const i = this.keys.indexOf(key);
    if (i === -1) {
      return key.length + value.length;
    }
    // Return difference of what's been stored, and what *will* be stored.
    return value.length - this.values[i].length;
  }

  private _getSizeOfRemoval(key: any) {
    const i = this.keys.indexOf(key);
    if (i === -1) {
      return 0;
    }
    // Return negative value.
    return -(key.length + this.values[i].length);
  }

  private _updateSize(delta: number) {
    if (this.size + delta > this.sizeLimit) {
      throw new Error('something about quota exceeded, browsers are not consistent here');
    }

    this.size += delta;
  }
}
