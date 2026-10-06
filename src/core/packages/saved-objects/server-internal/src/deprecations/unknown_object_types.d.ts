/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DeprecationsDetails } from '@kbn/core-deprecations-common';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { type ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
interface UnknownTypesDeprecationOptions {
  typeRegistry: ISavedObjectTypeRegistry;
  esClient: IScopedClusterClient;
  kibanaVersion: string;
}
export declare const getUnknownTypesDeprecations: (
  options: UnknownTypesDeprecationOptions
) => Promise<DeprecationsDetails[]>;
interface DeleteUnknownTypesOptions {
  typeRegistry: ISavedObjectTypeRegistry;
  esClient: IScopedClusterClient;
  kibanaVersion: string;
}
export declare const deleteUnknownTypeObjects: ({
  esClient,
  typeRegistry,
  kibanaVersion,
}: DeleteUnknownTypesOptions) => Promise<void>;
export {};
