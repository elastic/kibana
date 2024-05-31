/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  getVirtualVersionsFromMappings,
  compareVirtualVersions,
  getVirtualVersionMap,
  type IndexMapping,
  type CompareModelVersionStatus,
  type CompareModelVersionDetails,
} from '@kbn/core-saved-objects-base-server-internal';
import { getUpdatedRootFields } from '../../core/compare_mappings';

interface CheckVersionCompatibilityOpts {
  mappings: IndexMapping;
  types: SavedObjectsType[];
  source: 'docVersions' | 'mappingVersions';
  deletedTypes: string[];
}

type CheckVersionCompatibilityStatus = 'greater' | 'lesser' | 'equal' | 'conflict';

interface CheckVersionCompatibilityResult {
  status: CheckVersionCompatibilityStatus;
  versionDetails: CompareModelVersionDetails;
  updatedRootFields: string[];
}

export const checkVersionCompatibility = ({
  mappings,
  types,
  source,
  deletedTypes,
}: CheckVersionCompatibilityOpts): CheckVersionCompatibilityResult => {
  const appVersions = getVirtualVersionMap(types);
  const indexVersions = getVirtualVersionsFromMappings({
    mappings,
    source,
    knownTypes: types.map((type) => type.name),
  });
  if (!indexVersions) {
    throw new Error(`Cannot check version: ${source} not present in the mapping meta`);
  }

  const updatedRootFields = getUpdatedRootFields(mappings);
  const modelVersionStatus = compareVirtualVersions({ appVersions, indexVersions, deletedTypes });
  const status = getCompatibilityStatus(modelVersionStatus.status, updatedRootFields.length > 0);

  return {
    status,
    updatedRootFields,
    versionDetails: modelVersionStatus.details,
  };
};

const getCompatibilityStatus = (
  versionStatus: CompareModelVersionStatus,
  hasUpdatedRootFields: boolean
): CheckVersionCompatibilityStatus => {
  if (!hasUpdatedRootFields) {
    return versionStatus;
  }
  switch (versionStatus) {
    case 'lesser':
      // lower model versions but additional root mappings => conflict
      return 'conflict';
    case 'equal':
      // no change on model versions but additional root mappings => greater
      return 'greater';
    default:
      // greater and conflict are not impacted
      return versionStatus;
  }
};
