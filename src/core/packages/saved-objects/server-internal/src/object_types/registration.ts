/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type {
  SavedObjectsType,
  SavedObjectsFullModelVersion,
} from '@kbn/core-saved-objects-server';
import {
  LEGACY_URL_ALIAS_TYPE,
  type LegacyUrlAlias,
} from '@kbn/core-saved-objects-base-server-internal';
import type { ISavedObjectTypeRegistryInternal } from '@kbn/core-saved-objects-base-server-internal';
import { DEFERRED_INIT_STATE_TYPE } from '@kbn/core-deferred-init-common';

export { DEFERRED_INIT_STATE_TYPE };

const deferredInitStateAttributesSchemaV1 = schema.object({
  /** `available` once `lazyInitialize` has completed successfully anywhere in the cluster. */
  status: schema.oneOf([schema.literal('available'), schema.literal('failed')]),
  updatedAt: schema.string(),
  /** Number of `lazyInitialize` attempts across the cluster; informational only. */
  attempts: schema.number(),
  lastError: schema.maybe(schema.string()),
  /** Kibana version that last wrote this record; used to invalidate stale state after an upgrade. */
  kibanaVersion: schema.string(),
});

const deferredInitStateModelVersion1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    forwardCompatibility: deferredInitStateAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
    create: deferredInitStateAttributesSchemaV1,
  },
};

const deferredInitStateType: SavedObjectsType = {
  name: DEFERRED_INIT_STATE_TYPE,
  // Cluster-global, not per space: a plugin's deferred init runs once for the whole
  // deployment, matching `LazyInitContext`'s current single-project scope.
  namespaceType: 'agnostic',
  hidden: true,
  mappings: {
    dynamic: false,
    properties: {
      // `ignore_above` bounds these keyword fields so an over-long value can't blow up the
      // mapping (both are short by construction: a fixed enum and a Kibana version string).
      status: { type: 'keyword', ignore_above: 256 },
      updatedAt: { type: 'date' },
      attempts: { type: 'integer' },
      kibanaVersion: { type: 'keyword', ignore_above: 256 },
      // lastError is diagnostic free text; deliberately unmapped (dynamic: false covers it).
    },
  },
  modelVersions: {
    '1': deferredInitStateModelVersion1,
  },
};

const legacyUrlAliasType: SavedObjectsType = {
  name: LEGACY_URL_ALIAS_TYPE,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      sourceId: { type: 'keyword' },
      targetNamespace: { type: 'keyword' },
      targetType: { type: 'keyword' },
      targetId: { type: 'keyword' },
      resolveCounter: { type: 'long' },
      disabled: { type: 'boolean' },
      // other properties exist, but we aren't querying or aggregating on those, so we don't need to specify them (because we use `dynamic: false` above)
    },
  },
  hidden: false,
  migrations: {
    // NOTE TO MAINTAINERS: If you add a migration here, be sure to update the alias creation code in the document migrator accordingly,
    // see: `src/core/server/saved_objects/migrations/core/document_migrator.ts`
    '8.2.0': (doc) => {
      // In version 8.2.0 we added the "purpose" field. Any aliases created before this were created because of saved object conversion.
      const purpose: LegacyUrlAlias['purpose'] = 'savedObjectConversion';
      return {
        ...doc,
        attributes: { ...doc.attributes, purpose },
      };
    },
  },
};

/**
 * @internal
 */
export function registerCoreObjectTypes(typeRegistry: ISavedObjectTypeRegistryInternal) {
  typeRegistry.registerType(legacyUrlAliasType);
  typeRegistry.registerType(deferredInitStateType);
}
