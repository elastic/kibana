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

import { SavedObjectsClient } from 'src/core/public';
import {
  SavedObjectsClientCommon,
  SavedObjectsClientCommonFindArgs,
  SavedObjectCommon,
} from '../../common/index_patterns';

export class SavedObjectsClientPublicToCommon implements SavedObjectsClientCommon {
  private savedObjectClient: SavedObjectsClient;
  constructor(savedObjectClient: SavedObjectsClient) {
    this.savedObjectClient = savedObjectClient;
  }
  async find(options: SavedObjectsClientCommonFindArgs) {
    return (await this.savedObjectClient.find(options)).savedObjects as SavedObjectCommon[];
  }

  async get(type: string, id: string) {
    return (await this.savedObjectClient.get(type, id)) as SavedObjectCommon;
  }
  async update(
    type: string,
    id: string,
    attributes: Record<string, any>,
    options: Record<string, any>
  ) {
    return (await this.savedObjectClient.update(
      type,
      id,
      attributes,
      options
    )) as SavedObjectCommon;
  }
  async create(type: string, attributes: Record<string, any>, options: Record<string, any>) {
    return (await this.savedObjectClient.create(type, attributes, options)) as SavedObjectCommon;
  }
  delete(type: string, id: string) {
    return this.savedObjectClient.delete(type, id);
  }
}
