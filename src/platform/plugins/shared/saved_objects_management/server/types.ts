/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  KibanaRequest,
  SavedObject,
  SavedObjectReference,
  SavedObjectsClientContract,
  SavedObjectTypeIdTuple,
} from '@kbn/core/server';
import type { z } from '@kbn/zod';
import type {
  ExportReferencedObjectsResponse,
  ImportReferencedObjectsRequest,
  ImportReferencedObjectsResponse,
} from '../common/referenced_objects_schemas';

/** Content that `toApi` dropped because the API body can't represent it. */
export interface ApiBodyWarning {
  message: string;
}

/** How a saved object type converts between its stored shape and the body its public API accepts on PUT. */
export interface ApiBodyEntry<Body extends object = object, Attributes = unknown> {
  // Methods, not function properties, so entries of any type stay assignable to the default generics.
  /** Returns the type's public PUT request body schema; lazy, since some schemas need every plugin's setup. */
  getSchema(): z.ZodType<Body>;
  /** Turns a stored saved object into the PUT body, reporting any content it dropped. */
  toApi(savedObject: Pick<SavedObject<Attributes>, 'attributes' | 'references'>): {
    body: Body;
    warnings: ApiBodyWarning[];
  };
  /** Turns a PUT body into stored attributes, with every referenced ID in `references`. */
  toStored(body: Body): { attributes: Attributes; references: SavedObjectReference[] };
  /**
   * When true, an import as new copies reuses an object of this type that already exists in the
   * destination space under the same ID, instead of copying it.
   */
  reuseExistingInNewCopies?: boolean;
}

export interface SavedObjectsManagementPluginSetup {
  /** Registers the API body entry for a saved object type. Throws if the type already has one. */
  registerApiBodyEntry: <Body extends object, Attributes>(
    type: string,
    entry: ApiBodyEntry<Body, Attributes>
  ) => void;
}

export interface SavedObjectsManagementPluginStart {
  /** Returns the API body entry registered for a saved object type, if any. */
  getApiBodyEntry: (type: string) => ApiBodyEntry | undefined;
  /**
   * Exports root objects as the bodies their public APIs accept on PUT, with the caller's privileges.
   * Throws core's export errors, such as `object-fetch-error` for a missing or unreadable root.
   */
  exportReferencedObjects: (options: {
    request: KibanaRequest;
    client: SavedObjectsClientContract;
    roots: SavedObjectTypeIdTuple[];
  }) => Promise<ExportReferencedObjectsResponse>;
  /** Imports exported API bodies through core's importer, with one result per object. */
  importReferencedObjects: (
    options: ImportReferencedObjectsRequest & { client: SavedObjectsClientContract }
  ) => Promise<ImportReferencedObjectsResponse>;
}

export type {
  SavedObjectMetadata,
  SavedObjectWithMetadata,
  SavedObjectRelationKind,
  SavedObjectRelation,
  SavedObjectInvalidRelation,
} from '../common';
