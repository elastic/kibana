/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { rolloutGateSchemaV1 } from '../schemas/rollout_gate';

export const rolloutGateModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      create: rolloutGateSchemaV1,
      forwardCompatibility: rolloutGateSchemaV1.extends({}, { unknowns: 'ignore' }),
    },
  },
};
