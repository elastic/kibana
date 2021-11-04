/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildPhraseFilter, Filter } from '@kbn/es-query';
import { IBucketAggConfig } from '../bucket_agg_type';
import { MultiFieldKey } from '../multi_field_key';

export const createFilterMultiTerms = (
  aggConfig: IBucketAggConfig,
  key: MultiFieldKey | string,
  params: { terms: MultiFieldKey[] }
): Filter => {
  const fields = aggConfig.params.fields;
  const indexPattern = aggConfig.aggConfigs.indexPattern;

  if (String(key) === '__other__') {
    const multiTerms = params.terms;

    const perMultiTermQuery = multiTerms.map((multiTerm) =>
      multiTerm.keys.map(
        (partialKey, i) =>
          buildPhraseFilter(indexPattern.getFieldByName(fields[i])!, partialKey, indexPattern).query
      )
    );

    return {
      meta: {
        negate: true,
      },
      query: {
        bool: {
          should: perMultiTermQuery.map((multiTermQuery) => ({
            bool: {
              must: multiTermQuery,
            },
          })),
          minimum_should_match: 1,
        },
      },
    };
  }
  const partials = key.keys.map((partialKey, i) =>
    buildPhraseFilter(indexPattern.getFieldByName(fields[i])!, partialKey, indexPattern)
  );
  return {
    meta: {},
    query: {
      bool: {
        must: partials.map((partialFilter) => partialFilter.query),
      },
    },
  };
};
