/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse } from 'hjson';
import { SearchResponse } from 'elasticsearch';
import { ElasticsearchClient } from 'src/core/server';

import { VisTypeTimelionPluginSetupDependencies } from '../types';

type UsageCollectorDependencies = VisTypeTimelionPluginSetupDependencies;

type ESResponse = SearchResponse<{ visualization: { visState: string } }>;

export interface TimelionUsage {
  timelion_use_scripted_fields_total: number;
}

export const getStats = async (
  esClient: ElasticsearchClient,
  index: string,
): Promise<TimelionUsage | undefined> => {
  const timelionUsage = {
    timelion_use_scripted_fields_total: 0,
  };

  const searchParams = {
    size: 10000,
    index,
    ignoreUnavailable: true,
    filterPath: ['hits.hits._id', 'hits.hits._source.visualization'],
    body: {
      query: {
        bool: {
          filter: { term: { type: 'visualization' } },
        },
      },
    },
  };
  console.log('timelion-usage')

  const { body: esResponse } = await esClient.search<ESResponse>(searchParams);
  const size = esResponse?.hits?.hits?.length ?? 0;

  // if (!size) {
  //   return;
  // }
  console.log(esResponse);

  for (const hit of esResponse.hits.hits) {
    const visualization = hit._source?.visualization;
    const visState = JSON.parse(visualization?.visState ?? '{}');

  }

  return timelionUsage;
};
