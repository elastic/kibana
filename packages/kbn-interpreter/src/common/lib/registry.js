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

import clone from 'lodash.clone';

export class Registry {
  constructor(prop = 'name') {
    if (typeof prop !== 'string') throw new Error('Registry property name must be a string');
    this._prop = prop;
    this._indexed = new Object();
  }

  wrapper(obj) {
    return obj;
  }

  register(fn) {
    if (typeof fn !== 'function') throw new Error(`Register requires an function`);

    const obj = fn();

    if (typeof obj !== 'object' || !obj[this._prop]) {
      throw new Error(`Registered functions must return an object with a ${this._prop} property`);
    }

    this._indexed[obj[this._prop].toLowerCase()] = this.wrapper(obj);
  }

  toJS() {
    return Object.keys(this._indexed).reduce((acc, key) => {
      acc[key] = this.get(key);
      return acc;
    }, {});
  }

  toArray() {
    return Object.keys(this._indexed).map(key => this.get(key));
  }

  get(name) {
    if (name === undefined) return null;
    const lowerCaseName = name.toLowerCase();
    return this._indexed[lowerCaseName] ? clone(this._indexed[lowerCaseName]) : null;
  }

  getProp() {
    return this._prop;
  }

  reset() {
    this._indexed = new Object();
  }
}
