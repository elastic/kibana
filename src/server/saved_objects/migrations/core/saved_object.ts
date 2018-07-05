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

import { RawDoc, SavedObjectDoc } from './types';

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
 * Converts a saved object document from saved object format to the raw underlying shape
 * expected by calls to the elasticsearch API.
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
