/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Readable } from 'stream';
import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type {
  ISavedObjectsExporter,
  ISavedObjectTypeRegistry,
  SavedObjectsExportByObjectOptions,
  SavedObjectsExportByTypeOptions,
} from '@kbn/core-saved-objects-server';
/**
 * @internal
 */
export declare class SavedObjectsExporter implements ISavedObjectsExporter {
  #private;
  constructor({
    savedObjectsClient,
    typeRegistry,
    exportSizeLimit,
    logger,
  }: {
    savedObjectsClient: SavedObjectsClientContract;
    typeRegistry: ISavedObjectTypeRegistry;
    exportSizeLimit: number;
    logger: Logger;
  });
  exportByTypes(options: SavedObjectsExportByTypeOptions): Promise<Readable>;
  exportByObjects(options: SavedObjectsExportByObjectOptions): Promise<Readable>;
  private processObjects;
  private fetchByObjects;
  private fetchByTypes;
}
