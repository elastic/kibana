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

/* eslint-disable @typescript-eslint/camelcase */

import uuid from 'uuid';
import { SavedObjectsSchema } from '../schema';
import { decodeVersion, encodeVersion } from '../version';
import { MigrationVersion, SavedObjectReference } from '../service/saved_objects_client';

/**
 * A raw document as represented directly in the saved object index.
 */
export interface RawDoc {
  _id: string;
  _source: any;
  _type?: string;
  _seq_no?: number;
  _primary_term?: number;
}

/**
 * A saved object type definition that allows for miscellaneous, unknown
 * properties, as current discussions around security, ACLs, etc indicate
 * that future props are likely to be added. Migrations support this
 * scenario out of the box.
 */
interface SavedObjectDoc {
  attributes: object;
  id?: string; // NOTE: SavedObjectDoc is used for uncreated objects where `id` is optional
  type: string;
  namespace?: string;
  migrationVersion?: MigrationVersion;
  version?: string;
  updated_at?: string;

  [rootProp: string]: any;
}

interface Referencable {
  references: SavedObjectReference[];
}

/**
 * We want to have two types, one that guarantees a "references" attribute
 * will exist and one that allows it to be null. Since we're not migrating
 * all the saved objects to have a "references" array, we need to support
 * the scenarios where it may be missing (ex migrations).
 */
export type RawSavedObjectDoc = SavedObjectDoc & Partial<Referencable>;
export type SanitizedSavedObjectDoc = SavedObjectDoc & Referencable;

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
  public rawToSavedObject(doc: RawDoc): SanitizedSavedObjectDoc {
    const { _id, _source, _seq_no, _primary_term } = doc;
    const { type, namespace } = _source;

    const version =
      _seq_no != null || _primary_term != null
        ? encodeVersion(_seq_no!, _primary_term!)
        : undefined;

    return {
      type,
      id: this.trimIdPrefix(namespace, type, _id),
      ...(namespace && !this.schema.isNamespaceAgnostic(type) && { namespace }),
      attributes: _source[type],
      references: _source.references || [],
      ...(_source.migrationVersion && { migrationVersion: _source.migrationVersion }),
      ...(_source.updated_at && { updated_at: _source.updated_at }),
      ...(version && { version }),
    };
  }

  /**
   * Converts a document from the saved object client format to the format that is stored in elasticsearch.
   *
   * @param {SanitizedSavedObjectDoc} savedObj - The saved object to be converted to raw ES format.
   */
  public savedObjectToRaw(savedObj: SanitizedSavedObjectDoc): RawDoc {
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
      references,
      ...(namespace && !this.schema.isNamespaceAgnostic(type) && { namespace }),
      ...(migrationVersion && { migrationVersion }),
      ...(updated_at && { updated_at }),
    };

    return {
      _id: this.generateRawId(namespace, type, id),
      _source: source,
      ...(version != null && decodeVersion(version)),
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
