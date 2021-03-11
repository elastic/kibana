/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniqBy } from 'lodash';

import { Framework } from '../plugin';
import { VisTypeTimeseriesFieldsRequest, VisTypeTimeseriesRequestHandlerContext } from '../types';

export async function getFields(
  requestContext: VisTypeTimeseriesRequestHandlerContext,
  request: VisTypeTimeseriesFieldsRequest,
  framework: Framework,
  indexPatternString: string
) {
  const indexPatternsService = await framework.getIndexPatternsService(requestContext);

  if (!indexPatternString) {
    const defaultIndexPattern = await indexPatternsService.getDefault();

    indexPatternString = defaultIndexPattern?.title ?? '';
  }

  const {
    searchStrategy,
    capabilities,
  } = (await framework.searchStrategyRegistry.getViableStrategy(
    requestContext,
    request,
    indexPatternString
  ))!;

  const fields = await searchStrategy.getFieldsForWildcard(
    indexPatternString,
    indexPatternsService,
    capabilities
  );

  return uniqBy(fields, (field) => field.name);
}
