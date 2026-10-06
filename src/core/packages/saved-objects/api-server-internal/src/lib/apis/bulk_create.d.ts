/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type SavedObjectsCreateOptions,
  type SavedObjectsBulkCreateObject,
  type SavedObjectsBulkResponse,
} from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformBulkCreateParams<T = unknown> {
  objects: Array<SavedObjectsBulkCreateObject<T>>;
  options: SavedObjectsCreateOptions;
}
export declare const performBulkCreate: <T>(
  { objects, options }: PerformBulkCreateParams<T>,
  { registry, helpers, allowedTypes, client, serializer, migrator, extensions }: ApiExecutionContext
) => Promise<SavedObjectsBulkResponse<T>>;
