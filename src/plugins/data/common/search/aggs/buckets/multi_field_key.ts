/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const id = Symbol('id');

export class MultiFieldKey {
  [id]: string;
  keys: string[];

  constructor(bucket: any) {
    this.keys = bucket.key;

    this[id] = MultiFieldKey.idBucket(bucket);
  }
  static idBucket(bucket: any) {
    return bucket.key.join(',,,,,');
  }

  toString() {
    return this[id];
  }
}
