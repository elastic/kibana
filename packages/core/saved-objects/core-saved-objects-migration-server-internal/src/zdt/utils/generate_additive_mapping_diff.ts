/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  SavedObjectsType,
  SavedObjectsMappingProperties,
} from '@kbn/core-saved-objects-server';
import {
  IndexMappingMeta,
  getModelVersionsFromMappingMeta,
  getModelVersionMapForTypes,
  getModelVersionDelta,
} from '@kbn/core-saved-objects-base-server-internal';

interface GenerateAdditiveMappingsDiffOpts {
  types: SavedObjectsType[];
  meta: IndexMappingMeta;
  deletedTypes: string[];
}

/**
 * Generates the additive mapping diff we will need to update the index mapping with.
 *
 * @param types The types to generate the diff for
 * @param meta The meta field of the index we're migrating
 * @param deletedTypes The list of deleted types to ignore during diff/comparison
 */
export const generateAdditiveMappingDiff = ({
  types,
  meta,
  deletedTypes,
}: GenerateAdditiveMappingsDiffOpts): SavedObjectsMappingProperties => {
  const typeVersions = getModelVersionMapForTypes(types);
  const mappingVersion = getModelVersionsFromMappingMeta({ meta, source: 'mappingVersions' });
  if (!mappingVersion) {
    // should never occur given we checked previously in the flow but better safe than sorry.
    throw new Error(
      'Cannot generate additive mapping diff: mappingVersions not present on index meta'
    );
  }

  const delta = getModelVersionDelta({
    currentVersions: mappingVersion,
    targetVersions: typeVersions,
    deletedTypes,
  });
  const typeMap = types.reduce<Record<string, SavedObjectsType>>((map, type) => {
    map[type.name] = type;
    return map;
  }, {});

  // TODO: later we will want to generate the proper diff from `SavedObjectsModelExpansionChange.addedMappings`
  //       for this first implementation this is acceptable given we only allow compatible mapping changes anyway.
  //       we may want to implement the proper logic before this get used by real (non-test) type owners.

  const changedTypes = delta.diff.map((diff) => diff.name);

  const addedMappings: SavedObjectsMappingProperties = {};
  changedTypes.forEach((type) => {
    addedMappings[type] = typeMap[type].mappings;
  });

  return addedMappings;
};
