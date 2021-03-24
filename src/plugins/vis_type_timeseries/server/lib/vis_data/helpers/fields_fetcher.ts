/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';
import { AbstractSearchStrategy, DefaultSearchCapabilities } from '../../search_strategies';

export interface FieldsFetcherServices {
  requestContext: VisTypeTimeseriesRequestHandlerContext;
  searchStrategy: AbstractSearchStrategy;
  capabilities: DefaultSearchCapabilities;
}

export const createFieldsFetcher = (
  req: VisTypeTimeseriesVisDataRequest,
  { capabilities, requestContext, searchStrategy }: FieldsFetcherServices
) => {
  const fieldsCacheMap = new Map();

  return async (index: string) => {
    if (fieldsCacheMap.has(index)) {
      return fieldsCacheMap.get(index);
    }

    const fields = await searchStrategy.getFieldsForWildcard(
      requestContext,
      req,
      index,
      capabilities
    );

    fieldsCacheMap.set(index, fields);

    return fields;
  };
};
