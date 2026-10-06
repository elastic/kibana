/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectTypeRegistry, SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/logging';
import { type Transform } from './types';
/**
 * Returns all available core transforms for all object types.
 */
export declare function getCoreTransforms({
  type,
  log,
}: {
  type: SavedObjectsType;
  log: Logger;
}): Transform[];
/**
 * Returns all applicable conversion transforms for a given object type.
 */
export declare function getConversionTransforms(type: SavedObjectsType): Transform[];
/**
 * Returns all applicable reference transforms for all object types.
 */
export declare function getReferenceTransforms(typeRegistry: ISavedObjectTypeRegistry): Transform[];
