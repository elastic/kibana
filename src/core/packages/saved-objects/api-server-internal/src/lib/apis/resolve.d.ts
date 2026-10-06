/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsResolveOptions,
  SavedObjectsResolveResponse,
} from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformCreateParams<T = unknown> {
  type: string;
  id: string;
  options: SavedObjectsResolveOptions;
}
export declare const performResolve: <T>(
  { type, id, options }: PerformCreateParams<T>,
  apiExecutionContext: ApiExecutionContext
) => Promise<SavedObjectsResolveResponse<T>>;
