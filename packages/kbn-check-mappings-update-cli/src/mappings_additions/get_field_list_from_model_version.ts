/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { FieldListMap, getVersionAddedFields } from '@kbn/core-saved-objects-base-server-internal';

const getModelVersionAddedFieldsForType = (typeDef: SavedObjectsType): string[] => {
  const addedFieldSet = new Set<string>();
  const versions =
    typeof typeDef.modelVersions === 'function'
      ? typeDef.modelVersions()
      : typeDef.modelVersions ?? {};
  Object.values(versions).forEach((version) => {
    const addedFields = getVersionAddedFields(version);
    addedFields.forEach((field) => addedFieldSet.add(field));
  });
  return [...addedFieldSet].sort();
};

export const getFieldListMapFromModelVersions = (types: SavedObjectsType[]): FieldListMap => {
  return types.reduce<FieldListMap>((memo, type) => {
    memo[type.name] = getModelVersionAddedFieldsForType(type);
    return memo;
  }, {});
};
