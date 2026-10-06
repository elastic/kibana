/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsMappingProperties,
  SavedObjectsModelVersion,
} from '@kbn/core-saved-objects-server';
/**
 * Return the mappings that were introduced in the given version.
 * If multiple 'mappings_addition' changes are present for the version,
 * they will be deep-merged.
 */
export declare const getVersionAddedMappings: (
  version: SavedObjectsModelVersion
) => SavedObjectsMappingProperties;
/**
 * Return the list of fields, sorted, that were introduced in the given version.
 */
export declare const getVersionAddedFields: (version: SavedObjectsModelVersion) => string[];
