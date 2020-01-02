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

import { SavedObjectAttributes, SavedObjectsClientContract } from 'src/core/server';

type FindResponse<A> = A[];

export class ObjectStorage<A extends SavedObjectAttributes & { id: string }> {
  constructor(private readonly type: string, private readonly client: SavedObjectsClientContract) {}

  async create(obj: Omit<A, 'id'>): Promise<A> {
    const simpleObj = await this.client.create(this.type, obj, {});
    return {
      ...simpleObj.attributes,
      id: simpleObj.id,
    } as A;
  }

  async update(opts: A): Promise<void> {
    const { id, ...rest } = opts;
    await this.client.update(this.type, id, rest);
  }

  async findByUserId(id: string): Promise<FindResponse<A> | null> {
    const userDSLQuery = {
      query: {
        bool: {
          must: [{ match: { userId: id } }],
        },
      },
    };
    const findResponse = await this.client.find<A>({
      type: this.type,
      search: JSON.stringify(userDSLQuery),
    });

    if (findResponse.saved_objects && findResponse.saved_objects.length) {
      return findResponse.saved_objects.map(so => ({
        ...so.attributes,
        id: so.id,
      }));
    }
    return null;
  }
}
