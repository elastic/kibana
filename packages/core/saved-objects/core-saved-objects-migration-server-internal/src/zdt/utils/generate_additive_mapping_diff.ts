/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsType,
  SavedObjectsMappingProperties,
} from '@kbn/core-saved-objects-server';
import {
  type IndexMapping,
  getVirtualVersionsFromMappingMeta,
  getVirtualVersionMap,
  getModelVersionDelta,
} from '@kbn/core-saved-objects-base-server-internal';
import { getUpdatedRootFields } from '../../core/compare_mappings';
import { getBaseMappings } from '../../core/build_active_mappings';

interface GenerateAdditiveMappingsDiffOpts {
  types: SavedObjectsType[];
  mapping: IndexMapping;
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
  mapping,
  deletedTypes,
}: GenerateAdditiveMappingsDiffOpts): SavedObjectsMappingProperties => {
  const meta = mapping._meta;
  if (!meta) {
    // should never occur given we only generate additive mapping diff when we've recognized a zdt index
    throw new Error('Cannot generate additive mapping diff: meta not present on index');
  }

  const typeVersions = getVirtualVersionMap(types);
  const mappingVersion = getVirtualVersionsFromMappingMeta({
    meta,
    source: 'mappingVersions',
    knownTypes: types.map((type) => type.name),
  });
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

  const changedRootFields = getUpdatedRootFields(mapping);
  if (changedRootFields.length) {
    const baseMappings = getBaseMappings();
    changedRootFields.forEach((changedRootField) => {
      addedMappings[changedRootField] = baseMappings.properties[changedRootField];
    });
  }

  return addedMappings;
};
