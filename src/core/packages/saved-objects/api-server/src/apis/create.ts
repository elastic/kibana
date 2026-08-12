/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';
import type { SavedObjectAccessControl, SavedObjectReference } from '../..';
import type { MutatingOperationRefreshSetting, SavedObjectsBaseOptions } from './base';

/**
 * Options for the saved objects create operation
 *
 * @public
 */
export interface SavedObjectsCreateOptions extends SavedObjectsBaseOptions {
  /** (not recommended) Specify an id for the document */
  id?: string;
  /** Overwrite existing documents (defaults to false) */
  overwrite?: boolean;
  /**
   * An opaque version number which changes on each successful write operation.
   * Can be used in conjunction with `overwrite` for implementing optimistic concurrency control.
   **/
  version?: string;
  /**
   * {@inheritDoc SavedObjectsMigrationVersion}
   * @deprecated Use {@link SavedObjectsCreateOptions.typeMigrationVersion} instead.
   */
  migrationVersion?: SavedObjectsMigrationVersion;
  /**
   * A semver value that is used when upgrading objects between Kibana versions. If undefined, this will be automatically set to the current
   * Kibana version when the object is created. If this is set to a non-semver value, or it is set to a semver value greater than the
   * current Kibana version, it will result in an error.
   *
   * @remarks
   * Do not attempt to set this manually. It should only be used if you retrieved an existing object that had the `coreMigrationVersion`
   * field set and you want to create it again.
   */
  coreMigrationVersion?: string;
  /**
   * A semver value that is used when migrating documents between Kibana versions.
   */
  typeMigrationVersion?: string;
  /** Array of references to other saved objects */
  references?: SavedObjectReference[];
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
  /** Optional ID of the original saved object, if this object's `id` was regenerated */
  originId?: string;
  /**
   * Optional initial namespaces for the object to be created in. If this is defined, it will supersede the namespace ID that is in
   * {@link SavedObjectsCreateOptions}.
   *
   * * For shareable object types (registered with `namespaceType: 'multiple'`): this option can be used to specify one or more spaces,
   *   including the "All spaces" identifier (`'*'`).
   * * For isolated object types (registered with `namespaceType: 'single'` or `namespaceType: 'multiple-isolated'`): this option can only
   *   be used to specify a single space, and the "All spaces" identifier (`'*'`) is not allowed.
   * * For global object types (registered with `namespaceType: 'agnostic'`): this option cannot be used.
   */
  initialNamespaces?: string[];
  /**
   * Flag indicating if a saved object is managed by Kibana (default=false)
   *
   * This can be leveraged by applications to e.g. prevent edits to a managed
   * saved object. Instead, users can be guided to create a copy first and
   * make their edits to the copy.
   */
  managed?: boolean;
  /** {@link SavedObjectsRawDocParseOptions.migrationVersionCompatibility} */
  migrationVersionCompatibility?: 'compatible' | 'raw';

  /**
   * Access control settings for the create operation.
   *
   * These settings will be applied to any of the incoming objects which support access control that
   * do not already contain the accessControl property. We specifically exclude the owner property,
   * as that is set during the operation using the current user's profile ID.
   */
  accessControl?: Pick<SavedObjectAccessControl, 'accessMode'>;
  /**
   * Per-request override for the embedding timing declared by the type's
   * {@link SavedObjectsTypeSemanticSearchDefinition.embedding | semanticSearch.embedding} setting.
   *
   * When `true`, shadow semantic fields are omitted from the raw document so that Elasticsearch
   * performs no inference during indexing. The object is immediately findable via `find()`/BM25
   * and becomes semantically searchable only after a background reconciliation cycle (eventual
   * consistency for semantic search only). Only meaningful for types that declare
   * {@link SavedObjectsType.semanticSearch | semanticSearch}; silently ignored for all other types.
   *
   * Typical use: pass `deferEmbeddings: true` from bulk-install code paths (e.g. prebuilt-rule
   * import, package installation) to keep write latency independent of ML capacity, even when the
   * type's default is `'sync'`.
   */
  deferEmbeddings?: boolean;
}
