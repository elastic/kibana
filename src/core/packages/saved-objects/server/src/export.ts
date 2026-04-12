/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Readable } from 'stream';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectTypeIdTuple } from '@kbn/core-saved-objects-common';
import type { SavedObjectsFindOptionsReference } from '@kbn/core-saved-objects-api-server';

/**
 * Utility class used to export savedObjects.
 *
 * @public
 */
export interface ISavedObjectsExporter {
  /**
   * Generates an export stream for given types.
   *
   * See the {@link SavedObjectsExportByTypeOptions | options} for more detailed information.
   *
   * @throws SavedObjectsExportError
   */
  exportByTypes(options: SavedObjectsExportByTypeOptions): Promise<Readable>;

  /**
   * Generates an export stream for given object references.
   *
   * See the {@link SavedObjectsExportByObjectOptions | options} for more detailed information.
   *
   * @throws SavedObjectsExportError
   */
  exportByObjects(options: SavedObjectsExportByObjectOptions): Promise<Readable>;
}

/** @public */
export interface SavedObjectExportBaseOptions {
  /** The http request initiating the export. */
  request: KibanaRequest;
  /** flag to also include all related saved objects in the export stream. */
  includeReferencesDeep?: boolean;
  /**
   * Flag to also include namespace information in the export stream. By default, namespace information is not included in exported objects.
   * This is only intended to be used internally during copy-to-space operations, and it is not exposed as an option for the external HTTP
   * route for exports.
   */
  includeNamespaces?: boolean;
  /** flag to not append {@link SavedObjectsExportResultDetails | export details} to the end of the export stream. */
  excludeExportDetails?: boolean;
  /** optional namespace to override the namespace used by the savedObjectsClient. */
  namespace?: string;
}

/**
 * Options for the {@link ISavedObjectsExporter.exportByTypes | export by type API}
 *
 * @public
 */
export interface SavedObjectsExportByTypeOptions extends SavedObjectExportBaseOptions {
  /** array of saved object types. */
  types: string[];
  /** optional array of references to search object for. */
  hasReference?: SavedObjectsFindOptionsReference[];
  /** optional query string to filter exported objects. */
  search?: string;
}

/**
 * Options for the {@link ISavedObjectsExporter.exportByObjects | export by objects API}
 *
 * @public
 */
export interface SavedObjectsExportByObjectOptions extends SavedObjectExportBaseOptions {
  /** optional array of objects to export. */
  objects: SavedObjectTypeIdTuple[];
}

/**
 * Structure of the export result details entry
 * @public
 */
export interface SavedObjectsExportResultDetails {
  /** number of successfully exported objects */
  exportedCount: number;
  /** number of missing references */
  missingRefCount: number;
  /** missing references details */
  missingReferences: SavedObjectTypeIdTuple[];
  /** number of objects that were excluded from the export */
  excludedObjectsCount: number;
  /** excluded objects details */
  excludedObjects: SavedObjectsExportExcludedObject[];
}

/** @public */
export interface SavedObjectsExportExcludedObject {
  /** id of the excluded object */
  id: string;
  /** type of the excluded object */
  type: string;
  /** optional cause of the exclusion */
  reason?: string;
}

// SavedObjectsExportTransformContext and SavedObjectsExportTransform are now
// defined in @kbn/core-saved-objects-api-server. Re-exported here for backwards compatibility.
export type {
  SavedObjectsExportTransformContext,
  SavedObjectsExportTransform,
} from '@kbn/core-saved-objects-api-server';
