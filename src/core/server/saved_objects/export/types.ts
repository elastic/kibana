/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
