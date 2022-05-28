/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SavedObjectsClient } from './service/saved_objects_client';
import { SavedObjectsTypeMappingDefinition } from './mappings';
import { SavedObjectMigrationMap } from './migrations';
import { SavedObjectsExportTransform } from './export';
import { SavedObjectsImportHook } from './import/types';
import { SavedObjectsValidationMap } from './validation';

export type {
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
import { ElasticsearchClient } from '../elasticsearch';

type KueryNode = any;

export type {
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
 * @public
 */
export interface SavedObjectsPitParams {
  id: string;
  keepAlive?: string;
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
  sortOrder?: estypes.SortOrder;
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
   * Use the sort values from the previous page to retrieve the next page of results.
   */
  searchAfter?: estypes.Id[];
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
  /**
   * A record of aggregations to perform.
   * The API currently only supports a limited set of metrics and bucket aggregation types.
   * Additional aggregation types can be contributed to Core.
   *
   * @example
   * Aggregating on SO attribute field
   * ```ts
   * const aggs = { latest_version: { max: { field: 'dashboard.attributes.version' } } };
   * return client.find({ type: 'dashboard', aggs })
   * ```
   *
   * @example
   * Aggregating on SO root field
   * ```ts
   * const aggs = { latest_update: { max: { field: 'dashboard.updated_at' } } };
   * return client.find({ type: 'dashboard', aggs })
   * ```
   *
   * @alpha
   */
  aggs?: Record<string, estypes.AggregationsAggregationContainer>;
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
  /**
   * Search against a specific Point In Time (PIT) that you've opened with {@link SavedObjectsClient.openPointInTimeForType}.
   */
  pit?: SavedObjectsPitParams;
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
 * no control over is that we use an elasticsearch index for persistence and that
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
 *  * single (default): This type of saved object is namespace-isolated, e.g., it exists in only one namespace.
 *  * multiple: This type of saved object is shareable, e.g., it can exist in one or more namespaces.
 *  * multiple-isolated: This type of saved object is namespace-isolated, e.g., it exists in only one namespace, but object IDs must be
 *    unique across all namespaces. This is intended to be an intermediate step when objects with a "single" namespace type are being
 *    converted to a "multiple" namespace type. In other words, objects with a "multiple-isolated" namespace type will be *share-capable*,
 *    but will not actually be shareable until the namespace type is changed to "multiple".
 *  * agnostic: This type of saved object is global.
 *
 * @public
 */
export type SavedObjectsNamespaceType = 'single' | 'multiple' | 'multiple-isolated' | 'agnostic';

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
