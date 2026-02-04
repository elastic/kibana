/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '../../parser';
import { VerbatimPrettyPrinter } from '../verbatim_pretty_printer';

describe('VerbatimPrettyPrinter', () => {
  test('reconstructs original source exactly from ParseResult tokens', () => {
    const src =
      '/* header comment */\n' +
      'FROM\tindex1,  index2  // end-of-line\n' +
      '\n' +
      '| WHERE  a >  10\tAND b < 20\n' +
      '| EVAL c = a + b /* inline block */\n';

    const result = Parser.parse(src, { withFormatting: true });
    expect(VerbatimPrettyPrinter.print(result)).toEqual(src);
  });

  test('accurately prints nested FROM query with indentation and trailing spaces', () => {
    const src =
      'FROM index1, (FROM index2\n' +
      '              | WHERE a > 10\n' +
      '              | EVAL b = a * 2\n' +
      '              | STATS cnt = COUNT(*) BY c\n' +
      '              | SORT cnt desc\n' +
      '              | LIMIT 10)\n' +
      ', index3, (FROM index4 \n' +
      '           | stats count(*))\n' +
      '| WHERE d > 10\n' +
      '| STATS max = max(*) BY e\n' +
      '| SORT max desc\n';

    const result = Parser.parse(src, { withFormatting: true });
    expect(VerbatimPrettyPrinter.print(result)).toEqual(src);
  });

  test('can return exact substring for nodes when given src', () => {
    const src = 'FROM index1 | WHERE a > 10';
    const { root } = Parser.parse(src, { withFormatting: true });
    const cmd = root.commands[0];
    expect(VerbatimPrettyPrinter.print(cmd, { src })).toEqual(
      src.slice(cmd.location.min, cmd.location.max + 1)
    );
  });
});

