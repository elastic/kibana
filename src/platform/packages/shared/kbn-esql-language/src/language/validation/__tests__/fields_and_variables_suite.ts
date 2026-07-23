/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type FunctionParameterType,
  FunctionDefinitionTypes,
} from '../../../commands/definitions/types';
import { getNoValidCallSignatureError } from '../../../commands/definitions/utils/validation/utils';
import { Location } from '../../../commands/registry/types';
import { setTestFunctions } from '../../../commands/definitions/utils/test_functions';
import type { Setup } from './helpers';

export const runFieldsAndVariablesValidationSuite = (setup: Setup) => {
  describe('column escaping', () => {
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

    it('recognizes escaped user-defined columns', async () => {
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

      // expression user-defined column
      await expectErrors('FROM index | EVAL doubleField + 20 | EVAL `doubleField + 20`', []);
      await expectErrors('ROW 21 + 20 | STATS AVG(`21 + 20`)', []);
    });

    it('recognizes user-defined columns with spaces and comments', async () => {
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
          command:
            'ROW `funky`.`stri#$ng` = "lolz" | DISSECT `funky`.`stri#$ng` "%{WORD:firstWord}"',
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

  describe('nested quoted expressions', () => {
    const NESTING_LEVELS = 4;
    const NESTED_DEPTHS = Array(NESTING_LEVELS)
      .fill(0)
      .map((_, i) => i + 1);

    function getTicks(amount: number) {
      return Array(amount).fill('`').join('');
    }

    /**
     * Given an initial quoted expression, build a new quoted expression
     * that appends as many +1 to the previous one based on the nesting level
     * i.e. given the expression `round(...) + 1` returns
     * ```round(...) + 1`` + 1` (for nesting 1)
     * ```````round(...) + 1```` + 1`` + 1` (for nesting 2)
     *  etc...
     * Note how backticks double for each level + wrapping quotes
     * The general rule follows an exponential curve given a nesting N:
     * (`){ (2^N)-1 } ticks expression (`){ 2^N-1 } +1 (`){ 2^N-2 } +1 ... +1
     *
     * Mind that nesting arg here is equivalent to N-1
     */
    function buildNestedExpression(expr: string, nesting: number) {
      const openingTicks = getTicks(Math.pow(2, nesting + 1) - 1);
      const firstClosingBatch = getTicks(Math.pow(2, nesting));
      const additionalPlusOnesWithTicks = Array(nesting)
        .fill(' + 1')
        .reduce((acc: string, plusOneAppended: string, i: number) => {
          // workout how many ticks to add: 2^N-i
          const ticks = getTicks(Math.pow(2, nesting - 1 - i));
          return `${acc}${plusOneAppended}${ticks}`;
        }, '');
      return `${openingTicks}${expr}${firstClosingBatch}${additionalPlusOnesWithTicks}`;
    }

    it.each(NESTED_DEPTHS)('handles nesting level %i without errors', async (nesting) => {
      const { expectErrors } = await setup();
      // start with a quotable expression
      const expr = 'round(doubleField) + 1';
      const startingQuery = `from a_index | eval ${expr}`;
      // now pipe for each nesting level a new eval command that appends a +1 to the previous quoted expression
      const finalQuery = `${startingQuery} | ${Array(nesting)
        .fill('')
        .map((_, i) => `eval ${buildNestedExpression(expr, i)} + 1`)
        .join(' | ')} | keep ${buildNestedExpression(expr, nesting)}`;
      await expectErrors(finalQuery, []);
    });
  });

  describe('user-defined column support', () => {
    describe('user-defined column data type detection', () => {
      beforeAll(() => {
        setTestFunctions([
          // this test function is just used to test the type of the user-defined column
          {
            type: FunctionDefinitionTypes.SCALAR,
            description: 'Test function',
            locationsAvailable: [Location.EVAL],
            name: 'test',
            signatures: [
              { params: [{ name: 'arg', type: 'cartesian_point' }], returnType: 'cartesian_point' },
            ],
          },
          // this test function is used to check that the correct return type is used
          // when determining user-defined column types
          {
            type: FunctionDefinitionTypes.SCALAR,
            description: 'Test function',
            locationsAvailable: [Location.EVAL],
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
        getNoValidCallSignatureError('test', [type]);

      test('literals', async () => {
        const { expectErrors } = await setup();
        // literal assignment
        await expectErrors('FROM index | EVAL var = 1, TEST(var)', [expectType('integer')]);
        // literal expression
        await expectErrors('FROM index | EVAL 1, TEST(`1`)', [expectType('integer')]);
      });

      test('fields', async () => {
        const { expectErrors } = await setup();
        // field assignment
        await expectErrors('FROM index | EVAL var = textField, TEST(var)', [
          getNoValidCallSignatureError('test', ['text']),
        ]);
      });

      test('user-defined columns', async () => {
        const { expectErrors } = await setup();
        await expectErrors('FROM index | EVAL var = textField, col2 = var, TEST(col2)', [
          getNoValidCallSignatureError('test', ['text']),
        ]);
      });

      test('inline casting', async () => {
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

      test('function results', async () => {
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
};
