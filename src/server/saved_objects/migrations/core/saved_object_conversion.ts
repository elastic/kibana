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

/**
 * The root document type. In 7.0, this needs to change to '_doc'.
 */
export const ROOT_TYPE = 'doc';

/**
 * A raw document as represented directly in the saved object index.
 */
export interface RawDoc {
  _id: string;
  _source: any;
  _type?: string;
}

/**
 * A dictionary of saved object type -> version used to determine
 * what migrations need to be applied to a saved object.
 */
export interface MigrationVersion {
  [type: string]: string;
}

/**
 * A saved object type definition that allows for miscellaneous, unknown
 * properties, as current discussions around security, ACLs, etc indicate
 * that future props are likely to be added. Migrations support this
 * scenario out of the box.
 */
export interface SavedObjectDoc {
  attributes: object;
  id: string;
  type: string;
  migrationVersion?: MigrationVersion;

  [rootProp: string]: any;
}

/**
 * Converts a document from the format that is stored in elasticsearch to the saved object client format.
 */
export function rawToSavedObject({ _id, _source }: RawDoc): SavedObjectDoc {
  const { type } = _source;
  const id = _id.slice(type.length + 1);
  const doc = {
    ..._source,
    attributes: _source[type],
    id,
    migrationVersion: _source.migrationVersion || {},
  };

  delete doc[type];
  return doc;
}

/**
 * Converts a document from the saved object client format to the format that is stored in elasticsearch.
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
    _type: ROOT_TYPE,
  };
}
