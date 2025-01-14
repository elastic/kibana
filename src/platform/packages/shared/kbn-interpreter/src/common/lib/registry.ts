/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { clone } from 'lodash';

export class Registry<ItemSpec, Item> {
  private readonly _prop: string;
  // eslint-disable-next-line @typescript-eslint/ban-types
  private _indexed: Object;

  constructor(prop = 'name') {
    if (typeof prop !== 'string') throw new Error('Registry property name must be a string');
    this._prop = prop;
    this._indexed = new Object();
  }

  wrapper(obj: ItemSpec): Item {
    // @ts-ignore
    return obj;
  }

  register(fn: () => ItemSpec): void {
    const obj = typeof fn === 'function' ? fn() : fn;

    // @ts-ignore
    if (typeof obj !== 'object' || !obj[this._prop]) {
      throw new Error(`Registered functions must return an object with a ${this._prop} property`);
    }

    // @ts-ignore
    this._indexed[obj[this._prop].toLowerCase()] = this.wrapper(obj);
  }

  toJS(): { [key: string]: any } {
    return Object.keys(this._indexed).reduce((acc, key) => {
      // @ts-ignore
      acc[key] = this.get(key);
      return acc;
    }, {});
  }

  toArray(): Item[] {
    return Object.keys(this._indexed).map((key) => this.get(key));
  }

  get(name: string): Item {
    // @ts-ignore
    if (name === undefined) return null;
    const lowerCaseName = name.toLowerCase();
    // @ts-ignore
    return this._indexed[lowerCaseName] ? clone(this._indexed[lowerCaseName]) : null;
  }

  getProp(): string {
    return this._prop;
  }

  reset(): void {
    this._indexed = new Object();
  }
}
