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

import {
  BaseOptions,
  BulkCreateObject,
  BulkCreateResponse,
  BulkGetObjects,
  BulkGetResponse,
  CreateOptions,
  CreateResponse,
  FindOptions,
  FindResponse,
  GetResponse,
  SavedObject,
  SavedObjectAttributes,
  UpdateOptions,
  UpdateResponse,
} from '../saved_objects_client';
import * as errors from './errors';

export interface SavedObjectsRepositoryOptions {
  index: string | string[];
  mappings: unknown;
  callCluster: unknown;
  schema: unknown;
  serializer: unknown;
  migrator: unknown;
  onBeforeWrite: unknown;
}

export declare class SavedObjectsRepository {
  public static errors: typeof errors;
  public errors: typeof errors;
  public incrementCounter: (
    type: string,
    id: string,
    counterFieldName: string,
    options?: BaseOptions
  ) => Promise<SavedObject>;

  constructor(options: SavedObjectsRepositoryOptions);

  public create<T extends SavedObjectAttributes = any>(
    type: string,
    attributes: T,
    options?: CreateOptions
  ): Promise<CreateResponse<T>>;

  public bulkCreate<T extends SavedObjectAttributes = any>(
    objects: Array<BulkCreateObject<T>>,
    options?: CreateOptions
  ): Promise<BulkCreateResponse<T>>;

  public delete(type: string, id: string, options?: BaseOptions): Promise<{}>;

  public find<T extends SavedObjectAttributes = any>(
    options: FindOptions
  ): Promise<FindResponse<T>>;

  public bulkGet<T extends SavedObjectAttributes = any>(
    objects: BulkGetObjects,
    options?: BaseOptions
  ): Promise<BulkGetResponse<T>>;

  public get<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    options?: BaseOptions
  ): Promise<GetResponse<T>>;

  public update<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options?: UpdateOptions
  ): Promise<UpdateResponse<T>>;
}
