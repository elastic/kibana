/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import uuid from 'uuid';
import { ObjectStorage, IdObject } from '../../../common/types';
import { Storage } from '../../services';

export class LocalObjectStorage<O extends IdObject> implements ObjectStorage<O> {
  private readonly prefix: string;

  constructor(private readonly client: Storage, type: string) {
    this.prefix = `console_local_${type}`;
  }

  async create(obj: Omit<O, 'id'>): Promise<O> {
    const id = uuid.v4();
    const newObj = { id, ...obj } as O;
    this.client.set(`${this.prefix}_${id}`, newObj);
    return newObj;
  }

  async update(obj: O): Promise<void> {
    this.client.set(`${this.prefix}_${obj.id}`, obj);
  }

  async findAll(): Promise<O[]> {
    const allLocalKeys = this.client.keys().filter((key) => {
      return key.includes(this.prefix);
    });

    const result = [];
    for (const key of allLocalKeys) {
      result.push(this.client.get<O>(key));
    }
    return result;
  }
}
