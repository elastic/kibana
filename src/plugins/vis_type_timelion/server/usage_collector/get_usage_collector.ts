/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { SearchResponse } from 'elasticsearch';
import { ElasticsearchClient } from 'src/core/server';
import { SavedObjectsClientContract, ISavedObjectsRepository } from 'kibana/server';
import { IFieldType } from '../../../data/common';
import { extractIndexesFromExpression } from '../../common/parser';

type ESResponse = SearchResponse<{ visualization: { visState: string }; updated_at: string }>;

interface IndexPatternSavedObjectAttrs {
  title: string;
  fields: string;
}

interface VisState {
  type?: string;
  params?: any;
}

export interface TimelionUsage {
  timelion_use_scripted_fields_90_days_total: number;
}

const getPastDays = (dateString: string): number => {
  const date = moment(dateString);
  return moment().diff(date, 'days');
};

export const getStats = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract | ISavedObjectsRepository,
  index: string
): Promise<TimelionUsage | undefined> => {
  const indexPatterns = await soClient.find<IndexPatternSavedObjectAttrs>({
    type: 'index-pattern',
    perPage: 10000,
    fields: ['title', 'fields'],
  });

  const timelionUsage = {
    timelion_use_scripted_fields_90_days_total: 0,
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
    let visState: VisState = {};
    try {
      visState = JSON.parse(visualization?.visState ?? '{}');
    } catch (e) {
      // invalid visState
    }

    if (visState.type === 'timelion' && getPastDays(lastUpdated) <= 90) {
      const indexes = extractIndexesFromExpression(visState.params.expression);

      for (const indexPatternTitle of indexes) {
        const foundIndexPattern = indexPatterns.saved_objects.find(
          (indexPattern) => indexPattern.attributes.title === indexPatternTitle
        );

        if (foundIndexPattern) {
          const scriptedFields = JSON.parse(foundIndexPattern.attributes.fields).filter(
            (field: IFieldType) => field.scripted
          );
          const isScriptedFieldInExpression = scriptedFields.some((field: IFieldType) =>
            visState.params.expression.includes(field.name)
          );

          if (isScriptedFieldInExpression) {
            timelionUsage.timelion_use_scripted_fields_90_days_total++;
            break;
          }
        }
      }
    }
  }

  return timelionUsage.timelion_use_scripted_fields_90_days_total ? timelionUsage : undefined;
};
