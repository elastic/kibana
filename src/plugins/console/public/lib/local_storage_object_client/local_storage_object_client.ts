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
