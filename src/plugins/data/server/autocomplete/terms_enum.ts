/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'kibana/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IFieldType } from '../../common';
import { findIndexPatternById, getFieldByName } from '../data_views';
import { ConfigSchema } from '../../config';

export async function termsEnumSuggestions(
  config: ConfigSchema,
  savedObjectsClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  index: string,
  fieldName: string,
  query: string,
  filters?: estypes.QueryDslQueryContainer[],
  field?: IFieldType,
  abortSignal?: AbortSignal
) {
  const { tiers } = config.autocomplete.valueSuggestions;
  if (!field?.name && !field?.type) {
    const indexPattern = await findIndexPatternById(savedObjectsClient, index);
    field = indexPattern && getFieldByName(fieldName, indexPattern);
  }

  const result = await esClient.termsEnum(
    {
      index,
      body: {
        field: field?.name ?? fieldName,
        string: query,
        index_filter: {
          bool: {
            must: [
              ...(filters ?? []),
              {
                terms: {
                  _tier: tiers,
                },
              },
            ],
          },
        },
      },
    },
    {
      signal: abortSignal,
    }
  );

  return result.terms;
}
