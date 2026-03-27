/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { MigrationAlgorithm, TaskContext } from '../types';

export interface RollbackMigrationContext {
  migrationTypes: Array<SavedObjectsType<any>>;
  migrationKibanaIndex: string;
  migrationAlgorithm: MigrationAlgorithm;
}

export function getRollbackMigrationContext(ctx: TaskContext): RollbackMigrationContext {
  const { migrationTypes, migrationKibanaIndex, migrationAlgorithm } = ctx;

  if (!migrationTypes || migrationTypes.length === 0) {
    throw new Error('Missing migrationTypes. This task must be run from automated rollback tests.');
  }
  if (!migrationKibanaIndex) {
    throw new Error(
      'Missing migrationKibanaIndex. This task must be run from automated rollback tests.'
    );
  }
  if (!migrationAlgorithm) {
    throw new Error(
      'Missing migrationAlgorithm. This task must be run from automated rollback tests.'
    );
  }

  return { migrationTypes, migrationKibanaIndex, migrationAlgorithm };
}
