/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObject, SavedObjectsNamespaceType } from '@kbn/core-saved-objects-common';
import { SavedObjectsTypeMappingDefinition } from './mappings';
import { SavedObjectMigrationMap } from './migrations';
import { SavedObjectsExportTransform } from './export';
import { SavedObjectsImportHook } from './import/types';
import { SavedObjectsValidationMap } from './validation';

/**
 * Meta information about the SavedObjectService's status. Available to plugins via {@link CoreSetup.status}.
 *
 * @public
 */
export interface SavedObjectStatusMeta {
  migratedIndices: {
    [status: string]: number;
    skipped: number;
    migrated: number;
  };
}

export type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

/**
 * @public
 */
export interface SavedObjectsType<Attributes = any> {
  /**
   * The name of the type, which is also used as the internal id.
   */
  name: string;
  /**
   * Is the type hidden by default. If true, repositories will not have access to this type unless explicitly
   * declared as an `extraType` when creating the repository.
   *
   * See {@link SavedObjectsServiceStart.createInternalRepository | createInternalRepository}.
   */
  hidden: boolean;
  /**
   * The {@link SavedObjectsNamespaceType | namespace type} for the type.
   */
  namespaceType: SavedObjectsNamespaceType;
  /**
   * If defined, the type instances will be stored in the given index instead of the default one.
   */
  indexPattern?: string;
  /**
   * If defined, will be used to convert the type to an alias.
   */
  convertToAliasScript?: string;
  /**
   * If defined, allows a type to exclude unneeded documents from the migration process and effectively be deleted.
   * See {@link SavedObjectTypeExcludeFromUpgradeFilterHook} for more details.
   */
  excludeOnUpgrade?: SavedObjectTypeExcludeFromUpgradeFilterHook;
  /**
   * The {@link SavedObjectsTypeMappingDefinition | mapping definition} for the type.
   */
  mappings: SavedObjectsTypeMappingDefinition;
  /**
   * An optional map of {@link SavedObjectMigrationFn | migrations} or a function returning a map of {@link SavedObjectMigrationFn | migrations} to be used to migrate the type.
   */
  migrations?: SavedObjectMigrationMap | (() => SavedObjectMigrationMap);
  /**
   * An optional schema that can be used to validate the attributes of the type.
   *
   * When provided, calls to {@link SavedObjectsClient.create | create} will be validated against this schema.
   *
   * See {@link SavedObjectsValidationMap} for more details.
   */
  schemas?: SavedObjectsValidationMap | (() => SavedObjectsValidationMap);
  /**
   * If defined, objects of this type will be converted to a 'multiple' or 'multiple-isolated' namespace type when migrating to this
   * version.
   *
   * Requirements:
   *
   *  1. This string value must be a valid semver version
   *  2. This type must have previously specified {@link SavedObjectsNamespaceType | `namespaceType: 'single'`}
   *  3. This type must also specify {@link SavedObjectsNamespaceType | `namespaceType: 'multiple'`} *or*
   *     {@link SavedObjectsNamespaceType | `namespaceType: 'multiple-isolated'`}
   *
   * Example of a single-namespace type in 7.12:
   *
   * ```ts
   * {
   *   name: 'foo',
   *   hidden: false,
   *   namespaceType: 'single',
   *   mappings: {...}
   * }
   * ```
   *
   * Example after converting to a multi-namespace (isolated) type in 8.0:
   *
   * ```ts
   * {
   *   name: 'foo',
   *   hidden: false,
   *   namespaceType: 'multiple-isolated',
   *   mappings: {...},
   *   convertToMultiNamespaceTypeVersion: '8.0.0'
   * }
   * ```
   *
   * Example after converting to a multi-namespace (shareable) type in 8.1:
   *
   * ```ts
   * {
   *   name: 'foo',
   *   hidden: false,
   *   namespaceType: 'multiple',
   *   mappings: {...},
   *   convertToMultiNamespaceTypeVersion: '8.0.0'
   * }
   * ```
   *
   * Note: migration function(s) can be optionally specified for any of these versions and will not interfere with the conversion process.
   */
  convertToMultiNamespaceTypeVersion?: string;
  /**
   * An optional {@link SavedObjectsTypeManagementDefinition | saved objects management section} definition for the type.
   */
  management?: SavedObjectsTypeManagementDefinition<Attributes>;
}

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

/**
 * If defined, allows a type to run a search query and return a query filter that may match any documents which may
 * be excluded from the next migration upgrade process. Useful for cleaning up large numbers of old documents which
 * are no longer needed and may slow the migration process.
 *
 * If this hook fails, the migration will proceed without these documents having been filtered out, so this
 * should not be used as a guarantee that these documents have been deleted.
 *
 * @public
 * @alpha Experimental and subject to change
 */
export type SavedObjectTypeExcludeFromUpgradeFilterHook = (toolkit: {
  readonlyEsClient: Pick<ElasticsearchClient, 'search'>;
}) => estypes.QueryDslQueryContainer | Promise<estypes.QueryDslQueryContainer>;
