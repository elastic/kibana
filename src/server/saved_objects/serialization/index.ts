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

/*
 * This file contains the logic for transforming saved objects to / from
 * the raw document format as stored in ElasticSearch.
 */

import uuid from 'uuid';
import { SavedObjectsSchema } from '../schema';

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
  _version?: number;
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
  namespace?: string;
  migrationVersion?: MigrationVersion;
  version?: number;
  updated_at?: Date;
  references?: object[];

  [rootProp: string]: any;
}

function assertNonEmptyString(value: string, name: string) {
  if (!value || typeof value !== 'string') {
    throw new TypeError(`Expected "${value}" to be a ${name}`);
  }
}

export class SavedObjectsSerializer {
  private readonly schema: SavedObjectsSchema;

  constructor(schema: SavedObjectsSchema) {
    this.schema = schema;
  }
  /**
   * Determines whether or not the raw document can be converted to a saved object.
   *
   * @param {RawDoc} rawDoc - The raw ES document to be tested
   */
  public isRawSavedObject(rawDoc: RawDoc) {
    const { type, namespace } = rawDoc._source;
    const namespacePrefix =
      namespace && !this.schema.isNamespaceAgnostic(type) ? `${namespace}:` : '';
    return (
      type &&
      rawDoc._id.startsWith(`${namespacePrefix}${type}:`) &&
      rawDoc._source.hasOwnProperty(type)
    );
  }

  /**
   * Converts a document from the format that is stored in elasticsearch to the saved object client format.
   *
   *  @param {RawDoc} rawDoc - The raw ES document to be converted to saved object format.
   */
  public rawToSavedObject({ _id, _source, _version }: RawDoc): SavedObjectDoc {
    const { type, namespace } = _source;
    return {
      type,
      id: this.trimIdPrefix(namespace, type, _id),
      ...(namespace && !this.schema.isNamespaceAgnostic(type) && { namespace }),
      attributes: _source[type],
      ...(_source.migrationVersion && { migrationVersion: _source.migrationVersion }),
      ...(_source.updated_at && { updated_at: _source.updated_at }),
      ...(_source.references && { references: _source.references }),
      ...(_version != null && { version: _version }),
    };
  }

  /**
   * Converts a document from the saved object client format to the format that is stored in elasticsearch.
   *
   * @param {SavedObjectDoc} savedObj - The saved object to be converted to raw ES format.
   */
  public savedObjectToRaw(savedObj: SavedObjectDoc): RawDoc {
    const {
      id,
      type,
      namespace,
      attributes,
      migrationVersion,
      updated_at,
      version,
      references,
    } = savedObj;
    const source = {
      [type]: attributes,
      type,
      ...(namespace && !this.schema.isNamespaceAgnostic(type) && { namespace }),
      ...(migrationVersion && { migrationVersion }),
      ...(updated_at && { updated_at }),
      ...(references && { references }),
    };

    return {
      _id: this.generateRawId(namespace, type, id),
      _source: source,
      _type: ROOT_TYPE,
      ...(version != null && { _version: version }),
    };
  }

  /**
   * Given a saved object type and id, generates the compound id that is stored in the raw document.
   *
   * @param {string} namespace - The namespace of the saved object
   * @param {string} type - The saved object type
   * @param {string} id - The id of the saved object
   */
  public generateRawId(namespace: string | undefined, type: string, id?: string) {
    const namespacePrefix =
      namespace && !this.schema.isNamespaceAgnostic(type) ? `${namespace}:` : '';
    return `${namespacePrefix}${type}:${id || uuid.v1()}`;
  }

  private trimIdPrefix(namespace: string | undefined, type: string, id: string) {
    assertNonEmptyString(id, 'document id');
    assertNonEmptyString(type, 'saved object type');

    const namespacePrefix =
      namespace && !this.schema.isNamespaceAgnostic(type) ? `${namespace}:` : '';
    const prefix = `${namespacePrefix}${type}:`;

    if (!id.startsWith(prefix)) {
      return id;
    }

    return id.slice(prefix.length);
  }
}
