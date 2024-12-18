/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectReference,
  SavedObjectsMigrationVersion,
} from '@kbn/core-saved-objects-common';

/**
 * Options for creating a saved object.
 *
 * @public
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export interface SavedObjectsCreateOptions {
  /**
   * (Not recommended) Specify an id instead of having the saved objects service generate one for you.
   */
  id?: string;
  /** If a document with the given `id` already exists, overwrite it's contents (default=false). */
  overwrite?: boolean;
  /**
   * {@inheritDoc SavedObjectsMigrationVersion}
   * @deprecated
   */
  migrationVersion?: SavedObjectsMigrationVersion;
  /** A semver value that is used when upgrading objects between Kibana versions. */
  coreMigrationVersion?: string;
  /** A semver value that is used when migrating documents between Kibana versions. */
  typeMigrationVersion?: string;
  /** Array of referenced saved objects. */
  references?: SavedObjectReference[];
  /**
   * Flag indicating if a saved object is managed by Kibana (default=false)
   *
   * This can be leveraged by applications to e.g. prevent edits to a managed
   * saved object. Instead, users can be guided to create a copy first and
   * make their edits to the copy.
   */
  managed?: boolean;
}
