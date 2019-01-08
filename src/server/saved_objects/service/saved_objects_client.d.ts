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

export interface BaseOptions {
  namespace?: string;
}

export interface CreateOptions extends BaseOptions {
  id?: string;
  override?: boolean;
}

export interface BulkCreateObject {
  id?: string;
  type: string;
  attributes: SavedObjectAttributes;
  extraDocumentProperties?: string[];
}

export interface BulkCreateResponse {
  savedObjects: SavedObject[];
}

export interface FindOptions extends BaseOptions {
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: string;
  fields?: string[];
  type?: string | string[];
}

export interface FindResponse {
  savedObjects: SavedObject[];
  total: number;
  perPage: number;
  page: number;
}

export interface UpdateOptions extends BaseOptions {
  version?: number;
}

export interface BulkGetObject {
  id: string;
  type: string;
}
export type BulkGetObjects = BulkGetObject[];

export interface BulkGetResponse {
  savedObjects: SavedObject[];
}

export interface SavedObjectAttributes {
  [key: string]: string | number | boolean | null;
}

export interface SavedObject {
  id: string;
  type: string;
  version?: number;
  updatedAt?: string;
  error?: {
    message: string;
  };
  attributes: SavedObjectAttributes;
}

export interface FindRelationshipsOptions {
  size?: number;
  namespace?: string;
  filterTypes?: string[];
}

export interface FindRelationshipResponse {
  [key: string]: SavedObjectAttributes[]
}

export interface SavedObjectsClient {
  errors: any;
  create: (
    type: string,
    attributes: SavedObjectAttributes,
    options?: CreateOptions
  ) => Promise<SavedObject>;
  bulkCreate: (objects: BulkCreateObject[], options?: CreateOptions) => Promise<BulkCreateResponse>;
  delete: (type: string, id: string, options?: BaseOptions) => Promise<{}>;
  find: (options: FindOptions) => Promise<FindResponse>;
  bulkGet: (objects: BulkGetObjects, options?: BaseOptions) => Promise<BulkGetResponse>;
  get: (type: string, id: string, options?: BaseOptions) => Promise<SavedObject>;
  update: (
    type: string,
    id: string,
    attributes: SavedObjectAttributes,
    options?: UpdateOptions
  ) => Promise<SavedObject>;
  findRelationships: (
    type: string,
    id: string,
    options: FindRelationshipsOptions
  ) => Promise<FindRelationshipResponse>;
}
