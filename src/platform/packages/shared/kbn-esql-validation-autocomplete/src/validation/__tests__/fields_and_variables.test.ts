/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FunctionParameterType } from '../../definitions/types';
import { setTestFunctions } from '../../shared/test_functions';
import { setup } from './helpers';

describe('field and variable escaping', () => {
  it('recognizes escaped fields', async () => {
    const { expectErrors } = await setup();
    // command level
    await expectErrors(
      'FROM index | KEEP `kubernetes`.`something`.`something` | EVAL `kubernetes.something.something` + 12',
      []
    );
    // function argument
    await expectErrors('FROM index | EVAL ABS(`kubernetes`.`something`.`something`)', []);
  });

  it('recognizes field names with spaces and comments', async () => {
    const { expectErrors } = await setup();
    // command level
    await expectErrors('FROM index | KEEP kubernetes . something . /* gotcha! */ something', []);
    // function argument
    await expectErrors(
      'FROM index | EVAL ABS(kubernetes . something . /* gotcha! */ something)',
      []
    );
  });

  it('recognizes escaped variables', async () => {
    const { expectErrors } = await setup();
    // command level
    await expectErrors('ROW `var$iable` = 1 | EVAL `var$iable`', []);

    // command level, different escaping in declaration
    await expectErrors(
      'ROW variable.`wi#th`.separator = "lolz" | EVAL `variable`.`wi#th`.`separator`',
      []
    );

    // function arguments
    await expectErrors(
      'ROW `var$iable` = 1, variable.`wi#th`.separator = "lolz" | EVAL ABS(`var$iable`), TRIM(variable.`wi#th`.`separator`)',
      []
    );

    // expression variable
    await expectErrors('FROM index | EVAL doubleField + 20 | EVAL `doubleField + 20`', []);
    await expectErrors('ROW 21 + 20 | STATS AVG(`21 + 20`)', []);
  });

  it('recognizes variables with spaces and comments', async () => {
    const { expectErrors } = await setup();
    // command level
    await expectErrors(
      'ROW variable.`wi#th`.separator = "lolz" | RENAME variable . /* lolz */ `wi#th` . separator AS foo',
      []
    );
    // function argument
    await expectErrors(
      'ROW variable.`wi#th`.separator = "lolz" | EVAL TRIM(variable . /* lolz */ `wi#th` . separator)',
      []
    );
  });

  describe('as part of various commands', () => {
    const cases = [
      { name: 'ROW', command: 'ROW `var$iable` = 1, variable.`wi#th`.separator = "lolz"' },
      {
        name: 'DISSECT',
        command: 'ROW `funky`.`stri#$ng` = "lolz" | DISSECT `funky`.`stri#$ng` "%{WORD:firstWord}"',
      },
      { name: 'DROP', command: 'FROM index | DROP kubernetes.`something`.`something`' },
      {
        name: 'ENRICH',
        command:
          'FROM index | ENRICH policy WITH `new`.name1 = `otherField`, `new.name2` = `yetAnotherField`',
      },
      { name: 'EVAL', command: 'FROM index | EVAL kubernetes.`something`.`something` + 12' },
      {
        name: 'GROK',
        command: 'ROW `funky`.`stri#$ng` = "lolz" | GROK `funky`.`stri#$ng` "%{WORD:firstWord}"',
      },
      { name: 'KEEP', command: 'FROM index | KEEP kubernetes.`something`.`something`' },
      {
        name: 'RENAME',
        command: 'FROM index | RENAME kubernetes.`something`.`something` as foobar',
      },
      { name: 'SORT', command: 'FROM index | SORT kubernetes.`something`.`something` DESC' },
      {
        name: 'STATS ... BY',
        command:
          'FROM index | STATS AVG(kubernetes.`something`.`something`) BY `kubernetes`.`something`.`something`',
      },
      { name: 'WHERE', command: 'FROM index | WHERE kubernetes.`something`.`something` == 12' },
    ];

    it.each(cases)('$name accepts escaped fields', async ({ command }) => {
      const { expectErrors } = await setup();
      await expectErrors(command, []);
    });
  });
});

