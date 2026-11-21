/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import { getNamedSubqueries } from '../../definitions/utils/named_subqueries';
import { validate } from './validate';

const letExpectErrors = (query: string, expectedErrors: string[]) => {
  const { root } = Parser.parse(query);
  const header = root.header ?? [];
  const context = { columns: new Map(), namedSubqueries: getNamedSubqueries(header) };

  const errors = header
    .flatMap((command) => validate(command, root.commands, context))
    .map(({ text }) => text);

  expect(errors).toEqual(expectedErrors);
};

const forwardReference = (name: string) =>
  `Forward reference in LET bindings: "${name}" cannot be referenced before its declaration`;

describe('LET Validation', () => {
  test('no errors on lowercase names that read earlier LETs', () => {
    letExpectErrors('LET a = (FROM index); LET b = (FROM a, index); FROM b', []);
  });

  test('rejects a name that is not lowercase', () => {
    letExpectErrors('LET Abc = (ROW x = 1); ROW y = 1', [
      'LET binding name "Abc" must be lowercase',
    ]);
  });

  test('rejects a name declared twice', () => {
    letExpectErrors('LET a = (ROW x = 1); LET a = (ROW x = 2); ROW y = 1', [
      'Duplicate LET binding name "a"',
    ]);
  });

  describe('forward references', () => {
    test.each([
      ['a later LET', 'LET a = (FROM b); LET b = (ROW x = 1); FROM a', 'b'],
      ['the LET itself', 'LET index = (FROM index); FROM index', 'index'],
      ['a later LET in an unused LET', 'LET a = (FROM b); LET b = (ROW x = 1); ROW y = 1', 'b'],
      [
        'a later LET in a FROM subquery',
        'LET a = (FROM index, (FROM b)); LET b = (ROW x = 1); FROM a',
        'b',
      ],
      [
        'a later LET in an IN subquery',
        'LET a = (FROM index | WHERE x IN (FROM b)); LET b = (ROW x = 1); FROM a',
        'b',
      ],
      [
        'a later LET in LOOKUP JOIN',
        'LET a = (FROM index | LOOKUP JOIN b ON x); LET b = (ROW x = 1); FROM a',
        'b',
      ],
    ])('rejects a LET body that reads %s', (_name, query, reference) => {
      letExpectErrors(query, [forwardReference(reference)]);
    });

    test('ignores sources with a cluster prefix or a selector', () => {
      letExpectErrors('LET a = (FROM cluster:b, b::data); LET b = (ROW x = 1); FROM a', []);
    });
  });
});
