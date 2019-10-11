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

import { SavedObjectsClient, SavedObjectAttributes } from '../../../../../../../core/public';

export class CRUDObject<A extends SavedObjectAttributes> {
  constructor(private readonly type: string, private readonly client: SavedObjectsClient) {}

  async get(id: string): Promise<A> {
    const simpleObj = await this.client.get<A>(this.type, id);
    return simpleObj.attributes;
  }

  async create(obj: A): Promise<void> {
    await this.client.create(this.type, obj, {});
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(this.type, id);
  }

  // TODO: Figure out get all.
}
