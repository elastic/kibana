/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchResponse } from 'elasticsearch';
import { ElasticsearchClient } from 'src/core/server';
import { getIndexArgs } from '../../common/parser';
import { getIndexPatternsService } from '../services';

type ESResponse = SearchResponse<{ visualization: { visState: string }; updated_at: string }>;

export interface TimelionUsage {
  timelion_use_scripted_fields_total: number;
}

const getPastDays = (dateString: string): number => {
  const date = new Date(dateString);
  const today = new Date();
  const diff = Math.abs(date.getTime() - today.getTime());
  return Math.trunc(diff / (1000 * 60 * 60 * 24));
};

export const getStats = async (
  esClient: ElasticsearchClient,
  soClient: any,
  index: string
): Promise<TimelionUsage | undefined> => {
  const indexPatternsServiceFactory = getIndexPatternsService();
  const indexPatternsService = await indexPatternsServiceFactory(soClient, esClient);

  const timelionUsage = {
    timelion_use_scripted_fields_total: 0,
  };

  const searchParams = {
    size: 10000,
    index,
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._id',
      'hits.hits._source.visualization',
      'hits.hits._source.updated_at',
    ],
    body: {
      query: {
        bool: {
          filter: { term: { type: 'visualization' } },
        },
      },
    },
  };

  const { body: esResponse } = await esClient.search<ESResponse>(searchParams);
  const size = esResponse?.hits?.hits?.length ?? 0;

  if (!size) {
    return;
  }

  for (const hit of esResponse.hits.hits) {
    const visualization = hit._source?.visualization;
    const lastUpdated = hit._source?.updated_at;
    const visState = JSON.parse(visualization?.visState ?? '{}');

    if (visState.type === 'timelion' && getPastDays(lastUpdated) <= 90) {
      const indexArgs = getIndexArgs(visState.params.expression);

      for (const arrayIndex in indexArgs) {
        if (indexArgs.hasOwnProperty(arrayIndex)) {
          const indexPatternId = indexArgs[arrayIndex]?.value.text;

          if (indexPatternId) {
            const indexPatternSpec = (await indexPatternsService.find(indexPatternId)).find(
              (indexPattern) => indexPattern.title === indexPatternId
            );

            const scriptedFields = indexPatternSpec?.getScriptedFields() ?? [];
            const isScriptedFieldinExpession = scriptedFields.some((field) =>
              visState.params.expression.includes(field.name)
            );

            if (isScriptedFieldinExpession) {
              timelionUsage.timelion_use_scripted_fields_total++;
              break;
            }
          }
        }
      }
    }
  }

  return timelionUsage.timelion_use_scripted_fields_total ? timelionUsage : undefined;
};
