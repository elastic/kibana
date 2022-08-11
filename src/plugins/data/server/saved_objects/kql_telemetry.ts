/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsType } from '@kbn/core/server';

export const kqlTelemetry: SavedObjectsType = {
  name: 'kql-telemetry',
  namespaceType: 'agnostic',
  hidden: false,
  mappings: {
    properties: {
      optInCount: {
        type: 'long',
      },
      optOutCount: {
        type: 'long',
      },
    },
  },
};
