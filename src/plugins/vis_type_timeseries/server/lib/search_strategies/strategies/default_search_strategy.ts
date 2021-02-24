/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbstractSearchStrategy } from './abstract_search_strategy';
import { DefaultSearchCapabilities } from '../capabilities/default_search_capabilities';
import { VisTypeTimeseriesRequestHandlerContext, VisTypeTimeseriesRequest } from '../../../types';

export class DefaultSearchStrategy extends AbstractSearchStrategy {
  checkForViability<T extends VisTypeTimeseriesRequest>(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: T
  ) {
    return Promise.resolve({
      isViable: true,
      capabilities: new DefaultSearchCapabilities(req),
    });
  }

  async getFieldsForWildcard<T extends VisTypeTimeseriesRequest>(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: T,
    indexPattern: string,
    capabilities?: unknown
  ) {
    return super.getFieldsForWildcard(requestContext, req, indexPattern, capabilities);
  }
}
