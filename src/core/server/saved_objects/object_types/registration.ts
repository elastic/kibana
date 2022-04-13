/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LEGACY_URL_ALIAS_TYPE } from './constants';
import { ISavedObjectTypeRegistry, SavedObjectsType, SavedObjectTypeRegistry } from '..';
import type { LegacyUrlAlias } from './types';

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
export function registerCoreObjectTypes(
  typeRegistry: ISavedObjectTypeRegistry & Pick<SavedObjectTypeRegistry, 'registerType'>
) {
  typeRegistry.registerType(legacyUrlAliasType);
}
