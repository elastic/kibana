/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VirtualVersionMap, VirtualVersion } from './version_map';
import { compareVirtualVersions } from './version_compare';

interface GetModelVersionDeltaOpts {
  currentVersions: VirtualVersionMap;
  targetVersions: VirtualVersionMap;
  deletedTypes: string[];
}

type ModelVersionDeltaResultStatus = 'upward' | 'downward' | 'noop';

interface ModelVersionDeltaResult {
  status: ModelVersionDeltaResultStatus;
  diff: ModelVersionDeltaTypeResult[];
}

interface ModelVersionDeltaTypeResult {
  /** the name of the type */
  name: string;
  /**
   * the current version the type is at,
   * or undefined if the type is not present in the current versions
   */
  current: VirtualVersion | undefined;
  /**
   * the target version the type should go to,
   * or undefined if the type is not present in the target versions
   * */
  target: VirtualVersion | undefined;
}

/**
 * Will generate the difference to go from `currentVersions` to `targetVersions`.
 *
 * @remarks: will throw if the version maps are in conflict
 */
export const getModelVersionDelta = ({
  currentVersions,
  targetVersions,
  deletedTypes,
}: GetModelVersionDeltaOpts): ModelVersionDeltaResult => {
  const compared = compareVirtualVersions({
    indexVersions: currentVersions,
    appVersions: targetVersions,
    deletedTypes,
  });

  if (compared.status === 'conflict') {
    throw new Error('Cannot generate model version difference: conflict between versions');
  }

  const status: ModelVersionDeltaResultStatus =
    compared.status === 'lesser' ? 'downward' : compared.status === 'greater' ? 'upward' : 'noop';

  const result: ModelVersionDeltaResult = {
    status,
    diff: [],
  };

  if (compared.status === 'greater') {
    compared.details.greater.forEach((type) => {
      result.diff.push(getTypeDelta({ type, currentVersions, targetVersions }));
    });
  } else if (compared.status === 'lesser') {
    compared.details.lesser.forEach((type) => {
      result.diff.push(getTypeDelta({ type, currentVersions, targetVersions }));
    });
  }

  return result;
};

const getTypeDelta = ({
  type,
  currentVersions,
  targetVersions,
}: {
  type: string;
  currentVersions: VirtualVersionMap;
  targetVersions: VirtualVersionMap;
}): ModelVersionDeltaTypeResult => {
  return {
    name: type,
    current: currentVersions[type],
    target: targetVersions[type],
  };
};
