/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class CancellationToken {
  constructor() {
    this.isCancelled = false;
    this._callbacks = [];
  }

  on = (callback) => {
    if (typeof callback !== 'function') {
      throw new Error('Expected callback to be a function');
    }

    if (this.isCancelled) {
      callback();
      return;
    }

    this._callbacks.push(callback);
  };

  cancel = () => {
    this.isCancelled = true;
    this._callbacks.forEach(callback => callback());
  };
}
