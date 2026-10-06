/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsChangeAccessControlObject,
  SavedObjectsChangeAccessControlResponse,
  SavedObjectsChangeOwnershipOptions,
} from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformChangeOwnershipParams {
  objects: SavedObjectsChangeAccessControlObject[];
  options: SavedObjectsChangeOwnershipOptions;
}
export declare const performChangeOwnership: (
  { objects, options }: PerformChangeOwnershipParams,
  { registry, helpers, allowedTypes, client, serializer, extensions }: ApiExecutionContext
) => Promise<SavedObjectsChangeAccessControlResponse>;
