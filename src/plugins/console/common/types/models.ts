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

import { TextObject } from '../text_object';

export interface IdObject {
  id: string;
}

export interface ObjectStorage<O extends IdObject> {
  /**
   * Creates a new object in the underlying persistance layer.
   *
   * @remarks Does not accept an ID, a new ID is generated and returned with the newly created object.
   */
  create(obj: Omit<O, 'id'>): Promise<O>;

  /**
   * This method should update specific object in the persistance layer.
   */
  update(obj: O): Promise<void>;

  /**
   * A function that will return all of the objects in the persistance layer.
   *
   * @remarks Unless an error is thrown this function should always return an array (empty if there are not objects present).
   */
  findAll(): Promise<O[]>;
}

export interface ObjectStorageClient {
  text: ObjectStorage<TextObject>;
}
