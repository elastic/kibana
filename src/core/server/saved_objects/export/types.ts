/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsFindOptionsReference } from '../types';

/** @public */
export interface SavedObjectExportBaseOptions {
  /** flag to also include all related saved objects in the export stream. */
  includeReferencesDeep?: boolean;
  /** flag to not append {@link SavedObjectsExportResultDetails | export details} to the end of the export stream. */
  excludeExportDetails?: boolean;
  /** optional namespace to override the namespace used by the savedObjectsClient. */
  namespace?: string;
}

/**
 * Options for the {@link SavedObjectsExporter.exportByTypes | export by type API}
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
 * Options for the {@link SavedObjectsExporter.exportByObjects | export by objects API}
 *
 * @public
 */
export interface SavedObjectsExportByObjectOptions extends SavedObjectExportBaseOptions {
  /** optional array of objects to export. */
  objects: Array<{
    /** the saved object id. */
    id: string;
    /** the saved object type. */
    type: string;
  }>;
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
  missingReferences: Array<{
    /** the missing reference id. */
    id: string;
    /** the missing reference type. */
    type: string;
  }>;
}
