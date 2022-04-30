/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsMappingProperties, IndexMapping } from '../../mappings';

/**
 * Merges the active mappings and the source mappings while disabling the
 * fields of any unknown Saved Object types present in the source index's
 * mappings.
 *
 * Since the Saved Objects index has `dynamic: strict` defined at the
 * top-level, only Saved Object types for which a mapping exists can be
 * inserted into the index. To ensure that we can continue to store Saved
 * Object documents belonging to a disabled plugin we define a mapping for all
 * the unknown Saved Object types that were present in the source index's
 * mappings. To limit the field count as much as possible, these unkwnown
 * type's mappings are set to `dynamic: false`.
 *
 * (Since we're using the source index mappings instead of looking at actual
 * document types in the inedx, we potentially add more "unknown types" than
 * what would be necessary to support migrating all the data over to the
 * target index.)
 *
 * @param activeMappings The mappings compiled from all the Saved Object types
 * known to this Kibana node.
 * @param sourceMappings The mappings of index used as the migration source.
 * @returns The mappings that should be applied to the target index.
 */
export function disableUnknownTypeMappingFields(
  activeMappings: IndexMapping,
  sourceMappings: IndexMapping
): IndexMapping {
  const targetTypes = Object.keys(activeMappings.properties);

  const disabledTypesProperties = Object.keys(sourceMappings.properties ?? {})
    .filter((sourceType) => {
      const isObjectType = 'properties' in sourceMappings.properties[sourceType];
      // Only Object/Nested datatypes can be excluded from the field count by
      // using `dynamic: false`.
      return !targetTypes.includes(sourceType) && isObjectType;
    })
    .reduce((disabledTypesAcc, sourceType) => {
      disabledTypesAcc[sourceType] = { dynamic: false, properties: {} };
      return disabledTypesAcc;
    }, {} as SavedObjectsMappingProperties);

  return {
    ...activeMappings,
    properties: {
      ...sourceMappings.properties,
      ...disabledTypesProperties,
      ...activeMappings.properties,
    },
  };
}
