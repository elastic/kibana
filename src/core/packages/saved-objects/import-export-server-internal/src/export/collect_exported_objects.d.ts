/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectTypeRegistry, SavedObject } from '@kbn/core-saved-objects-server';
interface CollectExportedObjectOptions {
  savedObjectsClient: SavedObjectsClientContract;
  objects: SavedObject[];
  /** flag to also include all related saved objects in the export stream. */
  includeReferences?: boolean;
  /** optional namespace to override the namespace used by the savedObjectsClient. */
  namespace?: string;
  /** The http request initiating the export. */
  request: KibanaRequest;
  /** export transform per type */
  typeRegistry: ISavedObjectTypeRegistry;
  /** logger to use to log potential errors */
  logger: Logger;
}
interface CollectExportedObjectResult {
  objects: SavedObject[];
  excludedObjects: ExcludedObject[];
  missingRefs: CollectedReference[];
}
interface ExcludedObject {
  id: string;
  type: string;
  reason: ExclusionReason;
}
export type ExclusionReason = 'predicate_error' | 'excluded';
export declare const collectExportedObjects: ({
  objects,
  includeReferences,
  namespace,
  request,
  typeRegistry,
  savedObjectsClient,
  logger,
}: CollectExportedObjectOptions) => Promise<CollectExportedObjectResult>;
interface CollectedReference {
  id: string;
  type: string;
}
export {};
