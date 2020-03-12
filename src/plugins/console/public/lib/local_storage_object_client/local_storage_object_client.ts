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
import { pick } from 'lodash';
import uuid from 'uuid';
import { ObjectStorage } from '../../../common/types';
import { IdObject } from '../../../common/id_object';
import { Storage } from '../../services';

export class LocalObjectStorage<O extends IdObject> implements ObjectStorage<O> {
  private readonly prefix: string;

  constructor(private readonly client: Storage, type: string) {
    this.prefix = `console_local_${type}`;
  }

  private getFullEntryName(id: string) {
    return `${this.prefix}_${id}`;
  }

  async create(obj: Omit<O, 'id'>): Promise<O> {
    const id = uuid.v4();
    const newObj = { id, ...obj } as O;
    this.client.set(this.getFullEntryName(id), newObj);
    return newObj;
  }

  async get<F extends keyof O>(id: string, fieldsToInclude?: F[]): Promise<Pick<O, F>> {
    const object = await this.client.get<O>(this.getFullEntryName(id));
    if (!object) {
      throw new Error(`${id} not found`);
    }

    return fieldsToInclude ? pick(object, fieldsToInclude) : object;
  }

  async update(obj: Partial<O> & IdObject): Promise<void> {
    const objIdName = this.getFullEntryName(obj.id);
    const currentObj = this.client.get(objIdName);
    this.client.set(objIdName, { ...currentObj, ...obj });
  }

  async delete(id: string) {
    this.client.delete(this.getFullEntryName(id));
  }

  async findAll<F extends keyof O>(fieldsToInclude?: F[]): Promise<Array<Pick<O, F>>> {
    const allLocalKeys = this.client.keys().filter(key => {
      return key.indexOf(this.prefix) === 0;
    });

    const result = [];
    for (const key of allLocalKeys) {
      const object = this.client.get<O>(key);
      result.push(fieldsToInclude ? pick(object, fieldsToInclude) : object);
    }
    return result;
  }
}
