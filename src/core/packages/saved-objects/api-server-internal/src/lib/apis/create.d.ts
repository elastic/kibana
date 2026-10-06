/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type SavedObject } from '@kbn/core-saved-objects-server';
import type { SavedObjectsCreateOptions } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformCreateParams<T = unknown> {
  type: string;
  attributes: T;
  options: SavedObjectsCreateOptions;
}
export declare const performCreate: <T>(
  { type, attributes, options }: PerformCreateParams<T>,
  { registry, helpers, allowedTypes, client, serializer, migrator, extensions }: ApiExecutionContext
) => Promise<SavedObject<T>>;
