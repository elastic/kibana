/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import typeDetect from 'type-detect';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsSerializer,
  SavedObjectsRawDoc,
  SavedObjectSanitizedDoc,
  SavedObjectsRawDocParseOptions,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { LEGACY_URL_ALIAS_TYPE } from '../legacy_alias';
import { decodeVersion, encodeVersion } from '../version';

/**
 * Core internal implementation of {@link ISavedObjectsSerializer}
 *
 * @remarks Serializer instances should only be created and accessed by calling {@link SavedObjectsServiceStart.createSerializer}
 *
 * @internal
 */
export class SavedObjectsSerializer implements ISavedObjectsSerializer {
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
   * @param {SavedObjectsRawDoc} doc - The raw ES document to be tested
   * @param {SavedObjectsRawDocParseOptions} options - Options for parsing the raw document.
   */
  public isRawSavedObject(doc: SavedObjectsRawDoc, options: SavedObjectsRawDocParseOptions = {}) {
    try {
      this.checkIsRawSavedObject(doc, options);
      return true;
    } catch (error) {
      // do nothing
    }
    return false;
  }

  private checkIsRawSavedObject(
    doc: SavedObjectsRawDoc,
    options: SavedObjectsRawDocParseOptions = {}
  ) {
    const { namespaceTreatment = 'strict' } = options;
    const { _id, _source } = doc;
    const { type, namespace } = _source;
    if (!type) {
      throw new Error(`Raw document '${_id}' is missing _source.type field`);
    }
    const { idMatchesPrefix, prefix } = this.parseIdPrefix(
      namespace,
      type,
      _id,
      namespaceTreatment
    );
    if (!idMatchesPrefix) {
      throw new Error(`Raw document '${_id}' does not start with expected prefix '${prefix}'`);
    }
    return idMatchesPrefix;
  }

  /**
   * Converts a document from the format that is stored in elasticsearch to the saved object client format.
   *
   * @param {SavedObjectsRawDoc} doc - The raw ES document to be converted to saved object format.
   * @param {SavedObjectsRawDocParseOptions} options - Options for parsing the raw document.
   */
  public rawToSavedObject<T = unknown>(
    doc: SavedObjectsRawDoc,
    options: SavedObjectsRawDocParseOptions = {}
  ): SavedObjectSanitizedDoc<T> {
    this.checkIsRawSavedObject(doc, options); // throws a descriptive error if the document is not a saved object

    const { namespaceTreatment = 'strict', migrationVersionCompatibility = 'raw' } = options;
    const { _id, _source, _seq_no, _primary_term } = doc;
    const {
      type,
      namespaces,
      originId,
      references,
      coreMigrationVersion,
      typeMigrationVersion,
      migrationVersion = migrationVersionCompatibility === 'compatible' && typeMigrationVersion
        ? { [type]: typeMigrationVersion }
        : undefined,
    } = _source;

    const version =
      _seq_no != null || _primary_term != null
        ? encodeVersion(_seq_no!, _primary_term!)
        : undefined;
    const { id, namespace } = this.trimIdPrefix(_source.namespace, type, _id, namespaceTreatment);
    const includeNamespace =
      namespace && (namespaceTreatment === 'lax' || this.registry.isSingleNamespace(type));
    const includeNamespaces = this.registry.isMultiNamespace(type);

    return {
      type,
      id,
      ...(includeNamespace && { namespace }),
      ...(includeNamespaces && { namespaces }),
      ...(originId && { originId }),
      attributes: _source[type],
      references: references || [],
      ...(migrationVersion && { migrationVersion }),
      ...(coreMigrationVersion && { coreMigrationVersion }),
      ...(typeMigrationVersion != null ? { typeMigrationVersion } : {}),
      ...(_source.updated_at && { updated_at: _source.updated_at }),
      ...(_source.created_at && { created_at: _source.created_at }),
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
      created_at: createdAt,
      version,
      references,
      coreMigrationVersion,
      typeMigrationVersion,
    } = savedObj;
    const source = {
      [type]: attributes,
      type,
      references,
      ...(namespace && this.registry.isSingleNamespace(type) && { namespace }),
      ...(namespaces && this.registry.isMultiNamespace(type) && { namespaces }),
      ...(originId && { originId }),
      ...(migrationVersion && { migrationVersion }),
      ...(coreMigrationVersion && { coreMigrationVersion }),
      ...(typeMigrationVersion != null ? { typeMigrationVersion } : {}),
      ...(updated_at && { updated_at }),
      ...(createdAt && { created_at: createdAt }),
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
  public generateRawId(namespace: string | undefined, type: string, id: string) {
    const namespacePrefix =
      namespace && this.registry.isSingleNamespace(type) ? `${namespace}:` : '';
    return `${namespacePrefix}${type}:${id}`;
  }

  /**
   * Given a saved object type and id, generates the compound id that is stored in the raw document for its legacy URL alias.
   *
   * @param {string} namespace - The namespace of the saved object
   * @param {string} type - The saved object type
   * @param {string} id - The id of the saved object
   */
  public generateRawLegacyUrlAliasId(namespace: string | undefined, type: string, id: string) {
    const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);
    return `${LEGACY_URL_ALIAS_TYPE}:${namespaceString}:${type}:${id}`;
  }

  /**
   * Given a document's source namespace, type, and raw ID, trim the ID prefix (based on the namespaceType), returning the object ID and the
   * detected namespace. A single-namespace object is only considered to exist in a namespace if its raw ID is prefixed by that *and* it has
   * the namespace field in its source.
   */
  private trimIdPrefix(
    sourceNamespace: string | undefined,
    type: string,
    id: string,
    namespaceTreatment: 'strict' | 'lax'
  ) {
    assertNonEmptyString(id, 'document id');
    assertNonEmptyString(type, 'saved object type');

    const { prefix, idMatchesPrefix, namespace } = this.parseIdPrefix(
      sourceNamespace,
      type,
      id,
      namespaceTreatment
    );
    return {
      id: idMatchesPrefix ? id.slice(prefix.length) : id,
      namespace,
    };
  }

  private parseIdPrefix(
    sourceNamespace: string | undefined,
    type: string,
    id: string,
    namespaceTreatment: 'strict' | 'lax'
  ) {
    let prefix: string; // the prefix that is used to validate this raw object ID
    let namespace: string | undefined; // the namespace that is in the raw object ID (only for single-namespace objects)
    const parseFlexibly = namespaceTreatment === 'lax' && this.registry.isMultiNamespace(type);
    if (sourceNamespace && (this.registry.isSingleNamespace(type) || parseFlexibly)) {
      prefix = `${sourceNamespace}:${type}:`;
      if (parseFlexibly && !checkIdMatchesPrefix(id, prefix)) {
        prefix = `${type}:`;
      } else {
        // this is either a single-namespace object, or is being converted into a multi-namespace object
        namespace = sourceNamespace;
      }
    } else {
      // there is no source namespace, OR there is a source namespace but this is not a single-namespace object
      prefix = `${type}:`;
    }

    return {
      prefix,
      idMatchesPrefix: checkIdMatchesPrefix(id, prefix),
      namespace,
    };
  }
}

function checkIdMatchesPrefix(id: string, prefix: string) {
  return id.startsWith(prefix) && id.length > prefix.length;
}

function assertNonEmptyString(value: string, name: string) {
  if (!value || typeof value !== 'string') {
    throw new TypeError(
      `Expected ${name} to be a string but given [${typeDetect(value)}] with [${value}] value.`
    );
  }
}
