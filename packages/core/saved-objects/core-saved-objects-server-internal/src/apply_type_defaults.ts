/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Semver from 'semver';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { globalSwitchToModelVersionAt } from '@kbn/core-saved-objects-base-server-internal';

/**
 * Apply global defaults to the provided SO type.
 */
export const applyTypeDefaults = (type: SavedObjectsType): SavedObjectsType => {
  let switchToModelVersionAt = type.switchToModelVersionAt;
  if (switchToModelVersionAt) {
    if (!Semver.valid(switchToModelVersionAt)) {
      throw new Error(
        `Type ${type.name}: invalid switchToModelVersionAt provided: ${switchToModelVersionAt}`
      );
    }
    if (Semver.gt(switchToModelVersionAt, globalSwitchToModelVersionAt)) {
      throw new Error(
        `Type ${type.name}: provided switchToModelVersionAt (${switchToModelVersionAt}) is higher than maximum (${globalSwitchToModelVersionAt})`
      );
    }
  } else {
    switchToModelVersionAt = globalSwitchToModelVersionAt;
  }

  return {
    ...type,
    switchToModelVersionAt,
  };
};
