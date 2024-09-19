/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';

interface GetIndexForTypeOptions {
  type: string;
  typeRegistry: ISavedObjectTypeRegistry;
  migV2Enabled: boolean;
  kibanaVersion: string;
  defaultIndex: string;
}

export const getIndexForType = ({
  type,
  typeRegistry,
  migV2Enabled,
  defaultIndex,
  kibanaVersion,
}: GetIndexForTypeOptions): string => {
  // TODO migrationsV2: Remove once we remove migrations v1
  //   This is a hacky, but it required the least amount of changes to
  //   existing code to support a migrations v2 index. Long term we would
  //   want to always use the type registry to resolve a type's index
  //   (including the default index).
  if (migV2Enabled) {
    return `${typeRegistry.getIndex(type) || defaultIndex}_${kibanaVersion}`;
  } else {
    return typeRegistry.getIndex(type) || defaultIndex;
  }
};
