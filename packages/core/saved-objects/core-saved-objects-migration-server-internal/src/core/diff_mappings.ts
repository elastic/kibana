/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndexMapping, VirtualVersionMap } from '@kbn/core-saved-objects-base-server-internal';
import { getUpdatedRootFields, getUpdatedTypes } from './compare_mappings';

/**
 * Diffs the actual vs expected mappings. The properties are compared using md5 hashes stored in _meta, because
 * actual and expected mappings *can* differ, but if the md5 hashes stored in actual._meta.migrationMappingPropertyHashes
 * match our expectations, we don't require a migration. This allows ES to tack on additional mappings that Kibana
 * doesn't know about or expect, without triggering continual migrations.
 */
export function diffMappings({
  indexMappings,
  appMappings,
  indexTypes,
  latestMappingsVersions,
  hashToVersionMap = {},
}: {
  indexMappings: IndexMapping;
  appMappings: IndexMapping;
  indexTypes: string[];
  latestMappingsVersions: VirtualVersionMap;
  hashToVersionMap?: Record<string, string>;
}) {
  if (indexMappings.dynamic !== appMappings.dynamic) {
    return { changedProp: 'dynamic' };
  } else if (
    !indexMappings._meta?.migrationMappingPropertyHashes &&
    !indexMappings._meta?.mappingVersions
  ) {
    return { changedProp: '_meta' };
  } else {
    const changedProp = findChangedProp({
      indexMappings,
      indexTypes,
      latestMappingsVersions,
      hashToVersionMap,
    });
    return changedProp ? { changedProp: `properties.${changedProp}` } : undefined;
  }
}

/**
 * Finds a property that has changed its schema with respect to the mappings stored in the SO index
 * It can either be a root field or a SO type
 * @returns the name of the property (if any)
 */
function findChangedProp({
  indexMappings,
  indexTypes,
  hashToVersionMap,
  latestMappingsVersions,
}: {
  indexMappings: IndexMapping;
  indexTypes: string[];
  hashToVersionMap: Record<string, string>;
  latestMappingsVersions: VirtualVersionMap;
}): string | undefined {
  const updatedFields = getUpdatedRootFields(indexMappings);
  if (updatedFields.length) {
    return updatedFields[0];
  }

  const updatedTypes = getUpdatedTypes({
    indexMeta: indexMappings._meta,
    indexTypes,
    latestMappingsVersions,
    hashToVersionMap,
  });
  if (updatedTypes.length) {
    return updatedTypes[0];
  }

  return undefined;
}
