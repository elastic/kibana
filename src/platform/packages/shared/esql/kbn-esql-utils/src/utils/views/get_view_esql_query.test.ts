/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getViewEsqlQuery } from './get_view_esql_query';

describe('getViewEsqlQuery', () => {
  it.each(['logs_view', 'logs-view', '.internal-view', 'view@2024+prod'])(
    'leaves %s unquoted',
    (viewName) => {
      expect(getViewEsqlQuery(viewName)).toBe(`FROM ${viewName}`);
    }
  );

  it.each([
    ['test=1', 'FROM "test=1"'],
    ['cluster:view', 'FROM "cluster:view"'],
    ['a,b', 'FROM "a,b"'],
    ['my view', 'FROM "my view"'],
    ['view|logs', 'FROM "view|logs"'],
    ['view[1]', 'FROM "view[1]"'],
    ['a/b', 'FROM "a/b"'],
  ])('quotes %s as %s', (viewName, expected) => {
    expect(getViewEsqlQuery(viewName)).toBe(expected);
  });

  it('escapes quotes and backslashes inside a quoted name', () => {
    expect(getViewEsqlQuery('say "hi" \\ bye')).toBe('FROM "say \\"hi\\" \\\\ bye"');
  });
});
