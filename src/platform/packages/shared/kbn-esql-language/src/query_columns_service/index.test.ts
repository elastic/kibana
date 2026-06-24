/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import { getCallbackMocks } from '../__tests__/language/helpers';
import { QueryColumns } from '.';

describe('QueryColumns', () => {
  it('normalizes expression parens before resolving command columns', async () => {
    const query = 'FROM a_index | EVAL score = (doubleField + 1) | STATS AVG(score) BY (ipField)';
    const { root } = Parser.parseQuery(query);

    const columns = await new QueryColumns(root, query, getCallbackMocks(), {
      invalidateColumnsCache: true,
    }).asMap();

    expect(columns.get('AVG(score)')).toMatchObject({
      name: 'AVG(score)',
      type: 'double',
      userDefined: true,
    });
    expect(columns.get('ipField')).toMatchObject({
      name: 'ipField',
      type: 'ip',
      userDefined: true,
    });
    expect(columns.has('(ipField)')).toBe(false);
  });

  it('normalizes expression parens inside FROM subquery columns', async () => {
    const query =
      'FROM (FROM a_index | EVAL score = (doubleField + 1) | STATS AVG(score) BY (ipField))';
    const { root } = Parser.parseQuery(query);

    const columns = await new QueryColumns(root, query, getCallbackMocks(), {
      invalidateColumnsCache: true,
    }).asMap();

    expect(columns.get('AVG(score)')).toMatchObject({
      name: 'AVG(score)',
      type: 'double',
      userDefined: true,
    });
    expect(columns.get('ipField')).toMatchObject({
      name: 'ipField',
      type: 'ip',
      userDefined: true,
    });
  });
});
