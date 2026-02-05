/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '../../parser';
import { BasicPrettyPrinter } from '../../pretty_print';
import { getQueryForFields } from './get_query_for_fields';
import { EDITOR_MARKER } from '../../commands/definitions/constants';

describe('getQueryForFields', () => {
  const assert = (query: string, expected: string) => {
    const { root } = parse(query);

    // Simulate removing the editor marker from the AST
    // As things are set up today, the marker will be there in the query
    // string but will be removed from the AST...
    const lastCommand = root.commands[root.commands.length - 1];
    if (lastCommand.name === 'eval') {
      lastCommand.args = lastCommand.args.filter(
        (arg) => Array.isArray(arg) || arg.name !== EDITOR_MARKER
      );
    }

    const result = getQueryForFields(query, root);

    expect(BasicPrettyPrinter.print(result)).toEqual(expected);
  };

  it('should return everything up till the last command', () => {
    const query = 'FROM index | EVAL foo = 1 | STATS field1 | KEEP esql_editor_marker';
    assert(query, 'FROM index | EVAL foo = 1 | STATS field1');
  });

  it('should convert FORK branches into vanilla queries', () => {
    const query = `FROM index
    | EVAL foo = 1
    | FORK (STATS field1 | EVAL ${EDITOR_MARKER})`;
    assert(query, 'FROM index | EVAL foo = 1 | STATS field1');

    const query2 = `FROM index 
    | EVAL foo = 1
    | FORK (STATS field1) (LIMIT 10) (WHERE field1 == 1 | EVAL ${EDITOR_MARKER})`;
    assert(query2, 'FROM index | EVAL foo = 1 | WHERE field1 == 1');
  });

  it('should convert multiple EVAL expressions into separate EVAL commands', () => {
    const query = `FROM index
    | EVAL foo = 1, bar = foo + 1, baz = ${EDITOR_MARKER}`;
    assert(query, 'FROM index | EVAL foo = 1 | EVAL bar = foo + 1');

    const query2 = `FROM index
    | EVAL foo = 1, bar = foo + 1, baz = bar + 1, ${EDITOR_MARKER}`;
    assert(query2, 'FROM index | EVAL foo = 1 | EVAL bar = foo + 1 | EVAL baz = bar + 1');

    const query3 = `FROM index
    | EVAL foo = 1, ${EDITOR_MARKER}`;
    assert(query3, 'FROM index | EVAL foo = 1');
  });
});
