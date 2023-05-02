/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flow } from 'lodash';
import get from 'lodash/fp/get';
import { TransformFn } from '../types';
import { transformMigrationVersion } from './transform_migration_version';
import { transformSetManagedDefault } from './transform_set_managed_default';

export const migrations = {
  '8.8.0': flow(
    transformMigrationVersion,
    // extract transformedDoc from TransformResult as input to next transform
    get('transformedDoc'),
    transformSetManagedDefault
  ),
} as Record<string, TransformFn>;
