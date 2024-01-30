/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SearchResponseWarning, SearchResponseIncompleteWarning } from './types';

export function hasUnsupportedDownsampledAggregationFailure(warning: SearchResponseWarning) {
  return warning.type === 'incomplete'
    ? Object.values((warning as SearchResponseIncompleteWarning).clusters).some(
        (clusterDetails) => {
          return clusterDetails.failures
            ? clusterDetails.failures.some((shardFailure) => {
                return shardFailure.reason?.type === 'unsupported_aggregation_on_downsampled_index';
              })
            : false;
        }
      )
    : false;
}
