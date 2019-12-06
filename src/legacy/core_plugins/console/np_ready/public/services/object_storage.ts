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

import { SavedObjectAttributes, SavedObjectsClientContract } from 'src/core/public';

interface FindAllResponse<A> {
  [id: string]: A;
}

export class ObjectStorage<A extends SavedObjectAttributes & { id: string }> {
  constructor(private readonly type: string, private readonly client: SavedObjectsClientContract) {}

  async create(obj: Omit<A, 'id'>): Promise<A> {
    const simpleObj = await this.client.create(this.type, obj, {});
    return {
      ...simpleObj.attributes,
      id: simpleObj.id,
    } as A;
  }

  async get(id: string): Promise<A> {
    const simpleObj = await this.client.get<A>(this.type, id);
    return { ...simpleObj.attributes, id: simpleObj.id };
  }

  async update(obj: A): Promise<void> {
    const { id, ...rest } = obj;
    await this.client.update(this.type, id, rest);
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(this.type, id);
  }

  async findAll(): Promise<FindAllResponse<A> | null> {
    const findResponse = await this.client.find<A>({
      type: this.type,
    });
    if (findResponse.savedObjects && findResponse.savedObjects.length) {
      return findResponse.savedObjects.reduce((acc, so) => {
        return {
          ...acc,
          [so.id]: {
            ...so.attributes,
            id: so.id,
          },
        };
      }, {});
    }
    return null;
  }
}
