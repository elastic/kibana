/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Readable } from 'stream';
import type { SavedObjectsImportFailure } from '@kbn/core-saved-objects-common';
import type { ISavedObjectTypeRegistry, SavedObject } from '@kbn/core-saved-objects-server';
import type { AccessControlImportTransformsFactory } from '@kbn/core-saved-objects-server/src/import';
import type { ImportStateMap } from './types';
interface CollectSavedObjectsOptions {
  readStream: Readable;
  objectLimit: number;
  filter?: (obj: SavedObject) => boolean;
  supportedTypes: string[];
  managed?: boolean;
  typeRegistry: ISavedObjectTypeRegistry;
  createAccessControlImportTransforms?: AccessControlImportTransformsFactory;
}
export declare function collectSavedObjects({
  readStream,
  objectLimit,
  filter,
  supportedTypes,
  managed,
  typeRegistry,
  createAccessControlImportTransforms,
}: CollectSavedObjectsOptions): Promise<{
  errors: SavedObjectsImportFailure[];
  collectedObjects: SavedObject<{
    title?: string;
  }>[];
  importStateMap: ImportStateMap;
}>;
export {};
