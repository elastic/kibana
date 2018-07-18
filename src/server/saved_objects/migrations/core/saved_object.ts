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

import { RawDoc } from './call_cluster';

export interface MigrationVersion {
  [type: string]: string;
}

export interface SavedObjectDoc {
  attributes: any;
  id: string;
  type: string;
  migrationVersion?: MigrationVersion;

  // We're going to allow for miscellaneous root-level properties
  // in saved objects, which amount to meta-information that various
  // plugins can put on any saved object. Things like security ACLs
  // might fall into this category.
  [rootProp: string]: any;
}

/**
 * Converts a document from the format that is stored in elasticsearch to the saved object client format.
 *
 * @export
 * @param {RawDoc} { _id, _source }
 * @returns {SavedObjectDoc}
 */
export function rawToSavedObject({ _id, _source }: RawDoc): SavedObjectDoc {
  const { type } = _source;
  const id = _id.slice(type.length + 1);
  const doc = {
    ..._source,
    attributes: _source[type],
    id,
  };

  delete doc[type];
  return doc;
}

/**
 * Converts a document from the saved object client format to the format that is stored in elasticsearch.
 *
 * @export
 * @param {SavedObjectDoc} savedObj
 * @returns {RawDoc}
 */
export function savedObjectToRaw(savedObj: SavedObjectDoc): RawDoc {
  const { id, type, attributes } = savedObj;
  const source = {
    ...savedObj,
    [type]: attributes,
  };

  delete source.id;
  delete source.attributes;

  return {
    _id: `${type}:${id}`,
    _source: source,
  };
}
