/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectMigrationMap } from '@kbn/core-saved-objects-server';
import { transformMigrationVersion } from './transform_migration_version';

export const migrations = {
  '8.7.0': transformMigrationVersion,
} as SavedObjectMigrationMap;
