/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { from } from './from';
import { sort, SortOrder } from './sort';

describe('sort', () => {
  const source = from('logs-*');

  it('handles single strings', () => {
    expect(source.pipe(sort('@timestamp', 'log.level')).asString()).toEqual(
      'FROM `logs-*`\n\t| SORT @timestamp ASC, log.level ASC'
    );
  });

  it('handles an array of strings', () => {
    expect(source.pipe(sort(['@timestamp', 'log.level'])).asString()).toEqual(
      'FROM `logs-*`\n\t| SORT @timestamp ASC, log.level ASC'
    );
  });

  it('handles sort instructions', () => {
    expect(source.pipe(sort({ '@timestamp': SortOrder.Desc })).asString()).toEqual(
      'FROM `logs-*`\n\t| SORT @timestamp DESC'
    );
  });
});
