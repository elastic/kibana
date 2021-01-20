/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mergeJobConfigurations } from './jobs_compatibility';

export function getCapabilitiesForRollupIndices(indices: { [key: string]: any }) {
  const indexNames = Object.keys(indices);
  const capabilities = {} as { [key: string]: any };

  indexNames.forEach((index) => {
    try {
      capabilities[index] = mergeJobConfigurations(indices[index].rollup_jobs);
    } catch (e) {
      capabilities[index] = {
        error: e.message,
      };
    }
  });

  return capabilities;
}
