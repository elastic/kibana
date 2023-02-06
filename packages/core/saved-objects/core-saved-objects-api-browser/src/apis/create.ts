/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  /** {@inheritDoc SavedObjectsMigrationVersion} */
  migrationVersion?: SavedObjectsMigrationVersion;
  /** A semver value that is used when upgrading objects between Kibana versions. */
  coreMigrationVersion?: string;
  /** Array of referenced saved objects. */
  references?: SavedObjectReference[];
}
