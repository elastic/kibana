/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from './utils';
import { queryFilterFunction } from './query_filter';

describe('interpreter/functions#queryFilter', () => {
  const fn = functionWrapper(queryFilterFunction);

  it('should return a query filter structure', () => {
    expect(
      fn(null, {
        input: { type: 'kibana_query', query: 'something', language: 'kuery' },
        label: 'something',
      })
    ).toEqual(
      expect.objectContaining({
        input: { query: 'something', language: 'kuery' },
        label: 'something',
        type: 'kibana_query_filter',
      })
    );
  });

  it('should remove type property from the filter input', () => {
    expect(
      fn(null, {
        input: { type: 'kibana_query', query: 'something', language: 'kuery' },
      })
    ).toHaveProperty('input', expect.not.objectContaining({ type: expect.anything() }));
  });
});
