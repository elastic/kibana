/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClient } from './service/saved_objects_client';
import { SavedObjectsTypeMappingDefinition } from './mappings';
import { SavedObjectMigrationMap } from './migrations';
import { SavedObjectsExportTransform } from './export';
import { SavedObjectsImportHook } from './import/types';

export {
  SavedObjectsImportResponse,
  SavedObjectsImportSuccess,
  SavedObjectsImportConflictError,
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportUnknownError,
  SavedObjectsImportFailure,
  SavedObjectsImportRetry,
  SavedObjectsImportActionRequiredWarning,
  SavedObjectsImportSimpleWarning,
  SavedObjectsImportWarning,
} from './import/types';

import { SavedObject } from '../../types';

type KueryNode = any;

export {
  SavedObjectAttributes,
  SavedObjectAttribute,
  SavedObjectAttributeSingle,
  SavedObject,
  SavedObjectError,
  SavedObjectReference,
  SavedObjectsMigrationVersion,
} from '../../types';

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

/**
 * @public
 */
export interface SavedObjectsFindOptionsReference {
  type: string;
  id: string;
}

/**
 *
 * @public
 */
export interface SavedObjectsFindOptions {
  type: string | string[];
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: string;
  /**
   * An array of fields to include in the results
   * @example
   * SavedObjects.find({type: 'dashboard', fields: ['attributes.name', 'attributes.location']})
   */
  fields?: string[];
  /** Search documents using the Elasticsearch Simple Query String syntax. See Elasticsearch Simple Query String `query` argument for more information */
  search?: string;
  /** The fields to perform the parsed query against. See Elasticsearch Simple Query String `fields` argument for more information */
  searchFields?: string[];
  /**
   * The fields to perform the parsed query against. Unlike the `searchFields` argument, these are expected to be root fields and will not
   * be modified. If used in conjunction with `searchFields`, both are concatenated together.
   */
  rootSearchFields?: string[];

  /**
   * Search for documents having a reference to the specified objects.
   * Use `hasReferenceOperator` to specify the operator to use when searching for multiple references.
   */
  hasReference?: SavedObjectsFindOptionsReference | SavedObjectsFindOptionsReference[];
  /**
   * The operator to use when searching by multiple references using the `hasReference` option. Defaults to `OR`
   */
  hasReferenceOperator?: 'AND' | 'OR';

  /**
   * The search operator to use with the provided filter. Defaults to `OR`
   */
  defaultSearchOperator?: 'AND' | 'OR';
  filter?: string | KueryNode;
  namespaces?: string[];
  /**
   * This map defines each type to search for, and the namespace(s) to search for the type in; this is only intended to be used by a saved
   * object client wrapper.
   * If this is defined, it supersedes the `type` and `namespaces` fields when building the Elasticsearch query.
   * Any types that are not included in this map will be excluded entirely.
   * If a type is included but its value is undefined, the operation will search for that type in the Default namespace.
   */
  typeToNamespacesMap?: Map<string, string[] | undefined>;
  /** An optional ES preference value to be used for the query **/
  preference?: string;
}

/**
 *
 * @public
 */
export interface SavedObjectsBaseOptions {
  /** Specify the namespace for this operation */
  namespace?: string;
}

/**
 * Elasticsearch Refresh setting for mutating operation
 * @public
 */
export type MutatingOperationRefreshSetting = boolean | 'wait_for';

/**
 * Saved Objects is Kibana's data persisentence mechanism allowing plugins to
 * use Elasticsearch for storing plugin state.
 *
 * ## SavedObjectsClient errors
 *
 * Since the SavedObjectsClient has its hands in everything we
 * are a little paranoid about the way we present errors back to
 * to application code. Ideally, all errors will be either:
 *
 *   1. Caused by bad implementation (ie. undefined is not a function) and
 *      as such unpredictable
 *   2. An error that has been classified and decorated appropriately
 *      by the decorators in {@link SavedObjectsErrorHelpers}
 *
 * Type 1 errors are inevitable, but since all expected/handle-able errors
 * should be Type 2 the `isXYZError()` helpers exposed at
 * `SavedObjectsErrorHelpers` should be used to understand and manage error
 * responses from the `SavedObjectsClient`.
 *
 * Type 2 errors are decorated versions of the source error, so if
 * the elasticsearch client threw an error it will be decorated based
 * on its type. That means that rather than looking for `error.body.error.type` or
 * doing substring checks on `error.body.error.reason`, just use the helpers to
 * understand the meaning of the error:
 *
 *   ```js
 *   if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
 *      // handle 404
 *   }
 *
 *   if (SavedObjectsErrorHelpers.isNotAuthorizedError(error)) {
 *      // 401 handling should be automatic, but in case you wanted to know
 *   }
 *
 *   // always rethrow the error unless you handle it
 *   throw error;
 *   ```
 *
 * ### 404s from missing index
 *
 * From the perspective of application code and APIs the SavedObjectsClient is
 * a black box that persists objects. One of the internal details that users have
 * no control over is that we use an elasticsearch index for persistance and that
 * index might be missing.
 *
 * At the time of writing we are in the process of transitioning away from the
 * operating assumption that the SavedObjects index is always available. Part of
 * this transition is handling errors resulting from an index missing. These used
 * to trigger a 500 error in most cases, and in others cause 404s with different
 * error messages.
 *
 * From my (Spencer) perspective, a 404 from the SavedObjectsApi is a 404; The
 * object the request/call was targeting could not be found. This is why #14141
 * takes special care to ensure that 404 errors are generic and don't distinguish
 * between index missing or document missing.
 *
 * See {@link SavedObjectsClient}
 * See {@link SavedObjectsErrorHelpers}
 *
 * @public
 */
