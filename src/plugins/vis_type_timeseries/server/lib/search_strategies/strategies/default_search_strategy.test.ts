/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Framework } from '../../../plugin';
import {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';
import { DefaultSearchStrategy } from './default_search_strategy';

describe('DefaultSearchStrategy', () => {
  const framework = {} as Framework;
  const requestContext = {} as VisTypeTimeseriesRequestHandlerContext;
  let defaultSearchStrategy: DefaultSearchStrategy;
  let req: VisTypeTimeseriesVisDataRequest;

  beforeEach(() => {
    req = {} as VisTypeTimeseriesVisDataRequest;
    defaultSearchStrategy = new DefaultSearchStrategy(framework);
  });

  test('should init an DefaultSearchStrategy instance', () => {
    expect(defaultSearchStrategy.checkForViability).toBeDefined();
    expect(defaultSearchStrategy.search).toBeDefined();
    expect(defaultSearchStrategy.getFieldsForWildcard).toBeDefined();
  });

  test('should check a strategy for viability', async () => {
    const value = await defaultSearchStrategy.checkForViability(requestContext, req);

    expect(value.isViable).toBe(true);
    expect(value.capabilities).toEqual({
      request: req,
      fieldsCapabilities: {},
    });
  });
});
