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

import uuid from 'uuid';
import { decodeVersion, encodeVersion } from '../version';
import { ISavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { SavedObjectsRawDoc, SavedObjectSanitizedDoc } from './types';

/**
 * A serializer that can be used to manually convert {@link SavedObjectsRawDoc | raw} or
 * {@link SavedObjectSanitizedDoc | sanitized} documents to the other kind.
 *
 * @remarks Serializer instances should only be created and accessed by calling {@link SavedObjectsServiceStart.createSerializer}
 *
 * @public
 */
export class SavedObjectsSerializer {
  private readonly registry: ISavedObjectTypeRegistry;

  /**
   * @internal
   */
  constructor(registry: ISavedObjectTypeRegistry) {
    this.registry = registry;
  }
  /**
   * Determines whether or not the raw document can be converted to a saved object.
   *
   * @param {SavedObjectsRawDoc} rawDoc - The raw ES document to be tested
   */
  public isRawSavedObject(rawDoc: SavedObjectsRawDoc) {
    const { type, namespace } = rawDoc._source;
    const namespacePrefix =
      namespace && this.registry.isSingleNamespace(type) ? `${namespace}:` : '';
    return Boolean(
      type &&
        rawDoc._id.startsWith(`${namespacePrefix}${type}:`) &&
        rawDoc._source.hasOwnProperty(type)
    );
  }

  /**
   * Converts a document from the format that is stored in elasticsearch to the saved object client format.
   *
   *  @param {SavedObjectsRawDoc} doc - The raw ES document to be converted to saved object format.
   */
  public rawToSavedObject(doc: SavedObjectsRawDoc): SavedObjectSanitizedDoc {
    const { _id, _source, _seq_no, _primary_term } = doc;
    const { type, namespace, namespaces, originId } = _source;

    const version =
      _seq_no != null || _primary_term != null
        ? encodeVersion(_seq_no!, _primary_term!)
        : undefined;

    return {
      type,
      id: this.trimIdPrefix(namespace, type, _id),
      ...(namespace && this.registry.isSingleNamespace(type) && { namespace }),
      ...(namespaces && this.registry.isMultiNamespace(type) && { namespaces }),
      ...(originId && { originId }),
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
   * @param {SavedObjectSanitizedDoc} savedObj - The saved object to be converted to raw ES format.
   */
  public savedObjectToRaw(savedObj: SavedObjectSanitizedDoc): SavedObjectsRawDoc {
    const {
      id,
      type,
      namespace,
      namespaces,
      originId,
      attributes,
      migrationVersion,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      updated_at,
      version,
      references,
    } = savedObj;
    const source = {
      [type]: attributes,
      type,
      references,
      ...(namespace && this.registry.isSingleNamespace(type) && { namespace }),
      ...(namespaces && this.registry.isMultiNamespace(type) && { namespaces }),
      ...(originId && { originId }),
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
      namespace && this.registry.isSingleNamespace(type) ? `${namespace}:` : '';
    return `${namespacePrefix}${type}:${id || uuid.v1()}`;
  }

  private trimIdPrefix(namespace: string | undefined, type: string, id: string) {
    assertNonEmptyString(id, 'document id');
    assertNonEmptyString(type, 'saved object type');

    const namespacePrefix =
      namespace && this.registry.isSingleNamespace(type) ? `${namespace}:` : '';
    const prefix = `${namespacePrefix}${type}:`;

    if (!id.startsWith(prefix)) {
      return id;
    }

    return id.slice(prefix.length);
  }
}

function assertNonEmptyString(value: string, name: string) {
  if (!value || typeof value !== 'string') {
    throw new TypeError(`Expected "${value}" to be a ${name}`);
  }
}
