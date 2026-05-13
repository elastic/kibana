/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ModelVersionIdentifier, SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
import { latestVersionIdentifier } from './versions';

interface GetPreviousVersionTypeParams {
  type: SavedObjectsType<any>;
  previousMappings: SavedObjectsTypeMappingDefinitions;
}

export function getPreviousVersionType({
  type,
  previousMappings,
}: GetPreviousVersionTypeParams): SavedObjectsType<any> {
  const mappings = previousMappings[type.name];
  const mvs = typeof type.modelVersions === 'function' ? type.modelVersions() : type.modelVersions;
  const modelVersions = { ...mvs }; // clone the object to prevent modifying the original
  const latestMv = latestVersionIdentifier(type) as ModelVersionIdentifier;
  delete modelVersions[latestMv]; // delete the most recent model version
  return { ...type, mappings, modelVersions };
}
