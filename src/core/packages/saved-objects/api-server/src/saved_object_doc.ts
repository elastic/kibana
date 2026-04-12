/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';
import type { SavedObjectAccessControl, SavedObjectReference } from '..';

/**
 * Saved Object base document
 *
 * @public
 */
export interface SavedObjectDoc<T = unknown> {
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
  updated_by?: string;
  created_at?: string;
  created_by?: string;
  originId?: string;
  managed?: boolean;
  accessControl?: SavedObjectAccessControl;
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