describe('variable support', () => {
  describe('variable data type detection', () => {
    // most of these tests are aspirational (and skipped) because we don't have
    // a good way to compute the type of an expression yet.
    beforeAll(() => {
      setTestFunctions([
        // this test function is just used to test the type of the variable
        {
          type: 'scalar',
          description: 'Test function',
          supportedCommands: ['eval'],
          name: 'test',
          signatures: [
            { params: [{ name: 'arg', type: 'cartesian_point' }], returnType: 'cartesian_point' },
          ],
        },
        // this test function is used to check that the correct return type is used
        // when determining variable types
        {
          type: 'scalar',
          description: 'Test function',
          supportedCommands: ['eval'],
          name: 'return_value',
          signatures: [
            { params: [{ name: 'arg', type: 'text' }], returnType: 'text' },
            { params: [{ name: 'arg', type: 'double' }], returnType: 'double' },
            {
              params: [
                { name: 'arg', type: 'double' },
                { name: 'arg', type: 'text' },
              ],
              returnType: 'long',
            },
          ],
        },
      ]);
    });

    afterAll(() => {
      setTestFunctions([]);
    });

    const expectType = (type: FunctionParameterType) =>
      `Argument of [test] must be [cartesian_point], found value [var] type [${type}]`;

    // @todo unskip after https://github.com/elastic/kibana/issues/195682
    test.skip('literals', async () => {
      const { expectErrors } = await setup();
      // literal assignment
      await expectErrors('FROM index | EVAL var = 1, TEST(var)', [expectType('integer')]);
      // literal expression
      await expectErrors('FROM index | EVAL 1, TEST(`1`)', [expectType('integer')]);
    });

    test('fields', async () => {
      const { expectErrors } = await setup();
      // field assignment
      await expectErrors('FROM index | EVAL var = textField, TEST(var)', [expectType('text')]);
    });

    // @todo unskip after https://github.com/elastic/kibana/issues/195682
    test.skip('variables', async () => {
      const { expectErrors } = await setup();
      await expectErrors('FROM index | EVAL var = textField, var2 = var, TEST(var2)', [
        `Argument of [test] must be [cartesian_point], found value [var2] type [text]`,
      ]);
    });

    // @todo unskip after https://github.com/elastic/kibana/issues/195682
    test.skip('inline casting', async () => {
      const { expectErrors } = await setup();
      // inline cast assignment
      await expectErrors('FROM index | EVAL var = doubleField::long, TEST(var)', [
        expectType('long'),
      ]);
      // inline cast expression
      await expectErrors('FROM index | EVAL doubleField::long, TEST(`doubleField::long`)', [
        expectType('long'),
      ]);
    });

    // @todo unskip after https://github.com/elastic/kibana/issues/195682
    test.skip('function results', async () => {
      const { expectErrors } = await setup();
      // function assignment
      await expectErrors('FROM index | EVAL var = RETURN_VALUE(doubleField), TEST(var)', [
        expectType('double'),
      ]);
      await expectErrors('FROM index | EVAL var = RETURN_VALUE(textField), TEST(var)', [
        expectType('text'),
      ]);
      await expectErrors(
        'FROM index | EVAL var = RETURN_VALUE(doubleField, textField), TEST(var)',
        [expectType('long')]
      );
      // function expression
      await expectErrors(
        'FROM index | EVAL RETURN_VALUE(doubleField), TEST(`RETURN_VALUE(doubleField)`)',
        [expectType('double')]
      );
      await expectErrors(
        'FROM index | EVAL RETURN_VALUE(textField), TEST(`RETURN_VALUE(textField)`)',
        [expectType('text')]
      );
      await expectErrors(
        'FROM index | EVAL RETURN_VALUE(doubleField, textField), TEST(`RETURN_VALUE(doubleField, textField)`)',
        [expectType('long')]
      );
    });
  });
});
