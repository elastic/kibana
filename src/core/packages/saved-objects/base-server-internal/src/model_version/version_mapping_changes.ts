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
  SavedObjectsMappingProperties,
  SavedObjectsModelVersion,
  SavedObjectsModelMappingsAdditionChange,
} from '@kbn/core-saved-objects-server';
import { getFieldListFromTypeMapping } from '../utils/get_field_list';

/**
 * Return the mappings that were introduced in the given version.
 * If multiple 'mappings_addition' changes are present for the version,
 * they will be deep-merged.
 */
export const getVersionAddedMappings = (
  version: SavedObjectsModelVersion
): SavedObjectsMappingProperties => {
  const mappingChanges = version.changes.filter(
    (change) => change.type === 'mappings_addition'
  ) as SavedObjectsModelMappingsAdditionChange[];
  return merge({}, ...mappingChanges.map((change) => change.addedMappings));
};

/**
 * Return the list of fields, sorted, that were introduced in the given version.
 */
export const getVersionAddedFields = (version: SavedObjectsModelVersion): string[] => {
  const addedMappings = getVersionAddedMappings(version);
  return getFieldListFromTypeMapping({ properties: addedMappings });
};
