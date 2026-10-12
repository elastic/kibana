/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Partition live node bytes by their final package attribution. */
export const aggregateAttributedBytes = (
  selfSize: Float64Array,
  attribution: Int32Array,
  packageCount: number
): { packages: Float64Array; unattributed: number } => {
  if (selfSize.length !== attribution.length) {
    throw new Error('Node sizes and attributions must have the same length');
  }

  const packages = new Float64Array(packageCount);
  let unattributed = 0;
  for (let i = 0; i < selfSize.length; i++) {
    const packageId = attribution[i];
    if (packageId === -1) {
      unattributed += selfSize[i];
    } else if (packageId >= 0 && packageId < packageCount) {
      packages[packageId] += selfSize[i];
    } else {
      throw new Error(`Invalid package attribution ${packageId} for node ${i}`);
    }
  }
  return { packages, unattributed };
};
