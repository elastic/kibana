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
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindOptionsReference,
  SavedObjectReference,
} from 'kibana/public';
import { SavedObject } from '../types';
import { StringUtils } from './helpers/string_utils';

export interface SavedObjectLoaderFindOptions {
  size?: number;
  fields?: string[];
  hasReference?: SavedObjectsFindOptionsReference[];
}

/**
 * The SavedObjectLoader class provides some convenience functions
 * to load and save one kind of saved objects (specified in the constructor).
 *
 * It is based on the SavedObjectClient which implements loading and saving
 * in an abstract, type-agnostic way. If possible, use SavedObjectClient directly
 * to avoid pulling in extra functionality which isn't used.
 */
export class SavedObjectLoader {
  private readonly Class: (id: string) => SavedObject;
  public type: string;
  public lowercaseType: string;
  public loaderProperties: Record<string, string>;

  constructor(
    SavedObjectClass: any,
    private readonly savedObjectsClient: SavedObjectsClientContract
  ) {
    this.type = SavedObjectClass.type;
    this.Class = SavedObjectClass;
    this.lowercaseType = this.type.toLowerCase();

    this.loaderProperties = {
      name: `${this.lowercaseType}s`,
      noun: StringUtils.upperFirst(this.type),
      nouns: `${this.lowercaseType}s`,
    };
  }

  /**
   * Retrieve a saved object by id or create new one.
   * Returns a promise that completes when the object finishes
   * initializing.
   * @param opts
   * @returns {Promise<SavedObject>}
   */
  async get(opts?: Record<string, unknown> | string) {
    // can accept object as argument in accordance to SavedVis class
    // see src/plugins/saved_objects/public/saved_object/saved_object_loader.ts
    // @ts-ignore
    const obj = new this.Class(opts);
    return obj.init();
  }

  urlFor(id: string) {
    return `#/${this.lowercaseType}/${encodeURIComponent(id)}`;
  }

  async delete(ids: string | string[]) {
    const idsUsed = !Array.isArray(ids) ? [ids] : ids;

    const deletions = idsUsed.map((id) => {
      // @ts-ignore
      const savedObject = new this.Class(id);
      return savedObject.delete();
    });
    await Promise.all(deletions);
  }

  /**
   * Updates source to contain an id, url and references fields, and returns the updated
   * source object.
   * @param source
   * @param id
   * @param references
   * @returns {source} The modified source object, with an id and url field.
   */
  mapHitSource(
    source: Record<string, unknown>,
    id: string,
    references: SavedObjectReference[] = []
  ) {
    source.id = id;
    source.url = this.urlFor(id);
    source.references = references;
    return source;
  }

  /**
   * Updates hit.attributes to contain an id and url field, and returns the updated
   * attributes object.
   * @param hit
   * @returns {hit.attributes} The modified hit.attributes object, with an id and url field.
   */
  mapSavedObjectApiHits({
    attributes,
    id,
    references = [],
  }: {
    attributes: Record<string, unknown>;
    id: string;
    references?: SavedObjectReference[];
  }) {
    return this.mapHitSource(attributes, id, references);
  }

  /**
   * TODO: Rather than use a hardcoded limit, implement pagination. See
   * https://github.com/elastic/kibana/issues/8044 for reference.
   *
   * @param search
   * @param size
   * @param fields
   * @returns {Promise}
   */
  private findAll(
    search: string = '',
    { size = 100, fields, hasReference }: SavedObjectLoaderFindOptions
  ) {
    return this.savedObjectsClient
      .find<Record<string, unknown>>({
        type: this.lowercaseType,
        search: search ? `${search}*` : undefined,
        perPage: size,
        page: 1,
        searchFields: ['title^3', 'description'],
        defaultSearchOperator: 'AND',
        fields,
        hasReference,
      } as SavedObjectsFindOptions)
      .then((resp) => {
        return {
          total: resp.total,
          hits: resp.savedObjects.map((savedObject) => this.mapSavedObjectApiHits(savedObject)),
        };
      });
  }

  find(search: string = '', sizeOrOptions: number | SavedObjectLoaderFindOptions = 100) {
    const options: SavedObjectLoaderFindOptions =
      typeof sizeOrOptions === 'number'
        ? {
            size: sizeOrOptions,
          }
        : sizeOrOptions;

    return this.findAll(search, options).then((resp) => {
      return {
        total: resp.total,
        hits: resp.hits.filter((savedObject) => !savedObject.error),
      };
    });
  }
}
