/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PlainIndexDataClientBundle } from './plain_index/plain_index_data_client_bundle';
import { createUnsupportedStorageSourceError } from '../lib/validate_factory_params';
import type { CreateDataClientDeps, DataClientBundle } from '../types';

export function createDataClientBundle(
  deps: CreateDataClientDeps
): DataClientBundle {
  switch (deps.source) {
    case 'system_index':
      return new PlainIndexDataClientBundle(deps);
    default: {
      throw createUnsupportedStorageSourceError('DataClient', deps.source);
    }
  }
}
