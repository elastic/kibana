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
import { getNoValidCallSignatureError } from '../../../definitions/utils/validation/utils';

const forkExpectErrors = async (query: string, expectedErrors: string[], context = mockContext) => {
  const { Parser } = await import('../../../parser');
  const { root } = Parser.parse(query);
  const command = root.commands.find((cmd) => cmd.name === 'fork');
  if (!command) {
    throw new Error('FORK command not found in the parsed query');
  }
  const result = await validate(command, root.commands, context);

  const errors: string[] = [];
  result.forEach((error) => {
    errors.push(error.text);
  });
  expect(errors).toEqual(expectedErrors);
};

describe('FORK Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('no errors for valid command', async () => {
    await forkExpectErrors(
      `FROM index
| FORK
  (WHERE keywordField != "" | LIMIT 100)
  (SORT doubleField ASC NULLS LAST)`,
      []
    );

    await forkExpectErrors(
      `FROM index
| FORK
  (WHERE keywordField != "" | LIMIT 100)
  (SORT doubleField ASC NULLS LAST)
  (LIMIT 100)`,
      []
    );
  });

  test('requires at least two branches', async () => {
    await forkExpectErrors(
      `FROM index
| FORK
    (WHERE keywordField != "")`,
      [`[FORK] Must include at least two branches.`]
    );
  });

  test('supports a maximum of 8 branches', async () => {
    const branches = Array(9).fill('(WHERE keywordField != "")').join(' ');
    await forkExpectErrors(`FROM index| FORK ${branches}`, [
      `[FORK] Supports a maximum of 8 branches.`,
    ]);
  });

  test('enforces only one fork command', async () => {
    await forkExpectErrors(
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
    test('DOES recognize _fork field AFTER FORK', async () => {
      await forkExpectErrors(
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
    test('validates within subcommands', async () => {
      await forkExpectErrors(
        `FROM index
| FORK
    (WHERE TO_UPPER(doubleField) != "" | LIMIT 100)
    (WHERE TO_LOWER(doubleField) == "" | WHERE TRIM(integerField))`,
        [
          getNoValidCallSignatureError('to_upper', ['double']),
          getNoValidCallSignatureError('to_lower', ['double']),
          getNoValidCallSignatureError('trim', ['integer']),
        ]
      );
    });

    test('forwards syntax errors', async () => {
      await forkExpectErrors(
        `FROM index
| FORK
    (EVAL TO_UPPER(keywordField) | LIMIT 100)
    (FORK (WHERE 1) (WHERE 2))`,
        ['[FORK] a query cannot have more than one FORK command.']
      );
    });

    describe('user-defined columns', () => {
      it('allows columns to be defined within sub-commands', async () => {
        await forkExpectErrors(
          `FROM index
  | FORK
      (EVAL col0 = TO_UPPER(keywordField) | LIMIT 100)
      (EVAL var0 = 1)`,
          []
        );
      });

      it('recognizes user-defined columns within branches', async () => {
        await forkExpectErrors(
          `FROM index
  | FORK
      (EVAL col0 = TO_UPPER(keywordField) | WHERE col0 | LIMIT 100)
      (LIMIT 1)`,
          []
        );
      });

      it.skip('does not recognize user-defined columns between branches', async () => {
        await forkExpectErrors(
          `FROM index
  | FORK
      (EVAL col0 = TO_UPPER(keywordField) | LIMIT 100)
      (EVAL TO_LOWER(foo))`,
          ['Unknown column [foo]']
        );
      });

      it('recognizes user-defined columns from all branches after FORK', async () => {
        await forkExpectErrors(
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
