/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_MAX_NUM_OF_COLUMNS, getEsqlDefaultColumns } from './get_esql_default_columns';

describe('getEsqlDefaultColumns', () => {
  it('uses transformational ES|QL response columns capped at 50', () => {
    const responseColumns = Array.from({ length: 60 }, (_, index) => `col${index}`);

    expect(
      getEsqlDefaultColumns({
        esql: 'FROM logs | STATS Count = COUNT(*) BY Pattern = CATEGORIZE(message)',
        responseColumns,
      })
    ).toEqual(responseColumns.slice(0, ESQL_MAX_NUM_OF_COLUMNS));
  });

  it.each([
    ['FROM logs | FORK (DESCRIBE) (STATS count = COUNT(*))', true],
    ['LET x = (FROM logs | FORK (DESCRIBE) (STATS count = COUNT(*))); FROM x', true],
    ['FROM logs | FORK (DESCRIBE) (KEEP host)', false],
    ['FROM logs, (FROM other | FORK (DESCRIBE) (STATS count = COUNT(*)))', false],
  ])('selects defaults for wide FORK results in %s', (esql, showColumns) => {
    const responseColumns = ['name', 'type', 'role', 'origin', 'description', '_fork', 'count'];

    expect(getEsqlDefaultColumns({ esql, responseColumns })).toEqual(
      showColumns ? responseColumns : []
    );
  });

  it('uses non-transformational response columns when there are at most five', () => {
    expect(
      getEsqlDefaultColumns({
        esql: 'FROM logs | WHERE response == "404"',
        responseColumns: ['a', 'b', 'c', 'd', 'e'],
      })
    ).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('does not expose a wide non-transformational response', () => {
    expect(
      getEsqlDefaultColumns({
        esql: 'FROM logs | WHERE response == "404"',
        responseColumns: ['a', 'b', 'c', 'd', 'e', 'f'],
      })
    ).toEqual([]);
  });

  it('returns no defaults when response columns are unknown', () => {
    expect(
      getEsqlDefaultColumns({
        esql: 'FROM logs | STATS count = COUNT(*)',
        responseColumns: undefined,
      })
    ).toEqual([]);
  });
});
