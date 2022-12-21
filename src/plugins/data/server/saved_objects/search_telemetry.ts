/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { migrate712 } from './migrations/to_v7_12_0';

export const searchTelemetry: SavedObjectsType = {
  name: 'search-telemetry',
  namespaceType: 'agnostic',
  hidden: false,
  mappings: {
    dynamic: false,
    properties: {},
  },
  migrations: {
    '7.12.0': migrate712,
  },
};
