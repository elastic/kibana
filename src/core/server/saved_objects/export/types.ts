/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { KibanaRequest } from '../../http';
import { SavedObject, SavedObjectsFindOptionsReference } from '../types';

/** @public */
export interface SavedObjectExportBaseOptions {
  /** The http request initiating the export. */
  request: KibanaRequest;
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

/**
 * Context passed down to a {@link SavedObjectsExportTransform | export transform function}
 *
 * @public
 */
export interface SavedObjectsExportTransformContext {
  /**
   * The request that initiated the export request. Can be used to create scoped
   * services or client inside the {@link SavedObjectsExportTransform | transformation}
   */
  request: KibanaRequest;
}

/**
 * Transformation function used to mutate the exported objects of the associated type.
 *
 * A type's export transform function will be executed once per user-initiated export,
 * for all objects of that type.
 *
 * @example
 * Registering a transform function changing the object's attributes during the export
 * ```ts
 * // src/plugins/my_plugin/server/plugin.ts
 * import { myType } from './saved_objects';
 *
 * export class Plugin() {
 *   setup: (core: CoreSetup) => {
 *     core.savedObjects.registerType({
 *        ...myType,
 *        management: {
 *          ...myType.management,
 *          onExport: (ctx, objects) => {
 *            return objects.map((obj) => ({
 *              ...obj,
 *              attributes: {
 *                ...obj.attributes,
 *                enabled: false,
 *              }
 *            })
 *          }
 *        },
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * Registering a transform function adding additional objects to the export
 * ```ts
 * // src/plugins/my_plugin/server/plugin.ts
 * import { myType } from './saved_objects';
 *
 * export class Plugin() {
 *   setup: (core: CoreSetup) => {
 *     const savedObjectStartContractPromise = getStartServices().then(
 *       ([{ savedObjects: savedObjectsStart }]) => savedObjectsStart
 *     );
 *
 *     core.savedObjects.registerType({
 *        ...myType,
 *        management: {
 *          ...myType.management,
 *          onExport: async (ctx, objects) => {
 *            const { getScopedClient } = await savedObjectStartContractPromise;
 *            const client = getScopedClient(ctx.request);
 *
 *            const depResponse = await client.find({
 *              type: 'my-nested-object',
 *              hasReference: objs.map(({ id, type }) => ({ id, type })),
 *            });
 *
 *            return [...objs, ...depResponse.saved_objects];
 *          }
 *        },
 *     });
 *   }
 * }
 * ```
 *
 * @remarks Trying to change an object's id or type during the transform will result in
 *          a runtime error during the export process.
 *
 * @public
 */
export type SavedObjectsExportTransform = <T = unknown>(
  context: SavedObjectsExportTransformContext,
  objects: Array<SavedObject<T>>
) => SavedObject[] | Promise<SavedObject[]>;
