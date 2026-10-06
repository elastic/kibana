/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformUpdateParams<T = unknown> {
  type: string;
  id: string;
  attributes: T;
  options: SavedObjectsUpdateOptions<T>;
}
export declare const performUpdate: <T>(
  updateParams: PerformUpdateParams<T>,
  apiContext: ApiExecutionContext
) => Promise<SavedObjectsUpdateResponse<T>>;
export declare const executeUpdate: <T>(
  { id, type, attributes, options }: PerformUpdateParams<T>,
  { registry, helpers, client, serializer, extensions, logger }: ApiExecutionContext,
  {
    namespace,
  }: {
    namespace: string | undefined;
  }
) => Promise<SavedObjectsUpdateResponse<T>>;
