/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IBucketAggConfig } from '../bucket_agg_type';
import {
  buildPhrasesFilter,
  buildExistsFilter,
  buildPhraseFilter,
  Filter,
} from '../../../../../common';

export const createFilterTerms = (aggConfig: IBucketAggConfig, key: string, params: any) => {
  const field = aggConfig.params.field;
  const indexPattern = aggConfig.aggConfigs.indexPattern;

  if (key === '__other__') {
    const terms = params.terms;

    const phraseFilter = buildPhrasesFilter(field, terms, indexPattern);
    phraseFilter.meta.negate = true;

    const filters: Filter[] = [phraseFilter];

    if (terms.some((term: string) => term === '__missing__')) {
      filters.push(buildExistsFilter(field, indexPattern));
    }

    return filters;
  } else if (key === '__missing__') {
    const existsFilter = buildExistsFilter(field, indexPattern);
    existsFilter.meta.negate = true;
    return existsFilter;
  }
  return buildPhraseFilter(field, key, indexPattern);
};
