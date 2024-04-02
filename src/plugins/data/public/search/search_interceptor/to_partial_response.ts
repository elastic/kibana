/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ClusterDetails,
  ClusterStatistics,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { IEsSearchResponse } from '../../../common';

export function toPartialResponse(response: IEsSearchResponse): IEsSearchResponse {
  const { rawResponse } = response;
  const { _clusters: clusters } = rawResponse as SearchResponse & {
    _clusters: ClusterStatistics & {
      details: Record<string, ClusterDetails>;
    };
  };
  if (clusters) {
    // CCS response
    const details = Object.fromEntries(
      Object.keys(clusters.details).map((key) => {
        return [
          key,
          clusters.details[key].status !== 'running'
            ? clusters.details[key]
            : {
                ...clusters.details[key],
                status: 'partial',
                timed_out: true,
              },
        ];
      })
    );
    return {
      ...response,
      isRunning: false,
      rawResponse: {
        ...rawResponse,
        _clusters: {
          ...clusters,
          details,
        },
      },
    } as IEsSearchResponse;
  } else {
    // Non-CCS response
    return {
      ...response,
      isRunning: false,
      rawResponse: {
        ...rawResponse,
        timed_out: true,
      },
    };
  }
}
