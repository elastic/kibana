/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { MaybePromise } from '@kbn/utility-types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsNamespaceType } from '@kbn/core-saved-objects-common';
import type { SavedObjectsTypeManagementDefinition } from './saved_objects_management';
import type { SavedObjectsValidationMap } from './validation';
import type { SavedObjectMigrationMap } from './migration';
import type { SavedObjectsTypeMappingDefinition } from './mapping_definition';
import type {
  SavedObjectsModelVersionMap,
  SavedObjectsModelVersionMapProvider,
} from './model_version';

/**
 * Definition of a type of savedObject.
 *
 * @public
 */
export interface SavedObjectsType<Attributes = any> {
  /**
   * The name of the type, which is also used as the internal id.
   */
  name: string;
  /**
   * The attribute path to the saved object's name
   */
  nameAttribute?: string;
  /**
   * Is the type hidden by default. If true, repositories will not have access to this type unless explicitly
   * declared as an `extraType` when creating the repository.
   * It is recommended to hide the type for better backward compatibility.
   * The hidden types will not be automatically exposed via the HTTP API.
   * Therefore, that should prevent unexpected behavior in the client code, as all the interactions will be done via the plugin API.
   *
   * Hidden types must be listed to be accessible by the client.
   *
   * (await context.core).savedObjects.getClient({ includeHiddenTypes: [MY_PLUGIN_HIDDEN_SAVED_OBJECT_TYPE] })
   *
   * See {@link SavedObjectsServiceStart.createInternalRepository | createInternalRepository}.
   *
   */
  hidden: boolean;
  /**
   * Is the type hidden from the http APIs. If `hiddenFromHttpApis:true`, repositories will have access to the type but the type is not exposed via the HTTP APIs.
   * It is recommended to hide types registered with 'hidden=false' from the httpApis for backward compatibility in the HTTP layer.
   *
   * @remarks Setting this property for hidden types is not recommended and will fail validation if set to `false`.
   * @internalRemarks Using 'hiddenFromHttpApis' is an alternative to registering types as `hidden:true` to hide a type from the HTTP APIs without effecting repositories access.
   */
  hiddenFromHttpApis?: boolean;
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
   * An optional map of {@link SavedObjectMigrationFn | migrations} or a function returning a map of
   * {@link SavedObjectMigrationFn | migrations} to be used to migrate the type.
   *
   * @deprecated Use {@link SavedObjectsType.modelVersions | modelVersions} for all future migrations instead. We have no plans
   * to remove legacy migrations at this point, so there's no need to migrate existing migrations to model versions.
   */
  migrations?: SavedObjectMigrationMap | (() => SavedObjectMigrationMap);
  /**
   * An optional schema that can be used to validate the attributes of the type.
   *
   * When provided, calls to {@link SavedObjectsClient.create | create} will be validated against this schema.
   *
   * See {@link SavedObjectsValidationMap} for more details.
   * @deprecated Use {@link SavedObjectsType.modelVersions | modelVersions} instead.
   */
  schemas?: SavedObjectsValidationMap | (() => SavedObjectsValidationMap);
  /**
   * If defined, objects of this type will be converted to a 'multiple' or 'multiple-isolated' namespace type when migrating to
   * this version.
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
   * @deprecated Converting to multi-namespace clashes with the ZDT requirement for serverless
   */
  convertToMultiNamespaceTypeVersion?: string;
  /**
   * An optional {@link SavedObjectsTypeManagementDefinition | saved objects management section} definition for the type.
   */
  management?: SavedObjectsTypeManagementDefinition<Attributes>;

  /**
   * A map of model versions associated with this type.
   *
   * Model versions supersede the {@link SavedObjectsType.migrations | migrations} (and {@link SavedObjectsType.schemas | schemas}) APIs
   * by exposing an unified way of describing the changes of shape or data of the type.
   *
   * Model versioning is decoupled from Kibana versioning, and isolated between types.
   * Model versions are identified by a single numeric value, starting at `1` and without gaps.
   *
   * Please refer to {@link SavedObjectsModelVersion} for more details on the model version API.
   *
   * @example A **valid** versioning would be:
   *
   * ```ts
   * {
   *   name: 'foo',
   *   // other mandatory attributes...
   *   modelVersions: {
   *     '1': modelVersion1,
   *     '2': modelVersion2,
   *     '3': modelVersion3,
   *   }
   * }
   * ```
   *
   * @example An **invalid** versioning would be:
   *
   * ```ts
   * {
   *   name: 'foo',
   *   // other mandatory attributes...
   *   modelVersions: {
   *     '1': modelVersion1,
   *     '3': modelVersion3, // ERROR, no model version 2
   *     '3.1': modelVersion31, // ERROR, model version is a single numeric value
   *   }
   * }
   * ```
   */
  modelVersions?: SavedObjectsModelVersionMap | SavedObjectsModelVersionMapProvider;

  /**
   * Allows to opt-in to the model version API.
   *
   * Must be a valid semver version (with the patch version being necessarily 0)
   *
   * When specified, the type will switch from using the {@link SavedObjectsType.migrations | legacy migration API}
   * to use the {@link SavedObjectsType.modelVersions | modelVersion API} after the specified version.
   *
   * Once opted in, it will no longer be possible to use the legacy migration API after the specified version.
   *
   * @example A **valid** usage example would be:
   *
   * ```ts
   * {
   *   name: 'foo',
   *   // other mandatory attributes...
   *   switchToModelVersionAt: '8.8.0',
   *   migrations: {
   *     '8.1.0': migrateTo810,
   *     '8.7.0': migrateTo870,
   *   },
   *   modelVersions: {
   *     '1': modelVersion1
   *   }
   * }
   * ```
   *
   * @example An **invalid** usage example would be:
   *
   * ```ts
   * {
   *   name: 'foo',
   *   // other mandatory attributes...
   *   switchToModelVersionAt: '8.9.0',
   *   migrations: {
   *     '8.1.0': migrateTo8_1,
   *     '8.9.0': migrateTo8_9, // error: migration registered for the switch version
   *     '8.10.0': migrateTo8_10, // error: migration registered for after the switch version
   *   },
   *   modelVersions: {
   *     '1': modelVersion1
   *   }
   * }
   * ```
   *
   * Please refer to the {@link SavedObjectsType.modelVersions | modelVersion API} for more documentation on
   * the new API.
   *
   * @remarks All types will be forced to switch to use the new API during `8.10.0`. This switch is
   *          allowing types owners to switch their types before the milestone (and for testing purposes).
   */
  switchToModelVersionAt?: string;

  /**
   * Function returning the title to display in the management table.
   * If not defined, will use the object's type and id to generate a label.
   */
  getTitle?: (savedObject: Attributes) => string;
}

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
}) => MaybePromise<QueryDslQueryContainer>;
