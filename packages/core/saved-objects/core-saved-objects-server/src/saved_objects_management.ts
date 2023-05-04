/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '..';
import type { SavedObjectsExportTransform } from './export';
import type { SavedObjectsImportHook } from './import';

/**
 * Configuration options for the {@link SavedObjectsType | type}'s management section.
 *
 * @public
 */
export interface SavedObjectsTypeManagementDefinition<Attributes = any> {
  /**
   * Is the type importable or exportable. Defaults to `false`.
   */
  importableAndExportable?: boolean;
  /**
   * When specified, will be used instead of the type's name in SO management section's labels.
   */
  displayName?: string;
  /**
   * When set to false, the type will not be listed or searchable in the SO management section.
   * Main usage of setting this property to false for a type is when objects from the type should
   * be included in the export via references or export hooks, but should not directly appear in the SOM.
   * Defaults to `true`.
   *
   * @remarks `importableAndExportable` must be `true` to specify this property.
   */
  visibleInManagement?: boolean;
  /**
   * The default search field to use for this type. Defaults to `id`.
   */
  defaultSearchField?: string;
  /**
   * The eui icon name to display in the management table.
   * If not defined, the default icon will be used.
   */
  icon?: string;
  /**
   * Function returning the title to display in the management table.
   * If not defined, will use the object's type and id to generate a label.
   */
  getTitle?: (savedObject: SavedObject<Attributes>) => string;
  /**
   * Function returning the url to use to redirect to the editing page of this object.
   * If not defined, editing will not be allowed.
   */
  getEditUrl?: (savedObject: SavedObject<Attributes>) => string;
  /**
   * Function returning the url to use to redirect to this object from the management section.
   * If not defined, redirecting to the object will not be allowed.
   *
   * @returns an object containing a `path` and `uiCapabilitiesPath` properties. the `path` is the path to
   *          the object page, relative to the base path. `uiCapabilitiesPath` is the path to check in the
   *          {@link Capabilities | uiCapabilities} to check if the user has permission to access the object.
   */
  getInAppUrl?: (savedObject: SavedObject<Attributes>) => {
    path: string;
    uiCapabilitiesPath: string;
  };
  /**
   * An optional export transform function that can be used transform the objects of the registered type during
   * the export process.
   *
   * It can be used to either mutate the exported objects, or add additional objects (of any type) to the export list.
   *
   * See {@link SavedObjectsExportTransform | the transform type documentation} for more info and examples.
   *
   * When implementing both `isExportable` and `onExport`, it is mandatory that
   * `isExportable` returns the same value for an object before and after going
   * though the export transform.
   * E.g `isExportable(objectBeforeTransform) === isExportable(objectAfterTransform)`
   *
   * @remarks `importableAndExportable` must be `true` to specify this property.
   */
  onExport?: SavedObjectsExportTransform<Attributes>;
  /**
   * An optional {@link SavedObjectsImportHook | import hook} to use when importing given type.
   *
   * Import hooks are executed during the savedObjects import process and allow to interact
   * with the imported objects. See the {@link SavedObjectsImportHook | hook documentation}
   * for more info.
   *
   * @example
   * Registering a hook displaying a warning about a specific type of object
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
   *          onImport: (objects) => {
   *            if(someActionIsNeeded(objects)) {
   *              return {
   *                 warnings: [
   *                   {
   *                     type: 'action_required',
   *                     message: 'Objects need to be manually enabled after import',
   *                     actionPath: '/app/my-app/require-activation',
   *                   },
   *                 ]
   *              }
   *            }
   *            return {};
   *          }
   *        },
   *     });
   *   }
   * }
   * ```
   *
   * @remarks messages returned in the warnings are user facing and must be translated.
   * @remarks `importableAndExportable` must be `true` to specify this property.
   */
  onImport?: SavedObjectsImportHook<Attributes>;

  /**
   * Optional hook to specify whether an object should be exportable.
   *
   * If specified, `isExportable` will be called during export for each
   * of this type's objects in the export, and the ones not matching the
   * predicate will be excluded from the export.
   *
   * When implementing both `isExportable` and `onExport`, it is mandatory that
   * `isExportable` returns the same value for an object before and after going
   * though the export transform.
   * E.g `isExportable(objectBeforeTransform) === isExportable(objectAfterTransform)`
   *
   * @example
   * Registering a type with a per-object exportability predicate
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
   *          isExportable: (object) => {
   *            if (object.attributes.myCustomAttr === 'foo') {
   *              return false;
   *            }
   *            return true;
   *          }
   *        },
   *     });
   *   }
   * }
   * ```
   *
   * @remarks `importableAndExportable` must be `true` to specify this property.
   */
  isExportable?: SavedObjectsExportablePredicate<Attributes>;
}

/**
 * @public
 */
export type SavedObjectsExportablePredicate<Attributes = unknown> = (
  obj: SavedObject<Attributes>
) => boolean;
