/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../__tests__/context_fixtures';
import { validate } from './validate';
import { expectErrors } from '../../../__tests__/validation';

const forkExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'fork', validate);
};

describe('FORK Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('no errors for valid command', () => {
    forkExpectErrors(
      `FROM index
| FORK
  (WHERE keywordField != "" | LIMIT 100)
  (SORT doubleField ASC NULLS LAST)`,
      []
    );

    forkExpectErrors(
      `FROM index
| FORK
  (WHERE keywordField != "" | LIMIT 100)
  (SORT doubleField ASC NULLS LAST)
  (LIMIT 100)`,
      []
    );
  });

  test('requires at least two branches', () => {
    forkExpectErrors(
      `FROM index
| FORK
    (WHERE keywordField != "")`,
      [`[FORK] Must include at least two branches.`]
    );
  });

  test('enforces only one fork command', () => {
    forkExpectErrors(
      `FROM index
| FORK
    (WHERE keywordField != "" | LIMIT 100)
    (SORT doubleField ASC NULLS LAST)
| KEEP keywordField
| FORK
    (WHERE keywordField != "foo")
    (WHERE keywordField != "bar")`,
      ['[FORK] a query cannot have more than one FORK command.']
    );
  });

  describe('_fork field', () => {
    test('DOES recognize _fork field AFTER FORK', () => {
      forkExpectErrors(
        `FROM index
  | FORK
    (WHERE keywordField != "" | LIMIT 100)
    (SORT doubleField ASC NULLS LAST)
  | KEEP _fork`,
        []
      );
    });
  });

  describe('... (SUBCOMMAND ...) ...', () => {
    test('validates within subcommands', () => {
      forkExpectErrors(
        `FROM index
| FORK
    (WHERE TO_UPPER(doubleField) != "" | LIMIT 100)
    (WHERE TO_LOWER(doubleField) == "" | WHERE TRIM(integerField))`,
        [
          'Argument of [to_upper] must be [keyword], found value [doubleField] type [double]',
          'Argument of [to_lower] must be [keyword], found value [doubleField] type [double]',
          'Argument of [trim] must be [keyword], found value [integerField] type [integer]',
        ]
      );
    });

    test('forwards syntax errors', () => {
      forkExpectErrors(
        `FROM index
| FORK
    (EVAL TO_UPPER(keywordField) | LIMIT 100)
    (FORK (WHERE 1) (WHERE 2))`,
        ['[FORK] a query cannot have more than one FORK command.']
      );
    });

    describe('user-defined columns', () => {
      it('allows columns to be defined within sub-commands', () => {
        forkExpectErrors(
          `FROM index
  | FORK
      (EVAL col0 = TO_UPPER(keywordField) | LIMIT 100)
      (EVAL var0 = 1)`,
          []
        );
      });

      it('recognizes user-defined columns within branches', () => {
        forkExpectErrors(
          `FROM index
  | FORK
      (EVAL col0 = TO_UPPER(keywordField) | WHERE col0 | LIMIT 100)
      (LIMIT 1)`,
          []
        );
      });

      it.skip('does not recognize user-defined columns between branches', () => {
        forkExpectErrors(
          `FROM index
  | FORK
      (EVAL col0 = TO_UPPER(keywordField) | LIMIT 100)
      (EVAL TO_LOWER(foo))`,
          ['Unknown column [foo]']
        );
      });

      it('recognizes user-defined columns from all branches after FORK', async () => {
        forkExpectErrors(
          `FROM index
  | FORK
      (EVAL col0 = 1)
      (EVAL var0 = 1)
  | KEEP col0, var0`,
          []
        );
      });
    });
  });
});
