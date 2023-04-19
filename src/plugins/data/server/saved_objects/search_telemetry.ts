/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { SavedObjectsType } from '@kbn/core/server';
import { migrate712 } from './migrations/to_v7_12_0';
import { SCHEMA_SEARCH_TELEMETRY_V8_8_0 } from './schemas/search_telemetry';

export const searchTelemetry: SavedObjectsType = {
  name: 'search-telemetry',
  indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
  namespaceType: 'agnostic',
  hidden: false,
  mappings: {
    dynamic: false,
    properties: {},
  },
  migrations: {
    '7.12.0': migrate712,
  },
  schemas: {
    '8.8.0': SCHEMA_SEARCH_TELEMETRY_V8_8_0,
  },
};
