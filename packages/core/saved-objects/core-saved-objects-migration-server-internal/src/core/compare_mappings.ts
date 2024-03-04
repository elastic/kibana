/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import equals from 'fast-deep-equal';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
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
 */
export const getUpdatedTypes = ({
  indexMappings,
  appMappings,
  hashToVersionMap = {},
}: {
  indexMappings: IndexMapping;
  appMappings: IndexMapping;
  hashToVersionMap?: Record<string, string>;
}): string[] => {
  // we are assuming current IndexMappings always include _meta + modelVersions
  const appVersions = appMappings._meta!.mappingVersions!;
  const indexTypes = Object.keys(appVersions);
  const indexMeta = indexMappings._meta;

  if (!indexMeta?.mappingVersions && !indexMeta?.migrationMappingPropertyHashes) {
    // if we currently do NOT have meta information stored in the index
    // we consider that all types have been updated
    return indexTypes;
  }

  // If something exists in stored, but is missing in current
  // we don't care, as it could be a disabled plugin, etc
  // and keeping stale stuff around is better than migrating unecessesarily.
  const updatedTypes = indexTypes.filter((type) =>
    isTypeUpdated({
      type,
      appVersion: appVersions[type],
      indexHashOrVersion:
        indexMeta.mappingVersions?.[type] || indexMeta.migrationMappingPropertyHashes?.[type],
      hashToVersionMap,
    })
  );

  return updatedTypes;
};

/**
 *
 * @param type The saved object type to check
 * @param appVersion The expected "level" of the saved object, according to the current Kibana version
 * @param indexHashOrVersion The current "level" of the saved object, stored in the mappings._meta (it can be either a hash or a version)
 * @returns True if the type has changed since Kibana was last started
 */
function isTypeUpdated({
  type,
  appVersion,
  indexHashOrVersion,
  hashToVersionMap,
}: {
  type: string;
  indexHashOrVersion?: string;
  appVersion: string;
  hashToVersionMap: Record<string, string>;
}): boolean {
  if (!indexHashOrVersion) {
    // if we did not have information for this type stored in the SO index, it is either:
    // - a new type, and thus there's not need to update + pickup any docs
    // - an old re-enabled type, which will be updated on OUTDATED_DOCUMENTS_TRANSFORM
    return true;
  }
  const indexEquivalentVersion = hashToVersionMap[`${type}|${indexHashOrVersion}`];
  return indexHashOrVersion !== appVersion && indexEquivalentVersion !== appVersion;
}
