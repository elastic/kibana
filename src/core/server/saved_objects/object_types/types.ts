/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A legacy URL alias is created for an object when it is converted from a single-namespace type to a multi-namespace type. This enables us
 * to preserve functionality of existing URLs for objects whose IDs have been changed during the conversion process, by way of the new
 * `SavedObjectsClient.resolve()` API.
 *
 * Legacy URL aliases are only created by the `DocumentMigrator`, and will always have a saved object ID as follows:
 *
 * ```
 * `${targetNamespace}:${targetType}:${sourceId}`
 * ```
 *
 * This predictable object ID allows aliases to be easily looked up during the resolve operation, and ensures that exactly one alias will
 * exist for a given source per space.
 *
 * @internal
 */
export interface LegacyUrlAlias {
  /**
   * The original ID of the object, before it was converted.
   */
  sourceId: string;
  /**
   * The namespace that the object existed in when it was converted.
   */
  targetNamespace: string;
  /**
   * The type of the object when it was converted.
   */
  targetType: string;
  /**
   * The new ID of the object when it was converted.
   */
  targetId: string;
  /**
   * The last time this alias was used with `SavedObjectsClient.resolve()`.
   */
  lastResolved?: string;
  /**
   * How many times this alias was used with `SavedObjectsClient.resolve()`.
   */
  resolveCounter?: number;
  /**
   * If true, this alias is disabled and it will be ignored in `SavedObjectsClient.resolve()` and
   * `SavedObjectsClient.collectMultiNamespaceReferences()`.
   */
  disabled?: boolean;
  /**
   * The reason this alias was created.
   *
   * Currently this is used to determine whether or not a toast should be shown when a user is redirected from a legacy URL; if it was
   * created because of saved object conversion, then we will display a toast telling the user that the object has a new URL.
   */
  purpose?: 'savedObjectConversion' | 'savedObjectImport';
}
