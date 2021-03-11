/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisTypeTimeseriesVisDataRequest } from '../../../types';
import { AbstractSearchStrategy, DefaultSearchCapabilities } from '../../search_strategies';
import { IndexPatternsService } from '../../../../../data/common';

export interface FieldsFetcherServices {
  indexPatternsService: IndexPatternsService;
  searchStrategy: AbstractSearchStrategy;
  capabilities: DefaultSearchCapabilities;
}

export const createFieldsFetcher = (
  req: VisTypeTimeseriesVisDataRequest,
  { capabilities, indexPatternsService, searchStrategy }: FieldsFetcherServices
) => {
  const fieldsCacheMap = new Map();

  return async (index: string) => {
    if (fieldsCacheMap.has(index)) {
      return fieldsCacheMap.get(index);
    }

    const fields = await searchStrategy.getFieldsForWildcard(
      index,
      indexPatternsService,
      capabilities
    );

    fieldsCacheMap.set(index, fields);

    return fields;
  };
};
