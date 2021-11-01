/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildPhrasesFilter, buildExistsFilter, buildPhraseFilter, Filter } from '@kbn/es-query';
import { IBucketAggConfig } from '../bucket_agg_type';

export const createFilterMultiTerms = (
  aggConfig: IBucketAggConfig,
  key: string[],
  params: any
): Filter => {
  const fields = aggConfig.params.fields;
  const indexPattern = aggConfig.aggConfigs.indexPattern;

  if (key.length === 1 && key[0] === '__other__') {
    // TODO do this in a meaningful way
    const terms = params.terms;

    const phraseFilter = buildPhrasesFilter(field, terms, indexPattern);
    phraseFilter.meta.negate = true;

    const filters: Filter[] = [phraseFilter];

    if (terms.some((term: string) => term === '__missing__')) {
      filters.push(buildExistsFilter(field, indexPattern));
    }

    return filters;
  }
  const partials = key.map((partialKey, i) =>
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
