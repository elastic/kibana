/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';
import type { SavedObjectReference } from '..';

/**
 * A serializer that can be used to manually convert {@link SavedObjectsRawDoc | raw} or
 * {@link SavedObjectSanitizedDoc | sanitized} documents to the other kind.
 *
 * @public
 */
export interface ISavedObjectsSerializer {
  /**
   * Determines whether the raw document can be converted to a saved object.
   *
   * @param {SavedObjectsRawDoc} doc - The raw ES document to be tested
   * @param {SavedObjectsRawDocParseOptions} options - Options for parsing the raw document.
   */
  isRawSavedObject(doc: SavedObjectsRawDoc, options?: SavedObjectsRawDocParseOptions): boolean;

  /**
   * Converts a document from the format that is stored in elasticsearch to the saved object client format.
   *
   * @param {SavedObjectsRawDoc} doc - The raw ES document to be converted to saved object format.
   * @param {SavedObjectsRawDocParseOptions} options - Options for parsing the raw document.
   */
  rawToSavedObject<T = unknown>(
    doc: SavedObjectsRawDoc,
    options?: SavedObjectsRawDocParseOptions
  ): SavedObjectSanitizedDoc<T>;

  /**
   * Converts a document from the saved object client format to the format that is stored in elasticsearch.
   *
   * @param {SavedObjectSanitizedDoc} savedObj - The saved object to be converted to raw ES format.
   */
  savedObjectToRaw(savedObj: SavedObjectSanitizedDoc): SavedObjectsRawDoc;

  /**
   * Given a saved object type and id, generates the compound id that is stored in the raw document.
   *
   * @param {string} namespace - The namespace of the saved object
   * @param {string} type - The saved object type
   * @param {string} id - The id of the saved object
   */
  generateRawId(namespace: string | undefined, type: string, id: string): string;

  /**
   * Given a saved object type and id, generates the compound id that is stored in the raw document for its legacy URL alias.
   *
   * @param {string} namespace - The namespace of the saved object
   * @param {string} type - The saved object type
   * @param {string} id - The id of the saved object
   */
  generateRawLegacyUrlAliasId(namespace: string | undefined, type: string, id: string): string;
}

/**
 * A raw document as represented directly in the saved object index.
 *
 * @public
 */
export interface SavedObjectsRawDoc {
  _id: string;
  _source: SavedObjectsRawDocSource;
  _seq_no?: number;
  _primary_term?: number;
}

/** @public */
export interface SavedObjectsRawDocSource {
  type: string;
  namespace?: string;
  namespaces?: string[];
  migrationVersion?: SavedObjectsMigrationVersion;
  typeMigrationVersion?: string;
  updated_at?: string;
  created_at?: string;
  references?: SavedObjectReference[];
  originId?: string;

  [typeMapping: string]: any;
}

/**
 * Saved Object base document
 *
 * @public
 */
interface SavedObjectDoc<T = unknown> {
  attributes: T;
  id: string;
  type: string;
  namespace?: string;
  namespaces?: string[];
  migrationVersion?: SavedObjectsMigrationVersion;
  coreMigrationVersion?: string;
  typeMigrationVersion?: string;
  version?: string;
  updated_at?: string;
  created_at?: string;
  originId?: string;
}

/**
 * Describes Saved Object documents from Kibana < 7.0.0 which don't have a
 * `references` root property defined. This type should only be used in
 * migrations.
 *
 * @public
 */
export type SavedObjectUnsanitizedDoc<T = unknown> = SavedObjectDoc<T> & {
  references?: SavedObjectReference[];
};

/**
 * Describes Saved Object documents that have passed through the migration
 * framework and are guaranteed to have a `references` root property.
 *
 * @public
 */
export type SavedObjectSanitizedDoc<T = unknown> = SavedObjectDoc<T> & {
  references: SavedObjectReference[];
};

/**
 * Options that can be specified when using the saved objects serializer to parse a raw document.
 *
 * @public
 */
export interface SavedObjectsRawDocParseOptions {
  /**
   * Optional setting to allow for lax handling of the raw document ID and namespace field. This is needed when a previously
   * single-namespace object type is converted to a multi-namespace object type, and it is only intended to be used during upgrade
   * migrations.
   *
   * If not specified, the default treatment is `strict`.
   */
  namespaceTreatment?: 'strict' | 'lax';

  /**
   * Optional setting to allow compatible handling of the `migrationVersion` field.
   * This is needed to return the `migrationVersion` field in the same format as it was before migrating to the `typeMigrationVersion` property.
   *
   * @default 'raw'
   */
  migrationVersionCompatibility?: 'compatible' | 'raw';
}
