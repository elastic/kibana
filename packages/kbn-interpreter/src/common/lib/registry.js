/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { clone } from 'lodash';

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
    const obj = typeof fn === 'function' ? fn() : fn;

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
    return Object.keys(this._indexed).map((key) => this.get(key));
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
