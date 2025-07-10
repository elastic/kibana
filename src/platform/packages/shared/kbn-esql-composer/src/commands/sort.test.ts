/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from } from './from';
import { sort, SortOrder, sortRaw } from './sort';

describe('sort', () => {
  const source = from('logs-*');

  it('handles single strings', () => {
    const pipeline = source.pipe(sort('@timestamp', 'log.level'));

    expect(pipeline.asString()).toEqual('FROM logs-*\n  | SORT @timestamp ASC, log.level ASC');
  });

  it('handles SORT with SortOrder', () => {
    const pipeline = source.pipe(sort({ '@timestamp': SortOrder.Desc }));

    expect(pipeline.asString()).toEqual('FROM logs-*\n  | SORT @timestamp DESC');
  });

  it('handles a mix of strings and SortOrder instructions', () => {
    const pipeline = source.pipe(sort('@timestamp', { 'log.level': SortOrder.Desc }));

    expect(pipeline.asString()).toEqual('FROM logs-*\n  | SORT @timestamp ASC, log.level DESC');
  });

  it('handles sort arrays', () => {
    const pipeline = source.pipe(sort(['@timestamp', { 'log.level': SortOrder.Asc }]));

    expect(pipeline.asString()).toEqual('FROM logs-*\n  | SORT @timestamp ASC, log.level ASC');
  });

  it('handles SORT with params', () => {
    const pipeline = source.pipe(
      sortRaw('??timestamp DESC, ??logLevel ASC', {
        timestamp: '@timestamp',
        logLevel: 'log.level',
      })
    );
    const queryRequest = pipeline.asRequest();
    expect(queryRequest.query).toEqual('FROM logs-*\n  | SORT ??timestamp DESC, ??logLevel ASC');
    expect(queryRequest.params).toEqual([
      {
        timestamp: '@timestamp',
      },
      {
        logLevel: 'log.level',
      },
    ]);

    expect(pipeline.asString()).toEqual('FROM logs-*\n  | SORT @timestamp DESC, `log.level` ASC');
  });
});
