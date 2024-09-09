/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { findIndexPatternById, getFieldByName } from '../data_views';
import { ConfigSchema } from '../config';

export async function termsEnumSuggestions(
  config: ConfigSchema,
  savedObjectsClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  index: string,
  fieldName: string,
  query: string,
  filters?: estypes.QueryDslQueryContainer[],
  field?: FieldSpec,
  abortSignal?: AbortSignal
) {
  // See https://github.com/elastic/kibana/issues/165264
  const { tiers } = config.autocomplete.valueSuggestions;
  const excludedTiers = [
    'data_content',
    'data_hot',
    'data_warm',
    'data_cold',
    'data_frozen',
  ].filter((tier) => !tiers.includes(tier));

  if (!field?.name && !field?.type) {
    const indexPattern = await findIndexPatternById(savedObjectsClient, index);
    field = indexPattern && getFieldByName(fieldName, indexPattern);
  }

  const body = {
    field: field?.name ?? fieldName,
    string: query,
    index_filter: {
      bool: {
        must: filters ?? [],
        must_not: {
          terms: {
            _tier: excludedTiers,
          },
        },
      },
    },
  };

  const { terms } = await esClient.termsEnum({ index, body }, { signal: abortSignal });
  return terms;
}
