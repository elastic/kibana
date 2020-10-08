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

import { SavedObjectsClientContract, SavedObject } from 'src/core/server';
import {
  SavedObjectsClientCommon,
  SavedObjectsClientCommonFindArgs,
} from '../../common/index_patterns';

export class SavedObjectsClientServerToCommon implements SavedObjectsClientCommon {
  private savedObjectClient: SavedObjectsClientContract;
  constructor(savedObjectClient: SavedObjectsClientContract) {
    this.savedObjectClient = savedObjectClient;
  }
  async find<T = unknown>(options: SavedObjectsClientCommonFindArgs) {
    const result = await this.savedObjectClient.find<T>(options);
    return result.saved_objects;
  }

  async get<T = unknown>(type: string, id: string) {
    return await this.savedObjectClient.get<T>(type, id);
  }
  async update(
    type: string,
    id: string,
    attributes: Record<string, any>,
    options: Record<string, any>
  ) {
    return (await this.savedObjectClient.update(type, id, attributes, options)) as SavedObject;
  }
  async create(type: string, attributes: Record<string, any>, options: Record<string, any>) {
    return await this.savedObjectClient.create(type, attributes, options);
  }
  delete(type: string, id: string) {
    return this.savedObjectClient.delete(type, id);
  }
}
