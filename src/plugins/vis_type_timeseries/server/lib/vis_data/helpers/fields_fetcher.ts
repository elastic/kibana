/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  AbstractSearchStrategy,
  DefaultSearchCapabilities,
  ReqFacade,
} from '../../search_strategies';

export const createFieldsFetcher = (
  req: ReqFacade,
  searchStrategy: AbstractSearchStrategy,
  capabilities: DefaultSearchCapabilities
) => {
  const fieldsCacheMap = new Map();

  return async (index: string) => {
    if (fieldsCacheMap.has(index)) {
      return fieldsCacheMap.get(index);
    }

    const fields = await searchStrategy.getFieldsForWildcard(req, index, capabilities);

    fieldsCacheMap.set(index, fields);

    return fields;
  };
};
