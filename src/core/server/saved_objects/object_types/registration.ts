/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LEGACY_URL_ALIAS_TYPE } from './constants';
import { ISavedObjectTypeRegistry, SavedObjectsType, SavedObjectTypeRegistry } from '..';

const legacyUrlAliasType: SavedObjectsType = {
  name: LEGACY_URL_ALIAS_TYPE,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false, // we aren't querying or aggregating over this data, so we don't need to specify any fields
    properties: {},
  },
  hidden: true,
};

/**
 * @internal
 */
export function registerCoreObjectTypes(
  typeRegistry: ISavedObjectTypeRegistry & Pick<SavedObjectTypeRegistry, 'registerType'>
) {
  typeRegistry.registerType(legacyUrlAliasType);
}
