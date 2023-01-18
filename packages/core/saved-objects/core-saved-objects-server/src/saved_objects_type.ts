/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { MaybePromise } from '@kbn/utility-types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsNamespaceType } from '@kbn/core-saved-objects-common';
import type { SavedObjectsTypeManagementDefinition } from './saved_objects_management';
import type { SavedObjectsValidationMap } from './validation';
import type { SavedObjectMigrationMap } from './migration';
import type { SavedObjectsTypeMappingDefinition } from './mapping_definition';

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
   * It is recommended to hide the type for better backward compatibility.
   * The hidden types will not be automatically exposed via the HTTP API.
   * Therefore, that should prevent unexpected behavior in the client code, as all the interactions will be done via the plugin API.
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
   * @deprecated Converting to multi-namespace clashes with the ZDT requirement for serverless
   */
  convertToMultiNamespaceTypeVersion?: string;
  /**
   * An optional {@link SavedObjectsTypeManagementDefinition | saved objects management section} definition for the type.
   */
  management?: SavedObjectsTypeManagementDefinition<Attributes>;
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
