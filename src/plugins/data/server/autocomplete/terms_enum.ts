/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '../../../../core/server/elasticsearch/client/types';
import type { SavedObjectsClientContract } from '../../../../core/server/saved_objects/types';
import type { IFieldType } from '../../common/index_patterns/fields/types';
import type { ConfigSchema } from '../../config';
import { findIndexPatternById, getFieldByName } from '../index_patterns/utils';
import { shimAbortSignal } from '../search/strategies/es_search/request_utils';

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

  const promise = esClient.termsEnum({
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
  });

  const result = await shimAbortSignal(promise, abortSignal);
  return result.body.terms;
}
