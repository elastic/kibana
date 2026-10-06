/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type SavedObjectsBulkGetObject,
  type SavedObjectsBulkResponse,
  type SavedObjectsGetOptions,
} from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformBulkGetParams<T = unknown> {
  objects: SavedObjectsBulkGetObject[];
  options: SavedObjectsGetOptions;
}
export declare const performBulkGet: <T>(
  { objects, options }: PerformBulkGetParams<T>,
  { helpers, allowedTypes, client, serializer, registry, extensions }: ApiExecutionContext
) => Promise<SavedObjectsBulkResponse<T>>;
