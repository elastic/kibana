/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { merge } from 'lodash';
import type {
  SavedObjectsModelChange,
  SavedObjectsMappingProperties,
} from '@kbn/core-saved-objects-server';

/**
 * Merge the added mappings from the given list of model changes.
 * Note: only changes of the `mappings_addition` type have mapping addition.
 */
export const aggregateMappingAdditions = (
  changes: SavedObjectsModelChange[]
): SavedObjectsMappingProperties => {
  let mappings: SavedObjectsMappingProperties = {};
  changes.forEach((change) => {
    if (change.type === 'mappings_addition') {
      mappings = merge(mappings, change.addedMappings);
    }
  });
  return mappings;
};
