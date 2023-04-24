/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectMigrationMap } from '@kbn/core-saved-objects-server';
import { mergeSavedObjectMigrations } from '@kbn/core-saved-objects-utils-server';
import { transformMigrationVersion } from './transform_migration_version';
import { transformSetManagedDefault } from './transform_set_managed_default';

export const migrations: SavedObjectMigrationMap = {
  '8.8.0': mergeSavedObjectMigrations(transformMigrationVersion, transformSetManagedDefault),
};
