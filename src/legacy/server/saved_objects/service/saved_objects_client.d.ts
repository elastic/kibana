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

import { errors, SavedObjectsRepository } from './lib';

export interface BaseOptions {
  namespace?: string;
}

export interface CreateOptions extends BaseOptions {
  id?: string;
  overwrite?: boolean;
  migrationVersion?: MigrationVersion;
  references?: SavedObjectReference[];
}

export interface BulkCreateObject<T extends SavedObjectAttributes = any> {
  id?: string;
  type: string;
  attributes: T;
  extraDocumentProperties?: string[];
}

export interface BulkCreateResponse<T extends SavedObjectAttributes = any> {
  saved_objects: Array<SavedObject<T>>;
}

export interface FindOptions extends BaseOptions {
  type?: string | string[];
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: string;
  fields?: string[];
  search?: string;
  searchFields?: string[];
  hasReference?: { type: string; id: string };
  defaultSearchOperator?: 'AND' | 'OR';
}

export interface FindResponse<T extends SavedObjectAttributes = any> {
  saved_objects: Array<SavedObject<T>>;
  total: number;
  per_page: number;
  page: number;
}

export interface UpdateOptions extends BaseOptions {
  version?: string;
}

export interface BulkGetObject {
  id: string;
  type: string;
}
export type BulkGetObjects = BulkGetObject[];

export interface BulkGetResponse<T extends SavedObjectAttributes = any> {
  saved_objects: Array<SavedObject<T>>;
}

export interface MigrationVersion {
  [pluginName: string]: string;
}

export interface SavedObjectAttributes {
  [key: string]: SavedObjectAttributes | string | number | boolean | null;
}

export interface VisualizationAttributes extends SavedObjectAttributes {
  visState: string;
}

export interface SavedObject<T extends SavedObjectAttributes = any> {
  id: string;
  type: string;
  version?: string;
  updated_at?: string;
  error?: {
    message: string;
    statusCode: number;
  };
  attributes: T;
  references: SavedObjectReference[];
  migrationVersion?: MigrationVersion;
}

export interface SavedObjectReference {
  name: string;
  type: string;
  id: string;
}

export type GetResponse<T extends SavedObjectAttributes = any> = SavedObject<T>;
export type CreateResponse<T extends SavedObjectAttributes = any> = SavedObject<T>;
export type UpdateResponse<T extends SavedObjectAttributes = any> = SavedObject<T>;

export declare class SavedObjectsClient {
  public static errors: typeof errors;
  public errors: typeof errors;

  constructor(repository: SavedObjectsRepository);

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
