/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter } from '@elastic/esql';
import { getQueryForFields } from './get_query_for_fields';
import { EDITOR_MARKER } from '../../commands/definitions/constants';
import { parseAutocompleteQuery } from './parse_for_autocomplete_query';

describe('getQueryForFields', () => {
  const assert = (queryBeforeCursor: string, expected: string) => {
    const { root } = parseAutocompleteQuery(queryBeforeCursor, queryBeforeCursor.length);

    const result = getQueryForFields(queryBeforeCursor, root);
    const printedResult = BasicPrettyPrinter.print(result);

    expect(printedResult).toEqual(expected);
    expect(printedResult).not.toContain(EDITOR_MARKER);
  };

  it('should return everything up till the last command', () => {
    const query = 'FROM index | EVAL foo = 1 | STATS field1 | KEEP esql_editor_marker';
    assert(query, 'FROM index | EVAL foo = 1 | STATS field1');
  });

  it('should convert FORK branches into vanilla queries', () => {
    const query = `FROM index
    | EVAL foo = 1
    | FORK (STATS field1 | EVAL )`;
    assert(query, 'FROM index | EVAL foo = 1 | STATS field1');

    const query2 = `FROM index 
    | EVAL foo = 1
    | FORK (STATS field1) (LIMIT 10) (WHERE field1 == 1 | EVAL )`;
    assert(query2, 'FROM index | EVAL foo = 1 | WHERE field1 == 1');
  });

  it('should convert multiple EVAL expressions into separate EVAL commands', () => {
    const query = `FROM index
    | EVAL foo = 1, bar = foo + 1, baz = `;
    assert(query, 'FROM index | EVAL foo = 1 | EVAL bar = foo + 1');

    const query2 = `FROM index
    | EVAL foo = 1, bar = foo + 1, baz = bar + 1, `;
    assert(query2, 'FROM index | EVAL foo = 1 | EVAL bar = foo + 1 | EVAL baz = bar + 1');

    const query3 = `FROM index
    | EVAL foo = 1, `;
    assert(query3, 'FROM index | EVAL foo = 1');
  });

  it('should not treat a comma inside an incomplete function call as an EVAL separator', () => {
    assert('FROM index | EVAL result = ROUND(field, ', 'FROM index');
  });
});
