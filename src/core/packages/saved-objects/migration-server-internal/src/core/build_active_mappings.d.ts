/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsMappingProperties } from '@kbn/core-saved-objects-server';
import type {
  IndexMapping,
  IndexMappingMeta,
  IndexMappingSafe,
  SavedObjectsTypeMappingDefinitions,
} from '@kbn/core-saved-objects-base-server-internal';
/**
 * Creates an index mapping with the core properties required by saved object
 * indices, as well as the specified additional properties.
 *
 * @param typeDefinitions - the type definitions to build mapping from.
 */
export declare function buildActiveMappings(
  typeDefinitions: SavedObjectsTypeMappingDefinitions | SavedObjectsMappingProperties,
  _meta?: IndexMappingMeta
): IndexMapping;
/**
 * Defines the mappings for the root fields, common to all saved objects.
 * These are present in all SO indices.
 *
 * @returns {IndexMapping}
 */
export declare function getBaseMappings(): IndexMappingSafe;
