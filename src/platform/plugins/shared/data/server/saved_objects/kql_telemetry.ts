/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { SavedObjectsType } from '@kbn/core/server';
import { SCHEMA_KQL_TELEMETRY_V8_8_0 } from './schemas/kql_telemetry';

export const kqlTelemetry: SavedObjectsType = {
  name: 'kql-telemetry',
  indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
  namespaceType: 'agnostic',
  hidden: false,
  mappings: {
    dynamic: false,
    properties: {},
  },
  schemas: {
    '8.8.0': SCHEMA_KQL_TELEMETRY_V8_8_0,
  },
};
