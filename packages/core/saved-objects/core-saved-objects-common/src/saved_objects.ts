/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as serverTypes from '@kbn/core-saved-objects-server';

/**
 * Information about the migrations that have been applied to this SavedObject.
 * When Kibana starts up, KibanaMigrator detects outdated documents and
 * migrates them based on this value. For each migration that has been applied,
 * the plugin's name is used as a key and the latest migration version as the
 * value.
 *
 * @example
 * migrationVersion: {
 *   dashboard: '7.1.1',
 *   space: '6.6.6',
 * }
 *
 * @public
 */
export interface SavedObjectsMigrationVersion {
  /** The plugin name and version string */
  [pluginName: string]: string;
}

/**
 * The namespace type dictates how a saved object can be interacted in relation to namespaces. Each type is mutually exclusive:
 *  * single (default): This type of saved object is namespace-isolated, e.g., it exists in only one namespace.
 *  * multiple: This type of saved object is shareable, e.g., it can exist in one or more namespaces.
 *  * multiple-isolated: This type of saved object is namespace-isolated, e.g., it exists in only one namespace, but object IDs must be
 *    unique across all namespaces. This is intended to be an intermediate step when objects with a "single" namespace type are being
 *    converted to a "multiple" namespace type. In other words, objects with a "multiple-isolated" namespace type will be *share-capable*,
 *    but will not actually be shareable until the namespace type is changed to "multiple".
 *  * agnostic: This type of saved object is global.
 *
 * @public
 */
export type SavedObjectsNamespaceType = 'single' | 'multiple' | 'multiple-isolated' | 'agnostic';

export interface SavedObjectError {
  error: string;
  message: string;
  statusCode: number;
  metadata?: Record<string, unknown>;
}

/**
 * @public
 * @deprecated TODO: Replace with issue link
 */
export type SavedObjectAttributeSingle = serverTypes.SavedObjectAttributeSingle;

/**
 * @public
 * @deprecated TODO: Replace with issue link
 */
export type SavedObjectAttribute = serverTypes.SavedObjectAttribute;

/**
 * @public
 * @deprecated TODO: Replace with issue link
 */
export type SavedObjectAttributes = serverTypes.SavedObjectAttributes;

/**
 * @public
 * @deprecated TODO: Replace with issue link
 */
export type SavedObjectReference = serverTypes.SavedObjectReference;

/**
 * @public
 * @deprecated TODO: Replace with issue link
 */
export type SavedObject<T = unknown> = serverTypes.SavedObject<T>;
