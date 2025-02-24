/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RollupGetRollupIndexCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import { Dictionary } from 'lodash';
import { AggregationRestrictions } from '../../../common';
import { mergeJobConfigurations } from './jobs_compatibility';

/**
 * A record of capabilities (aggregations) for index rollup jobs
 */
export interface RollupIndexCapability {
  /**
   * A record of capabilities (aggregations) for an index rollup job
   */
  [index: string]: { aggs?: Dictionary<AggregationRestrictions>; error?: string };
}

/**
 * Get rollup job capabilities
 * @public
 * @param indices rollup job index capabilites
 */
export function getCapabilitiesForRollupIndices(
  indices: RollupGetRollupIndexCapsResponse
): RollupIndexCapability {
  const indexNames = Object.keys(indices);
  const capabilities: RollupIndexCapability = {};

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