export type SavedObjectsClientContract = Pick<SavedObjectsClient, keyof SavedObjectsClient>;

/**
 * The namespace type dictates how a saved object can be interacted in relation to namespaces. Each type is mutually exclusive:
 *  * single (default): this type of saved object is namespace-isolated, e.g., it exists in only one namespace.
 *  * multiple: this type of saved object is shareable, e.g., it can exist in one or more namespaces.
 *  * agnostic: this type of saved object is global.
 *
 * @public
 */
export type SavedObjectsNamespaceType = 'single' | 'multiple' | 'agnostic';

/**
 * @remarks This is only internal for now, and will only be public when we expose the registerType API
 *
 * @public
 */
export interface SavedObjectsType {
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
   * The {@link SavedObjectsTypeMappingDefinition | mapping definition} for the type.
   */
  mappings: SavedObjectsTypeMappingDefinition;
  /**
   * An optional map of {@link SavedObjectMigrationFn | migrations} or a function returning a map of {@link SavedObjectMigrationFn | migrations} to be used to migrate the type.
   */
  migrations?: SavedObjectMigrationMap | (() => SavedObjectMigrationMap);
  /**
   * If defined, objects of this type will be converted to multi-namespace objects when migrating to this version.
   *
   * Requirements:
   *
   *  1. This string value must be a valid semver version
   *  2. This type must have previously specified {@link SavedObjectsNamespaceType | `namespaceType: 'single'`}
   *  3. This type must also specify {@link SavedObjectsNamespaceType | `namespaceType: 'multiple'`}
   *
   * Example of a single-namespace type in 7.10:
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
   * Example after converting to a multi-namespace type in 7.11:
   *
   * ```ts
   * {
   *   name: 'foo',
   *   hidden: false,
   *   namespaceType: 'multiple',
   *   mappings: {...},
   *   convertToMultiNamespaceTypeVersion: '7.11.0'
   * }
   * ```
   *
   * Note: a migration function can be optionally specified for the same version.
   */
  convertToMultiNamespaceTypeVersion?: string;
  /**
   * An optional {@link SavedObjectsTypeManagementDefinition | saved objects management section} definition for the type.
   */
  management?: SavedObjectsTypeManagementDefinition;
}

/**
 * Configuration options for the {@link SavedObjectsType | type}'s management section.
 *
 * @public
 */
export interface SavedObjectsTypeManagementDefinition {
  /**
   * Is the type importable or exportable. Defaults to `false`.
   */
  importableAndExportable?: boolean;
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
  getTitle?: (savedObject: SavedObject<any>) => string;
  /**
   * Function returning the url to use to redirect to the editing page of this object.
   * If not defined, editing will not be allowed.
   */
  getEditUrl?: (savedObject: SavedObject<any>) => string;
  /**
   * Function returning the url to use to redirect to this object from the management section.
   * If not defined, redirecting to the object will not be allowed.
   *
   * @returns an object containing a `path` and `uiCapabilitiesPath` properties. the `path` is the path to
   *          the object page, relative to the base path. `uiCapabilitiesPath` is the path to check in the
   *          {@link Capabilities | uiCapabilities} to check if the user has permission to access the object.
   */
  getInAppUrl?: (savedObject: SavedObject<any>) => { path: string; uiCapabilitiesPath: string };
  /**
   * An optional export transform function that can be used transform the objects of the registered type during
   * the export process.
   *
   * It can be used to either mutate the exported objects, or add additional objects (of any type) to the export list.
   *
   * See {@link SavedObjectsExportTransform | the transform type documentation} for more info and examples.
   *
   * @remarks `importableAndExportable` must be `true` to specify this property.
   */
  onExport?: SavedObjectsExportTransform;
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
  onImport?: SavedObjectsImportHook;
}
