/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import equals from 'fast-deep-equal';
import Semver from 'semver';

import type {
  IndexMappingMeta,
  VirtualVersionMap,
  IndexMapping,
} from '@kbn/core-saved-objects-base-server-internal';
import { getBaseMappings } from './build_active_mappings';

/**
 * Compare the current mappings for root fields Vs those stored in the SO index.
 * Relies on getBaseMappings to determine the current mappings.
 * @param indexMappings The mappings stored in the SO index
 * @returns A list of the root fields whose mappings have changed
 */
export const getUpdatedRootFields = (indexMappings: IndexMapping): string[] => {
  const baseMappings = getBaseMappings();
  return Object.entries(baseMappings.properties)
    .filter(
      ([propertyName, propertyValue]) =>
        !equals(propertyValue, indexMappings.properties[propertyName])
    )
    .map(([propertyName]) => propertyName);
};

/**
 * Compares the current vs stored mappings' hashes or modelVersions.
 * Returns a list with all the types that have been updated.
 * @param indexMeta The meta information stored in the SO index
 * @param knownTypes The list of SO types that belong to the index and are enabled
 * @param latestMappingsVersions A map holding [type => version] with the latest versions where mappings have changed for each type
 * @param hashToVersionMap A map holding information about [md5 => modelVersion] equivalence
 * @returns the list of types that have been updated (in terms of their mappings)
 */
export const getUpdatedTypes = ({
  indexMeta,
  indexTypes,
  latestMappingsVersions,
  hashToVersionMap = {},
}: {
  indexMeta?: IndexMappingMeta;
  indexTypes: string[];
  latestMappingsVersions: VirtualVersionMap;
  hashToVersionMap?: Record<string, string>;
}): string[] => {
  if (!indexMeta || (!indexMeta.mappingVersions && !indexMeta.migrationMappingPropertyHashes)) {
    // if we currently do NOT have meta information stored in the index
    // we consider that all types have been updated
    return indexTypes;
  }

  // If something exists in stored, but is missing in current
  // we don't care, as it could be a disabled plugin, etc
  // and keeping stale stuff around is better than migrating unecessesarily.
  return indexTypes.filter((type) =>
    isTypeUpdated({
      type,
      mappingVersion: latestMappingsVersions[type],
      indexMeta,
      hashToVersionMap,
    })
  );
};

/**
 *
 * @param type The saved object type to check
 * @param mappingVersion The most recent model version that includes mappings changes
 * @param indexMeta The meta information stored in the SO index
 * @param hashToVersionMap A map holding information about [md5 => modelVersion] equivalence
 * @returns true if the mappings for the given type have changed since Kibana was last started
 */
function isTypeUpdated({
  type,
  mappingVersion,
  indexMeta,
  hashToVersionMap,
}: {
  type: string;
  mappingVersion: string;
  indexMeta: IndexMappingMeta;
  hashToVersionMap: Record<string, string>;
}): boolean {
  const latestMappingsVersion = Semver.parse(mappingVersion);
  if (!latestMappingsVersion) {
    throw new Error(
      `The '${type}' saved object type is not specifying a valid semver: ${mappingVersion}`
    );
  }

  if (indexMeta.mappingVersions) {
    // the SO index is already using mappingVersions (instead of md5 hashes)
    const indexVersion = indexMeta.mappingVersions[type];
    if (!indexVersion) {
      // either a new type, and thus there's not need to update + pickup any docs
      // or an old re-enabled type, which will be updated on OUTDATED_DOCUMENTS_TRANSFORM
      return false;
    }

    // if the last version where mappings have changed is more recent than the one stored in the index
    // it means that the type has been updated
    return latestMappingsVersion.compare(indexVersion) === 1;
  } else if (indexMeta.migrationMappingPropertyHashes) {
    const latestHash = indexMeta.migrationMappingPropertyHashes?.[type];

    if (!latestHash) {
      // either a new type, and thus there's not need to update + pickup any docs
      // or an old re-enabled type, which will be updated on OUTDATED_DOCUMENTS_TRANSFORM
      return false;
    }

    const indexEquivalentVersion = hashToVersionMap[`${type}|${latestHash}`];
    return !indexEquivalentVersion || latestMappingsVersion.compare(indexEquivalentVersion) === 1;
  }

  // at this point, the mappings do not contain any meta informataion
  // we consider the type has been updated, out of caution
  return true;
}
