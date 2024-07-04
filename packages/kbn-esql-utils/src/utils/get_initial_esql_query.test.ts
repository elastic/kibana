/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getInitialESQLQuery } from './get_initial_esql_query';

describe('getInitialESQLQuery', () => {
  it('should work correctly', () => {
    expect(getInitialESQLQuery('logs*')).toBe('FROM logs* | LIMIT 10');
  });

  it('should append a sort by timefield correctly', () => {
    expect(getInitialESQLQuery('logs*', '@timestamp')).toBe(
      'FROM logs* | SORT @timestamp DESC | LIMIT 10'
    );
  });
});
