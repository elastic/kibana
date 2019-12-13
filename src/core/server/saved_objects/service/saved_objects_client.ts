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

import { ISavedObjectsRepository } from './lib';
import {
  SavedObject,
  SavedObjectAttributes,
  SavedObjectReference,
  SavedObjectsMigrationVersion,
  SavedObjectsBaseOptions,
  MutatingOperationRefreshSetting,
  SavedObjectsFindOptions,
} from '../types';
import { SavedObjectsErrorHelpers } from './lib/errors';

/**
 *
 * @public
 */
export interface SavedObjectsCreateOptions extends SavedObjectsBaseOptions {
  /** (not recommended) Specify an id for the document */
  id?: string;
  /** Overwrite existing documents (defaults to false) */
  overwrite?: boolean;
  /** {@inheritDoc SavedObjectsMigrationVersion} */
  migrationVersion?: SavedObjectsMigrationVersion;
  references?: SavedObjectReference[];
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkCreateObject<T extends SavedObjectAttributes = any> {
  id?: string;
  type: string;
  attributes: T;
  references?: SavedObjectReference[];
  /** {@inheritDoc SavedObjectsMigrationVersion} */
  migrationVersion?: SavedObjectsMigrationVersion;
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkUpdateObject<T extends SavedObjectAttributes = any>
  extends Pick<SavedObjectsUpdateOptions, 'version' | 'references'> {
  /** The ID of this Saved Object, guaranteed to be unique for all objects of the same `type` */
  id: string;
  /**  The type of this Saved Object. Each plugin can define it's own custom Saved Object types. */
  type: string;
  /** {@inheritdoc SavedObjectAttributes} */
  attributes: Partial<T>;
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkResponse<T extends SavedObjectAttributes = any> {
  saved_objects: Array<SavedObject<T>>;
}

/**
 * Return type of the Saved Objects `find()` method.
 *
 * *Note*: this type is different between the Public and Server Saved Objects
 * clients.
 *
 * @public
 */
export interface SavedObjectsFindResponse<T extends SavedObjectAttributes = any> {
  saved_objects: Array<SavedObject<T>>;
  total: number;
  per_page: number;
  page: number;
}

/**
 *
 * @public
 */
export interface SavedObjectsUpdateOptions extends SavedObjectsBaseOptions {
  /** An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control. */
  version?: string;
  /** {@inheritdoc SavedObjectReference} */
  references?: SavedObjectReference[];
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
}

/**
 *
 * @public
 */
export interface SavedObjectsUpdateNamespacesOptions {
  /** An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control. */
  version?: string;
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkUpdateOptions extends SavedObjectsBaseOptions {
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
}

/**
 *
 * @public
 */
export interface SavedObjectsDeleteOptions extends SavedObjectsBaseOptions {
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkGetObject {
  id: string;
  type: string;
  /** SavedObject fields to include in the response */
  fields?: string[];
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkResponse<T extends SavedObjectAttributes = any> {
  saved_objects: Array<SavedObject<T>>;
}

/**
 *
 * @public
 */
export interface SavedObjectsBulkUpdateResponse<T extends SavedObjectAttributes = any> {
  saved_objects: Array<SavedObjectsUpdateResponse<T>>;
}

/**
 *
 * @public
 */
export interface SavedObjectsUpdateResponse<T extends SavedObjectAttributes = any>
  extends Omit<SavedObject<T>, 'attributes' | 'references'> {
  attributes: Partial<T>;
  references: SavedObjectReference[] | undefined;
}

/**
 *
 * @public
 */
export class SavedObjectsClient {
  public static errors = SavedObjectsErrorHelpers;
  public errors = SavedObjectsErrorHelpers;

  private _repository: ISavedObjectsRepository;

  /** @internal */
  constructor(repository: ISavedObjectsRepository) {
    this._repository = repository;
  }

  /**
   * Persists a SavedObject
   *
   * @param type
   * @param attributes
   * @param options
   */
  async create<T extends SavedObjectAttributes = any>(
    type: string,
    attributes: T,
    options?: SavedObjectsCreateOptions
  ) {
    return await this._repository.create(type, attributes, options);
  }

  /**
   * Persists multiple documents batched together as a single request
   *
   * @param objects
   * @param options
   */
  async bulkCreate<T extends SavedObjectAttributes = any>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsCreateOptions
  ) {
    return await this._repository.bulkCreate(objects, options);
  }

  /**
   * Deletes a SavedObject
   *
   * @param type
   * @param id
   * @param options
   */
  async delete(type: string, id: string, options: SavedObjectsDeleteOptions = {}) {
    return await this._repository.delete(type, id, options);
  }

  /**
   * Find all SavedObjects matching the search query
   *
   * @param options
   */
  async find<T extends SavedObjectAttributes = any>(
    options: SavedObjectsFindOptions
  ): Promise<SavedObjectsFindResponse<T>> {
    return await this._repository.find(options);
  }

  /**
   * Returns an array of objects by id
   *
   * @param objects - an array of ids, or an array of objects containing id, type and optionally fields
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  async bulkGet<T extends SavedObjectAttributes = any>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    return await this._repository.bulkGet(objects, options);
  }

  /**
   * Retrieves a single object
   *
   * @param type - The type of SavedObject to retrieve
   * @param id - The ID of the SavedObject to retrieve
   * @param options
   */
  async get<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObject<T>> {
    return await this._repository.get(type, id, options);
  }

  /**
   * Updates an SavedObject
   *
   * @param type
   * @param id
   * @param options
   */
  async update<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ): Promise<SavedObjectsUpdateResponse<T>> {
    return await this._repository.update(type, id, attributes, options);
  }

  /**
   * Updates a SavedObject's namespaces
   *
   * @param type
   * @param id
   * @param namespaces
   * @param options
   */
  async updateNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options: SavedObjectsUpdateNamespacesOptions = {}
  ): Promise<void> {
    return await this._repository.updateNamespaces(type, id, namespaces, options);
  }

  /**
   * Bulk Updates multiple SavedObject at once
   *
   * @param objects
   */
  async bulkUpdate<T extends SavedObjectAttributes = any>(
    objects: Array<SavedObjectsBulkUpdateObject<T>>,
    options?: SavedObjectsBulkUpdateOptions
  ): Promise<SavedObjectsBulkUpdateResponse<T>> {
    return await this._repository.bulkUpdate(objects, options);
  }
}
