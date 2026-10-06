/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type SavedObject } from '@kbn/core-saved-objects-server';
import type { SavedObjectsGetOptions } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformGetParams {
  type: string;
  id: string;
  options: SavedObjectsGetOptions;
}
export declare const performGet: <T>(
  { type, id, options }: PerformGetParams,
  { registry, helpers, allowedTypes, client, serializer, extensions }: ApiExecutionContext
) => Promise<SavedObject<T>>;
