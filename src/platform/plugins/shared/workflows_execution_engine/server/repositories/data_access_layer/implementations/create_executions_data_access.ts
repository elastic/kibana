/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PlainIndexExecutionsDataAccessBundle } from './plain_index/create_plain_index_executions_data_access';
import { createUnsupportedStorageSourceError } from '../lib/validate_factory_params';
import type { CreateExecutionsDataAccessDeps, ExecutionsDataAccessBundle } from '../types';

export function createExecutionsDataAccess(
  deps: CreateExecutionsDataAccessDeps
): ExecutionsDataAccessBundle {
  switch (deps.source) {
    case 'system_index':
      return new PlainIndexExecutionsDataAccessBundle(deps);
    default: {
      throw createUnsupportedStorageSourceError('ExecutionsDataAccess', deps.source);
    }
  }
}
