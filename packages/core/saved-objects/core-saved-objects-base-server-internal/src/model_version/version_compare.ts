/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ModelVersionMap } from './version_map';

export interface CompareModelVersionMapParams {
  /** The latest model version of the types registered in the application */
  appVersions: ModelVersionMap;
  /** The model version stored in the index */
  indexVersions: ModelVersionMap;
  /** The list of deleted types to exclude during the compare process */
  deletedTypes: string[];
}

/**
 * The overall status of the model version comparison:
 * - `greater`: app version is greater than the index version
 * - `lesser`: app version is lesser than the index version
 * - `equal`: app version is equal to the index version
 * - `conflict`: app and index versions are incompatible (versions for some types are higher, and for other types lower)
 */
export type CompareModelVersionStatus = 'greater' | 'lesser' | 'equal' | 'conflict';

export interface CompareModelVersionDetails {
  greater: string[];
  lesser: string[];
  equal: string[];
}

export interface CompareModelVersionResult {
  status: CompareModelVersionStatus;
  details: CompareModelVersionDetails;
}

export const compareModelVersions = ({
  appVersions,
  indexVersions,
  deletedTypes,
}: CompareModelVersionMapParams): CompareModelVersionResult => {
  const allTypes = [
    ...new Set([...Object.keys(appVersions), ...Object.keys(indexVersions)]),
  ].filter((type) => !deletedTypes.includes(type));

  const details: CompareModelVersionDetails = {
    greater: [],
    lesser: [],
    equal: [],
  };

  allTypes.forEach((type) => {
    const appVersion = appVersions[type] ?? 0;
    const indexVersion = indexVersions[type] ?? 0;

    if (appVersion > indexVersion) {
      details.greater.push(type);
    } else if (appVersion < indexVersion) {
      details.lesser.push(type);
    } else {
      details.equal.push(type);
    }
  });

  const hasGreater = details.greater.length > 0;
  const hasLesser = details.lesser.length > 0;
  const status: CompareModelVersionStatus =
    hasGreater && hasLesser ? 'conflict' : hasGreater ? 'greater' : hasLesser ? 'lesser' : 'equal';

  return {
    status,
    details,
  };
};
