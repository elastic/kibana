/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { DefaultSearchStrategy } from './default_search_strategy';
import type { ReqFacade } from './abstract_search_strategy';
import type { VisPayload } from '../../../../common/types';

describe('DefaultSearchStrategy', () => {
  let defaultSearchStrategy: DefaultSearchStrategy;
  let req: ReqFacade<VisPayload>;

  beforeEach(() => {
    req = {} as ReqFacade<VisPayload>;
    defaultSearchStrategy = new DefaultSearchStrategy();
  });

  test('should init an DefaultSearchStrategy instance', () => {
    expect(defaultSearchStrategy.checkForViability).toBeDefined();
    expect(defaultSearchStrategy.search).toBeDefined();
    expect(defaultSearchStrategy.getFieldsForWildcard).toBeDefined();
  });

  test('should check a strategy for viability', async () => {
    const value = await defaultSearchStrategy.checkForViability(req);

    expect(value.isViable).toBe(true);
    expect(value.capabilities).toEqual({
      request: req,
      fieldsCapabilities: {},
    });
  });
});
