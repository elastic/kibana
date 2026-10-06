/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsImporter,
  SavedObjectsImportOptions,
  SavedObjectsResolveImportErrorsOptions,
} from '@kbn/core-saved-objects-server';
import type { AccessControlImportTransformsFactory } from '@kbn/core-saved-objects-server/src/import';
/**
 * @internal
 */
export declare class SavedObjectsImporter implements ISavedObjectsImporter {
  #private;
  constructor({
    savedObjectsClient,
    typeRegistry,
    importSizeLimit,
    logger,
    createAccessControlImportTransforms,
  }: {
    savedObjectsClient: SavedObjectsClientContract;
    typeRegistry: ISavedObjectTypeRegistry;
    importSizeLimit: number;
    logger: Logger;
    createAccessControlImportTransforms?: AccessControlImportTransformsFactory;
  });
  import({
    readStream,
    createNewCopies,
    namespace,
    overwrite,
    refresh,
    compatibilityMode,
    managed,
  }: SavedObjectsImportOptions): Promise<SavedObjectsImportResponse>;
  resolveImportErrors({
    readStream,
    createNewCopies,
    compatibilityMode,
    namespace,
    retries,
    managed,
  }: SavedObjectsResolveImportErrorsOptions): Promise<SavedObjectsImportResponse>;
}
