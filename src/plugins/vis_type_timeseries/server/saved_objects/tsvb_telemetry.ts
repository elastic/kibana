/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flow } from 'lodash';
import { SavedObjectMigrationFn, SavedObjectsType } from 'kibana/server';

const resetCount: SavedObjectMigrationFn<any, any> = (doc) => ({
  ...doc,
  attributes: {
    ...doc.attributes,
    failedRequests: 0,
  },
});

export const tsvbTelemetrySavedObjectType: SavedObjectsType = {
  name: 'tsvb-validation-telemetry',
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      failedRequests: {
        type: 'long',
      },
    },
  },
  migrations: {
    '7.7.0': flow(resetCount),
    '7.8.0': flow(resetCount),
    '7.9.0': flow(resetCount),
    '7.10.0': flow(resetCount),
  },
};
