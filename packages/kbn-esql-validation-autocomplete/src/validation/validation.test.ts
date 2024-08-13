/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import { writeFile, readFile } from 'fs/promises';
import { ignoreErrorsMap, validateQuery } from './validation';
import { evalFunctionDefinitions } from '../definitions/functions';
import { getFunctionSignatures } from '../definitions/helpers';
import {
  FieldType,
  FunctionDefinition,
  SupportedDataType,
  dataTypes,
  fieldTypes as _fieldTypes,
} from '../definitions/types';
import { timeUnits, timeUnitsToSuggest } from '../definitions/literals';
import { statsAggregationFunctionDefinitions } from '../definitions/aggs';
import capitalize from 'lodash/capitalize';
import { camelCase } from 'lodash';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { nonNullable } from '../shared/helpers';
import { FUNCTION_DESCRIBE_BLOCK_NAME } from './function_describe_block_name';
import {
  fields,
  enrichFields,
  getCallbackMocks,
  indexes,
  policies,
  unsupported_field,
} from '../__tests__/helpers';
import { validationFromCommandTestSuite as runFromTestSuite } from './__tests__/test_suites/validation.command.from';
import { Setup, setup } from './__tests__/helpers';

const fieldTypes = _fieldTypes.filter((type) => type !== 'unsupported');

const NESTING_LEVELS = 4;
const NESTED_DEPTHS = Array(NESTING_LEVELS)
  .fill(0)
  .map((_, i) => i + 1);

const toAvgSignature = statsAggregationFunctionDefinitions.find(({ name }) => name === 'avg')!;
const toInteger = evalFunctionDefinitions.find(({ name }) => name === 'to_integer')!;
const toDoubleSignature = evalFunctionDefinitions.find(({ name }) => name === 'to_double')!;
const toStringSignature = evalFunctionDefinitions.find(({ name }) => name === 'to_string')!;
const toDateSignature = evalFunctionDefinitions.find(({ name }) => name === 'to_datetime')!;
const toBooleanSignature = evalFunctionDefinitions.find(({ name }) => name === 'to_boolean')!;
const toIpSignature = evalFunctionDefinitions.find(({ name }) => name === 'to_ip')!;
const toGeoPointSignature = evalFunctionDefinitions.find(({ name }) => name === 'to_geopoint')!;
const toGeoShapeSignature = evalFunctionDefinitions.find(({ name }) => name === 'to_geoshape')!;
const toCartesianPointSignature = evalFunctionDefinitions.find(
  ({ name }) => name === 'to_cartesianpoint'
)!;
const toCartesianShapeSignature = evalFunctionDefinitions.find(
  ({ name }) => name === 'to_cartesianshape'
)!;
const toVersionSignature = evalFunctionDefinitions.find(({ name }) => name === 'to_version')!;

const nestedFunctions = {
  double: prepareNestedFunction(toDoubleSignature),
  integer: prepareNestedFunction(toInteger),
  string: prepareNestedFunction(toStringSignature),
  text: prepareNestedFunction(toStringSignature),
  keyword: prepareNestedFunction(toStringSignature),
  date: prepareNestedFunction(toDateSignature),
  boolean: prepareNestedFunction(toBooleanSignature),
  ip: prepareNestedFunction(toIpSignature),
  version: prepareNestedFunction(toVersionSignature),
  geo_point: prepareNestedFunction(toGeoPointSignature),
  geo_shape: prepareNestedFunction(toGeoShapeSignature),
  cartesian_point: prepareNestedFunction(toCartesianPointSignature),
  cartesian_shape: prepareNestedFunction(toCartesianShapeSignature),
  datetime: prepareNestedFunction(toDateSignature),
};

const literals = {
  time_literal: timeUnitsToSuggest[0].name,
};
function getLiteralType(typeString: 'time_literal') {
  return `1 ${literals[typeString]}`;
}

export const fieldNameFromType = (type: FieldType) => `${camelCase(type)}Field`;

function getFieldName(
  typeString: string,
  { useNestedFunction, isStats }: { useNestedFunction: boolean; isStats: boolean }
) {
  if (useNestedFunction && isStats) {
    return prepareNestedFunction(toAvgSignature);
  }
  return useNestedFunction && typeString in nestedFunctions
    ? nestedFunctions[typeString as keyof typeof nestedFunctions]
    : `${camelCase(typeString)}Field`;
}

function getMultiValue(type: string) {
  if (/string|any/.test(type)) {
    return `["a", "b", "c"]`;
  }
  if (/number/.test(type)) {
    return `[1, 2, 3]`;
  }
  return `[true, false]`;
}

function prepareNestedFunction(fnSignature: FunctionDefinition): string {
  return getFunctionSignatures(
    {
      ...fnSignature,
      signatures: [
        {
          ...fnSignature?.signatures[0]!,
          params: getFieldMapping(fnSignature?.signatures[0]!.params),
        },
      ],
    },
    { withTypes: false, capitalize: false }
  )[0].declaration;
}
function getFieldMapping(
  params: FunctionDefinition['signatures'][number]['params'],
  { useNestedFunction, useLiterals }: { useNestedFunction: boolean; useLiterals: boolean } = {
    useNestedFunction: false,
    useLiterals: true,
  }
) {
  const literalValues = {
    string: `"a"`,
    number: '5',
    date: 'now()',
  };
  return params.map(({ name: _name, type, constantOnly, literalOptions, ...rest }) => {
    const typeString: string = type as string;
    if (dataTypes.includes(typeString as SupportedDataType)) {
      if (useLiterals && literalOptions) {
        return {
          name: `"${literalOptions[0]}"`,
          type,
          ...rest,
        };
      }

      const fieldName =
        constantOnly && typeString in literalValues
          ? literalValues[typeString as keyof typeof literalValues]!
          : getFieldName(typeString, {
              useNestedFunction,
              isStats: !useLiterals,
            });
      return {
        name: fieldName,
        type,
        ...rest,
      };
    }
    if (/literal$/.test(typeString) && useLiterals) {
      return {
        name: getLiteralType(typeString as 'time_literal'),
        type,
        ...rest,
      };
    }
    if (/\[\]$/.test(typeString)) {
      return {
        name: getMultiValue(typeString),
        type,
        ...rest,
      };
    }
    return { name: 'textField', type, ...rest };
  });
}

describe('validation logic', () => {
  const testCases: Array<{ query: string; error: string[]; warning: string[] }> = [];

  describe('Full validation performed', () => {
    afterAll(async () => {
      const targetFolder = join(__dirname, 'esql_validation_meta_tests.json');
      try {
        await writeFile(
          targetFolder,
          JSON.stringify(
            {
              indexes,
              fields: fields.concat([{ name: policies[0].matchField, type: 'keyword' }]),
              enrichFields: enrichFields.concat([
                { name: policies[0].matchField, type: 'keyword' },
              ]),
              policies,
              unsupported_field,
              testCases,
            },
            null,
            2
          )
        );
      } catch (e) {
        throw new Error(`Error writing test cases to ${targetFolder}: ${e.message}`);
      }
    });

    function testErrorsAndWarningsFn(
      statement: string,
      expectedErrors: string[] = [],
      expectedWarnings: string[] = [],
      { only, skip }: { only?: boolean; skip?: boolean } = {}
    ) {
      const testFn = only ? it.only : skip ? it.skip : it;
      testCases.push({
        query: statement,
        error: expectedErrors,
        warning: expectedWarnings,
      });

      testFn(
        `${statement} => ${expectedErrors.length} errors, ${expectedWarnings.length} warnings`,
        async () => {
          const callbackMocks = getCallbackMocks();
          const { warnings, errors } = await validateQuery(
            statement,
            getAstAndSyntaxErrors,
            undefined,
            callbackMocks
          );
          expect(errors.map((e) => ('message' in e ? e.message : e.text))).toEqual(expectedErrors);
          expect(warnings.map((w) => w.text)).toEqual(expectedWarnings);
        }
      );
    }

    type TestArgs = [string, string[], string[]?];

    // Make only and skip work with our custom wrapper
    //
    // DO NOT CHANGE THE NAME OF THIS FUNCTION WITHOUT ALSO CHANGING
    // THE LINTER RULE IN packages/kbn-eslint-config/typescript.js
    //
    const testErrorsAndWarnings = Object.assign(testErrorsAndWarningsFn, {
      skip: (...args: TestArgs) => {
        const warningArgs = [[]].slice(args.length - 2);
        return testErrorsAndWarningsFn(
          ...((args.length > 1 ? [...args, ...warningArgs] : args) as TestArgs),
          {
            skip: true,
          }
        );
      },
      only: (...args: TestArgs) => {
        const warningArgs = [[]].slice(args.length - 2);
        return testErrorsAndWarningsFn(
          ...((args.length > 1 ? [...args, ...warningArgs] : args) as TestArgs),
          {
            only: true,
          }
        );
      },
    });

    // The following block tests a case that is allowed in Kibana
    // by suppressing the parser error in packages/kbn-esql-ast/src/ast_parser.ts
    describe('ESQL query can be empty', () => {
      testErrorsAndWarnings('', []);
      testErrorsAndWarnings(' ', []);
      testErrorsAndWarnings('     ', []);
    });

    describe('ESQL query should start with a source command', () => {
      ['eval', 'stats', 'rename', 'limit', 'keep', 'drop', 'mv_expand', 'dissect', 'grok'].map(
        (command) =>
          testErrorsAndWarnings(command, [
            `SyntaxError: mismatched input '${command}' expecting {'explain', 'from', 'meta', 'metrics', 'row', 'show'}`,
          ])
      );
    });

    const collectFixturesSetup: Setup = async (...args) => {
      const api = await setup(...args);
      type ExpectErrors = Awaited<ReturnType<Setup>>['expectErrors'];
      return {
        ...api,
        expectErrors: async (...params: Parameters<ExpectErrors>) => {
          const [query, error = [], warning = []] = params;
          const allStrings =
            error.every((e) => typeof e === 'string') &&
            warning.every((w) => typeof w === 'string');
          if (allStrings) {
            testCases.push({
              query,
              error,
              warning,
            });
          }
        },
      };
    };

    runFromTestSuite(collectFixturesSetup);

    describe('row', () => {
      testErrorsAndWarnings('row', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('row missing_column', ['Unknown column [missing_column]']);
      testErrorsAndWarnings('row fn()', ['Unknown function [fn]']);
      testErrorsAndWarnings('row missing_column, missing_column2', [
        'Unknown column [missing_column]',
        'Unknown column [missing_column2]',
      ]);
      testErrorsAndWarnings('row a=1', []);
      testErrorsAndWarnings('row a=1, missing_column', ['Unknown column [missing_column]']);
      testErrorsAndWarnings('row a=1, b = average()', ['Unknown function [average]']);
      testErrorsAndWarnings('row a = [1, 2, 3]', []);
      testErrorsAndWarnings('row a = [true, false]', []);
      testErrorsAndWarnings('row a = ["a", "b"]', []);
      testErrorsAndWarnings('row a = null', []);
      testErrorsAndWarnings('row a = (1)', []);
      testErrorsAndWarnings('row a = (1, 2, 3)', [
        "SyntaxError: no viable alternative at input '(1,'",
        "SyntaxError: extraneous input ')' expecting <EOF>",
      ]);
      for (const bool of ['true', 'false']) {
        testErrorsAndWarnings(`row a=NOT ${bool}`, []);
        testErrorsAndWarnings(`row NOT ${bool}`, []);
      }

      testErrorsAndWarnings('row var = 1 in ', [
        "SyntaxError: mismatched input '<EOF>' expecting '('",
      ]);
      testErrorsAndWarnings('row var = 1 in (', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
        'Error: [in] function expects exactly 2 arguments, got 1.',
      ]);
      testErrorsAndWarnings('row var = 1 not in ', [
        "SyntaxError: mismatched input '<EOF>' expecting '('",
      ]);
      testErrorsAndWarnings('row var = 1 in (1, 2, 3)', []);
      testErrorsAndWarnings('row var = 5 in (1, 2, 3)', []);
      testErrorsAndWarnings('row var = 5 not in (1, 2, 3)', []);
      testErrorsAndWarnings('row var = 1 in (1, 2, 3, round(5))', []);
      testErrorsAndWarnings('row var = "a" in ("a", "b", "c")', []);
      testErrorsAndWarnings('row var = "a" in ("a", "b", "c")', []);
      testErrorsAndWarnings('row var = "a" not in ("a", "b", "c")', []);
      testErrorsAndWarnings('row var = 1 in ("a", "b", "c")', [
        // 'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
      ]);
      testErrorsAndWarnings('row var = 5 in ("a", "b", "c")', [
        // 'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
      ]);
      testErrorsAndWarnings('row var = 5 not in ("a", "b", "c")', [
        // 'Argument of [not_in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
      ]);
      testErrorsAndWarnings('row var = 5 not in (1, 2, 3, "a")', [
        // 'Argument of [not_in] must be [number[]], found value [(1, 2, 3, "a")] type [(number, number, number, string)]',
      ]);

      // test that "and" and "or" accept null... not sure if this is the best place or not...
      for (const op of ['and', 'or']) {
        for (const firstParam of ['true', 'null']) {
          for (const secondParam of ['false', 'null']) {
            testErrorsAndWarnings(`row bool_var = ${firstParam} ${op} ${secondParam}`, []);
          }
        }
      }

      for (const op of ['>', '>=', '<', '<=', '==', '!=']) {
        testErrorsAndWarnings(`row var = 5 ${op} 0`, []);
        testErrorsAndWarnings(`row var = NOT 5 ${op} 0`, []);
        testErrorsAndWarnings(`row var = (doubleField ${op} 0)`, ['Unknown column [doubleField]']);
        testErrorsAndWarnings(`row var = (NOT (5 ${op} 0))`, []);
        testErrorsAndWarnings(`row var = to_ip("127.0.0.1") ${op} to_ip("127.0.0.1")`, []);
        testErrorsAndWarnings(`row var = now() ${op} now()`, []);
        testErrorsAndWarnings(
          `row var = false ${op} false`,
          ['==', '!='].includes(op)
            ? []
            : [
                `Argument of [${op}] must be [date], found value [false] type [boolean]`,
                `Argument of [${op}] must be [date], found value [false] type [boolean]`,
              ]
        );
        for (const [valueTypeA, valueTypeB] of [['now()', '"2022"']]) {
          testErrorsAndWarnings(`row var = ${valueTypeA} ${op} ${valueTypeB}`, []);
          testErrorsAndWarnings(`row var = ${valueTypeB} ${op} ${valueTypeA}`, []);
        }
      }
      for (const op of ['+', '-', '*', '/', '%']) {
        testErrorsAndWarnings(`row var = 1 ${op} 1`, []);
        testErrorsAndWarnings(`row var = (5 ${op} 1)`, []);
        testErrorsAndWarnings(
          `row var = now() ${op} now()`,
          ['+', '-'].includes(op)
            ? [`Argument of [${op}] must be [date_period], found value [now()] type [date]`]
            : [
                `Argument of [${op}] must be [double], found value [now()] type [date]`,
                `Argument of [${op}] must be [double], found value [now()] type [date]`,
              ]
        );
      }

      for (const op of ['like', 'rlike']) {
        testErrorsAndWarnings(`row var = "a" ${op} "?a"`, []);
        testErrorsAndWarnings(`row var = "a" NOT ${op} "?a"`, []);
        testErrorsAndWarnings(`row var = NOT "a" ${op} "?a"`, []);
        testErrorsAndWarnings(`row var = NOT "a" NOT ${op} "?a"`, []);
        testErrorsAndWarnings(`row var = 5 ${op} "?a"`, [
          `Argument of [${op}] must be [text], found value [5] type [integer]`,
        ]);
        testErrorsAndWarnings(`row var = 5 NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [text], found value [5] type [integer]`,
        ]);
        testErrorsAndWarnings(`row var = NOT 5 ${op} "?a"`, [
          `Argument of [${op}] must be [text], found value [5] type [integer]`,
        ]);
        testErrorsAndWarnings(`row var = NOT 5 NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [text], found value [5] type [integer]`,
        ]);
      }

      testErrorsAndWarnings(
        `row var = mv_sort(["a", "b"], "bogus")`,
        [],
        ['Invalid option ["bogus"] for mv_sort. Supported options: ["asc", "desc"].']
      );

      testErrorsAndWarnings(`row var = mv_sort(["a", "b"], "ASC")`, []);
      testErrorsAndWarnings(`row var = mv_sort(["a", "b"], "DESC")`, []);

      describe('date math', () => {
        testErrorsAndWarnings('row 1 anno', [
          'ROW does not support [date_period] in expression [1 anno]',
        ]);
        testErrorsAndWarnings('row var = 1 anno', ["Unexpected time interval qualifier: 'anno'"]);
        testErrorsAndWarnings('row now() + 1 anno', ["Unexpected time interval qualifier: 'anno'"]);
        for (const timeLiteral of timeUnitsToSuggest) {
          testErrorsAndWarnings(`row 1 ${timeLiteral.name}`, [
            `ROW does not support [date_period] in expression [1 ${timeLiteral.name}]`,
          ]);
          testErrorsAndWarnings(`row 1                ${timeLiteral.name}`, [
            `ROW does not support [date_period] in expression [1 ${timeLiteral.name}]`,
          ]);

          // this is not possible for now
          // testErrorsAndWarnings(`row var = 1 ${timeLiteral.name}`, [
          //   `Row does not support [date_period] in expression [1 ${timeLiteral.name}]`,
          // ]);
          testErrorsAndWarnings(`row var = now() - 1 ${timeLiteral.name}`, []);
          testErrorsAndWarnings(`row var = now() - 1 ${timeLiteral.name.toUpperCase()}`, []);
          testErrorsAndWarnings(`row var = now() - 1 ${capitalize(timeLiteral.name)}`, []);
          testErrorsAndWarnings(`row var = now() + 1 ${timeLiteral.name}`, []);
          testErrorsAndWarnings(`row 1 ${timeLiteral.name} + 1 year`, [
            `Argument of [+] must be [date], found value [1 ${timeLiteral.name}] type [duration]`,
          ]);
          for (const op of ['*', '/', '%']) {
            testErrorsAndWarnings(`row var = now() ${op} 1 ${timeLiteral.name}`, [
              `Argument of [${op}] must be [double], found value [now()] type [date]`,
              `Argument of [${op}] must be [double], found value [1 ${timeLiteral.name}] type [duration]`,
            ]);
          }
        }
      });
    });

    describe('show', () => {
      testErrorsAndWarnings('show', ["SyntaxError: missing 'info' at '<EOF>'"]);
      testErrorsAndWarnings('show info', []);
      testErrorsAndWarnings('show doubleField', [
        "SyntaxError: token recognition error at: 'd'",
        "SyntaxError: token recognition error at: 'o'",
        "SyntaxError: token recognition error at: 'u'",
        "SyntaxError: token recognition error at: 'b'",
        "SyntaxError: token recognition error at: 'l'",
        "SyntaxError: token recognition error at: 'e'",
        "SyntaxError: token recognition error at: 'F'",
        "SyntaxError: token recognition error at: 'ie'",
        "SyntaxError: token recognition error at: 'l'",
        "SyntaxError: token recognition error at: 'd'",
        "SyntaxError: missing 'info' at '<EOF>'",
      ]);
    });

    describe('limit', () => {
      testErrorsAndWarnings('from index | limit ', [
        `SyntaxError: missing INTEGER_LITERAL at '<EOF>'`,
      ]);
      testErrorsAndWarnings('from index | limit 4 ', []);
      testErrorsAndWarnings('from index | limit 4.5', [
        "SyntaxError: mismatched input '4.5' expecting INTEGER_LITERAL",
      ]);
      testErrorsAndWarnings('from index | limit a', [
        "SyntaxError: mismatched input 'a' expecting INTEGER_LITERAL",
      ]);
      testErrorsAndWarnings('from index | limit doubleField', [
        "SyntaxError: mismatched input 'doubleField' expecting INTEGER_LITERAL",
      ]);
      testErrorsAndWarnings('from index | limit textField', [
        "SyntaxError: mismatched input 'textField' expecting INTEGER_LITERAL",
      ]);
      testErrorsAndWarnings('from index | limit 4', []);
    });

    describe('lookup', () => {
      testErrorsAndWarnings('ROW a=1::LONG | LOOKUP t ON a', []);
    });

    describe('keep', () => {
      testErrorsAndWarnings('from index | keep ', ["SyntaxError: missing ID_PATTERN at '<EOF>'"]);
      testErrorsAndWarnings(
        'from index | keep keywordField, doubleField, integerField, dateField',
        []
      );
      testErrorsAndWarnings(
        'from index | keep `keywordField`, `doubleField`, `integerField`, `dateField`',
        []
      );
      testErrorsAndWarnings('from index | keep 4.5', [
        "SyntaxError: token recognition error at: '4'",
        "SyntaxError: token recognition error at: '5'",
        "SyntaxError: missing ID_PATTERN at '.'",
        "SyntaxError: missing ID_PATTERN at '<EOF>'",
      ]);
      testErrorsAndWarnings('from index | keep `4.5`', ['Unknown column [4.5]']);
      testErrorsAndWarnings('from index | keep missingField, doubleField, dateField', [
        'Unknown column [missingField]',
      ]);
      testErrorsAndWarnings('from index | keep `any#Char$Field`', []);
      testErrorsAndWarnings('from index | project ', [
        "SyntaxError: mismatched input 'project' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'inlinestats', 'keep', 'limit', 'lookup', 'mv_expand', 'rename', 'sort', 'stats', 'where', MATCH}",
      ]);
      testErrorsAndWarnings('from index | project textField, doubleField, dateField', [
        "SyntaxError: mismatched input 'project' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'inlinestats', 'keep', 'limit', 'lookup', 'mv_expand', 'rename', 'sort', 'stats', 'where', MATCH}",
      ]);
      testErrorsAndWarnings('from index | PROJECT textField, doubleField, dateField', [
        "SyntaxError: mismatched input 'PROJECT' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'inlinestats', 'keep', 'limit', 'lookup', 'mv_expand', 'rename', 'sort', 'stats', 'where', MATCH}",
      ]);
      testErrorsAndWarnings('from index | project missingField, doubleField, dateField', [
        "SyntaxError: mismatched input 'project' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'inlinestats', 'keep', 'limit', 'lookup', 'mv_expand', 'rename', 'sort', 'stats', 'where', MATCH}",
      ]);
      testErrorsAndWarnings('from index | keep k*', []);
      testErrorsAndWarnings('from index | keep *Field', []);
      testErrorsAndWarnings('from index | keep k*Field', []);
      testErrorsAndWarnings('from index | keep key*Field', []);
      testErrorsAndWarnings('from index | keep k*, i*', []);
      testErrorsAndWarnings('from index | keep m*', ['Unknown column [m*]']);
      testErrorsAndWarnings('from index | keep *m', ['Unknown column [*m]']);
      testErrorsAndWarnings('from index | keep d*m', ['Unknown column [d*m]']);

      testErrorsAndWarnings(
        `FROM index | STATS ROUND(AVG(doubleField * 1.5)), COUNT(*), MIN(doubleField * 10) | KEEP \`MIN(doubleField * 10)\``,
        []
      );
      testErrorsAndWarnings(
        `FROM index | STATS COUNT(*), MIN(doubleField * 10), MAX(doubleField)| KEEP \`COUNT(*)\``,
        []
      );
    });

    describe('drop', () => {
      testErrorsAndWarnings('from index | drop ', ["SyntaxError: missing ID_PATTERN at '<EOF>'"]);
      testErrorsAndWarnings('from index | drop textField, doubleField, dateField', []);
      testErrorsAndWarnings('from index | drop 4.5', [
        "SyntaxError: token recognition error at: '4'",
        "SyntaxError: token recognition error at: '5'",
        "SyntaxError: missing ID_PATTERN at '.'",
        "SyntaxError: missing ID_PATTERN at '<EOF>'",
      ]);
      testErrorsAndWarnings('from index | drop missingField, doubleField, dateField', [
        'Unknown column [missingField]',
      ]);
      testErrorsAndWarnings('from index | drop `any#Char$Field`', []);
      testErrorsAndWarnings('from index | drop t*', []);
      testErrorsAndWarnings('from index | drop t**Field', []);
      testErrorsAndWarnings('from index | drop *Field*', []);
      testErrorsAndWarnings('from index | drop t*F*d', []);
      testErrorsAndWarnings('from index | drop *Field', []);
      testErrorsAndWarnings('from index | drop t*Field', []);
      testErrorsAndWarnings('from index | drop textField', []);
      testErrorsAndWarnings('from index | drop s*, d*', ['Unknown column [s*]']);
      testErrorsAndWarnings('from index | drop m*', ['Unknown column [m*]']);
      testErrorsAndWarnings('from index | drop *m', ['Unknown column [*m]']);
      testErrorsAndWarnings('from index | drop d*m', ['Unknown column [d*m]']);
      testErrorsAndWarnings('from index | drop *', ['Removing all fields is not allowed [*]']);
      testErrorsAndWarnings('from index | drop textField, *', [
        'Removing all fields is not allowed [*]',
      ]);
      testErrorsAndWarnings(
        'from index | drop @timestamp',
        [],
        ['Drop [@timestamp] will remove all time filters to the search results']
      );
      testErrorsAndWarnings(
        'from index | drop textField, @timestamp',
        [],
        ['Drop [@timestamp] will remove all time filters to the search results']
      );
      testErrorsAndWarnings(
        `FROM index | STATS ROUND(AVG(doubleField * 1.5)), COUNT(*), MIN(doubleField * 10) | DROP \`MIN(doubleField * 10)\``,
        []
      );
      testErrorsAndWarnings(
        `FROM index | STATS COUNT(*), MIN(doubleField * 10), MAX(doubleField)| DROP \`COUNT(*)\``,
        []
      );
    });

    describe('mv_expand', () => {
      testErrorsAndWarnings('from a_index | mv_expand ', [
        "SyntaxError: missing {UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} at '<EOF>'",
      ]);
      for (const type of ['text', 'integer', 'date', 'boolean', 'ip']) {
        testErrorsAndWarnings(`from a_index | mv_expand ${type}Field`, []);
      }

      testErrorsAndWarnings('from a_index | mv_expand doubleField, b', [
        "SyntaxError: token recognition error at: ','",
        "SyntaxError: extraneous input 'b' expecting <EOF>",
      ]);

      testErrorsAndWarnings('row a = "a" | mv_expand a', []);
      testErrorsAndWarnings('row a = [1, 2, 3] | mv_expand a', []);
      testErrorsAndWarnings('row a = [true, false] | mv_expand a', []);
      testErrorsAndWarnings('row a = ["a", "b"] | mv_expand a', []);
    });

    describe('rename', () => {
      testErrorsAndWarnings('from a_index | rename', [
        "SyntaxError: mismatched input '<EOF>' expecting ID_PATTERN",
      ]);
      testErrorsAndWarnings('from a_index | rename textField', [
        "SyntaxError: mismatched input '<EOF>' expecting 'as'",
      ]);
      testErrorsAndWarnings('from a_index | rename a', [
        "SyntaxError: mismatched input '<EOF>' expecting 'as'",
        'Unknown column [a]',
      ]);
      testErrorsAndWarnings('from a_index | rename textField as', [
        "SyntaxError: missing ID_PATTERN at '<EOF>'",
      ]);
      testErrorsAndWarnings('from a_index | rename missingField as', [
        "SyntaxError: missing ID_PATTERN at '<EOF>'",
        'Unknown column [missingField]',
      ]);
      testErrorsAndWarnings('from a_index | rename textField as b', []);
      testErrorsAndWarnings('from a_index | rename textField AS b', []);
      testErrorsAndWarnings('from a_index | rename textField As b', []);
      testErrorsAndWarnings('from a_index | rename textField As b, b AS c', []);
      testErrorsAndWarnings('from a_index | rename fn() as a', [
        "SyntaxError: token recognition error at: '('",
        "SyntaxError: token recognition error at: ')'",
        'Unknown column [fn]',
        'Unknown column [a]',
      ]);
      testErrorsAndWarnings(
        'from a_index | eval doubleField + 1 | rename `doubleField + 1` as a',
        []
      );
      testErrorsAndWarnings(
        'from a_index | stats avg(doubleField) | rename `avg(doubleField)` as avg0',
        []
      );
      testErrorsAndWarnings('from a_index |eval doubleField + 1 | rename `doubleField + 1` as ', [
        "SyntaxError: missing ID_PATTERN at '<EOF>'",
      ]);
      testErrorsAndWarnings('from a_index | rename key* as keywords', [
        'Using wildcards (*) in RENAME is not allowed [key*]',
        'Unknown column [keywords]',
      ]);
      testErrorsAndWarnings('from a_index | rename s* as strings', [
        'Unknown column [s*]',
        'Unknown column [strings]',
      ]);
      testErrorsAndWarnings('row a = 10 | rename a as `this``is fine`', []);
      testErrorsAndWarnings('row a = 10 | rename a as this is fine', [
        "SyntaxError: mismatched input 'is' expecting <EOF>",
      ]);
    });

    describe('dissect', () => {
      testErrorsAndWarnings('from a_index | dissect', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | dissect textField', [
        "SyntaxError: missing QUOTED_STRING at '<EOF>'",
      ]);
      testErrorsAndWarnings('from a_index | dissect textField 2', [
        "SyntaxError: mismatched input '2' expecting QUOTED_STRING",
      ]);
      testErrorsAndWarnings('from a_index | dissect textField .', [
        "SyntaxError: mismatched input '<EOF>' expecting {UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
        'Unknown column [textField.]',
      ]);
      testErrorsAndWarnings('from a_index | dissect textField %a', [
        "SyntaxError: mismatched input '%' expecting QUOTED_STRING",
        "SyntaxError: mismatched input '<EOF>' expecting '='",
      ]);
      // Do not try to validate the dissect pattern string
      testErrorsAndWarnings('from a_index | dissect textField "%{firstWord}"', []);
      testErrorsAndWarnings('from a_index | dissect doubleField "%{firstWord}"', [
        'DISSECT only supports string type values, found [doubleField] of type [double]',
      ]);
      testErrorsAndWarnings('from a_index | dissect textField "%{firstWord}" option ', [
        "SyntaxError: mismatched input '<EOF>' expecting '='",
      ]);
      testErrorsAndWarnings('from a_index | dissect textField "%{firstWord}" option = ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET}",
        'Invalid option for DISSECT: [option]',
      ]);
      testErrorsAndWarnings('from a_index | dissect textField "%{firstWord}" option = 1', [
        'Invalid option for DISSECT: [option]',
      ]);
      testErrorsAndWarnings(
        'from a_index | dissect textField "%{firstWord}" append_separator = "-"',
        []
      );
      testErrorsAndWarnings(
        'from a_index | dissect textField "%{firstWord}" ignore_missing = true',
        ['Invalid option for DISSECT: [ignore_missing]']
      );
      testErrorsAndWarnings(
        'from a_index | dissect textField "%{firstWord}" append_separator = true',
        ['Invalid value for DISSECT append_separator: expected a string, but was [true]']
      );
      testErrorsAndWarnings('from a_index | dissect textField "%{firstWord}" | keep firstWord', []);
      // testErrorsAndWarnings('from a_index | dissect s* "%{a}"', [
      //   'Using wildcards (*) in dissect is not allowed [s*]',
      // ]);
    });

    describe('grok', () => {
      testErrorsAndWarnings('from a_index | grok', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | grok textField', [
        "SyntaxError: missing QUOTED_STRING at '<EOF>'",
      ]);
      testErrorsAndWarnings('from a_index | grok textField 2', [
        "SyntaxError: mismatched input '2' expecting QUOTED_STRING",
      ]);
      testErrorsAndWarnings('from a_index | grok textField .', [
        "SyntaxError: mismatched input '<EOF>' expecting {UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
        'Unknown column [textField.]',
      ]);
      testErrorsAndWarnings('from a_index | grok textField %a', [
        "SyntaxError: mismatched input '%' expecting QUOTED_STRING",
      ]);
      // @TODO: investigate
      // Do not try to validate the grok pattern string
      testErrorsAndWarnings('from a_index | grok textField "%{firstWord}"', []);
      testErrorsAndWarnings('from a_index | grok doubleField "%{firstWord}"', [
        'GROK only supports string type values, found [doubleField] of type [double]',
      ]);
      testErrorsAndWarnings('from a_index | grok textField "%{firstWord}" | keep firstWord', []);
      // testErrorsAndWarnings('from a_index | grok s* "%{a}"', [
      //   'Using wildcards (*) in grok is not allowed [s*]',
      // ]);
    });

    describe('where', () => {
      testErrorsAndWarnings('from a_index | where b', ['Unknown column [b]']);
      for (const cond of ['true', 'false']) {
        testErrorsAndWarnings(`from a_index | where ${cond}`, []);
        testErrorsAndWarnings(`from a_index | where NOT ${cond}`, []);
      }
      for (const nValue of ['1', '+1', '1 * 1', '-1', '1 / 1', '1.0', '1.5']) {
        testErrorsAndWarnings(`from a_index | where ${nValue} > 0`, []);
        testErrorsAndWarnings(`from a_index | where NOT ${nValue} > 0`, []);
      }
      for (const op of ['>', '>=', '<', '<=', '==', '!=']) {
        testErrorsAndWarnings(`from a_index | where doubleField ${op} 0`, []);
        testErrorsAndWarnings(`from a_index | where NOT doubleField ${op} 0`, []);
        testErrorsAndWarnings(`from a_index | where (doubleField ${op} 0)`, []);
        testErrorsAndWarnings(`from a_index | where (NOT (doubleField ${op} 0))`, []);
        testErrorsAndWarnings(`from a_index | where 1 ${op} 0`, []);

        for (const type of ['text', 'double', 'date', 'boolean', 'ip']) {
          testErrorsAndWarnings(
            `from a_index | where ${type}Field ${op} ${type}Field`,
            type !== 'boolean' || ['==', '!='].includes(op)
              ? []
              : [
                  `Argument of [${op}] must be [date], found value [${type}Field] type [${type}]`,
                  `Argument of [${op}] must be [date], found value [${type}Field] type [${type}]`,
                ]
          );
        }
      }

      for (const nesting of NESTED_DEPTHS) {
        for (const evenOp of ['-', '+']) {
          for (const oddOp of ['-', '+']) {
            // This builds a combination of +/- operators
            // i.e. ---- something, -+-+ something, +-+- something, etc...
            const unaryCombination = Array(nesting)
              .fill('- ')
              .map((_, i) => (i % 2 ? oddOp : evenOp))
              .join('');
            testErrorsAndWarnings(`from a_index | where ${unaryCombination} doubleField > 0`, []);
            testErrorsAndWarnings(
              `from a_index | where ${unaryCombination} round(doubleField) > 0`,
              []
            );
            testErrorsAndWarnings(
              `from a_index | where 1 + ${unaryCombination} doubleField > 0`,
              []
            );
            // still valid
            testErrorsAndWarnings(`from a_index | where 1 ${unaryCombination} doubleField > 0`, []);
          }
        }
        testErrorsAndWarnings(
          `from a_index | where ${Array(nesting).fill('not ').join('')} booleanField`,
          []
        );
      }
      for (const wrongOp of ['*', '/', '%']) {
        testErrorsAndWarnings(`from a_index | where ${wrongOp}+ doubleField`, [
          `SyntaxError: extraneous input '${wrongOp}' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}`,
        ]);
      }

      // Skip these tests until the insensitive case equality gets restored back
      testErrorsAndWarnings.skip(`from a_index | where doubleField =~ 0`, [
        'Argument of [=~] must be [text], found value [doubleField] type [double]',
        'Argument of [=~] must be [text], found value [0] type [number]',
      ]);
      testErrorsAndWarnings.skip(`from a_index | where NOT doubleField =~ 0`, [
        'Argument of [=~] must be [text], found value [doubleField] type [double]',
        'Argument of [=~] must be [text], found value [0] type [number]',
      ]);
      testErrorsAndWarnings.skip(`from a_index | where (doubleField =~ 0)`, [
        'Argument of [=~] must be [text], found value [doubleField] type [double]',
        'Argument of [=~] must be [text], found value [0] type [number]',
      ]);
      testErrorsAndWarnings.skip(`from a_index | where (NOT (doubleField =~ 0))`, [
        'Argument of [=~] must be [text], found value [doubleField] type [double]',
        'Argument of [=~] must be [text], found value [0] type [number]',
      ]);
      testErrorsAndWarnings.skip(`from a_index | where 1 =~ 0`, [
        'Argument of [=~] must be [text], found value [1] type [number]',
        'Argument of [=~] must be [text], found value [0] type [number]',
      ]);
      testErrorsAndWarnings.skip(`from a_index | eval textField =~ 0`, [
        `Argument of [=~] must be [text], found value [0] type [number]`,
      ]);

      for (const op of ['like', 'rlike']) {
        testErrorsAndWarnings(`from a_index | where textField ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | where textField NOT ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | where NOT textField ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | where NOT textField NOT ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | where doubleField ${op} "?a"`, [
          `Argument of [${op}] must be [text], found value [doubleField] type [double]`,
        ]);
        testErrorsAndWarnings(`from a_index | where doubleField NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [text], found value [doubleField] type [double]`,
        ]);
        testErrorsAndWarnings(`from a_index | where NOT doubleField ${op} "?a"`, [
          `Argument of [${op}] must be [text], found value [doubleField] type [double]`,
        ]);
        testErrorsAndWarnings(`from a_index | where NOT doubleField NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [text], found value [doubleField] type [double]`,
        ]);
      }

      testErrorsAndWarnings(`from a_index | where cidr_match(ipField)`, [
        `Error: [cidr_match] function expects at least 2 arguments, got 1.`,
      ]);
      testErrorsAndWarnings(
        `from a_index | eval cidr = "172.0.0.1/30" | where cidr_match(ipField, "172.0.0.1/30", cidr)`,
        []
      );

      for (const field of fieldTypes) {
        testErrorsAndWarnings(`from a_index | where ${fieldNameFromType(field)} IS NULL`, []);
        testErrorsAndWarnings(`from a_index | where ${fieldNameFromType(field)} IS null`, []);
        testErrorsAndWarnings(`from a_index | where ${fieldNameFromType(field)} is null`, []);
        testErrorsAndWarnings(`from a_index | where ${fieldNameFromType(field)} is NULL`, []);
        testErrorsAndWarnings(`from a_index | where ${fieldNameFromType(field)} IS NOT NULL`, []);
        testErrorsAndWarnings(`from a_index | where ${fieldNameFromType(field)} IS NOT null`, []);
        testErrorsAndWarnings(`from a_index | where ${fieldNameFromType(field)} IS not NULL`, []);
        testErrorsAndWarnings(`from a_index | where ${fieldNameFromType(field)} Is nOt NuLL`, []);
      }

      // this is a scenario that was failing because "or" didn't accept "null"
      testErrorsAndWarnings('from a_index | where textField == "a" or null', []);
    });

    describe('eval', () => {
      testErrorsAndWarnings('from a_index | eval ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | eval textField ', []);
      testErrorsAndWarnings('from a_index | eval b = textField', []);
      testErrorsAndWarnings('from a_index | eval doubleField + 1', []);
      testErrorsAndWarnings('from a_index | eval doubleField + ', [
        "SyntaxError: no viable alternative at input 'doubleField + '",
      ]);
      testErrorsAndWarnings('from a_index | eval textField + 1', [
        'Argument of [+] must be [double], found value [textField] type [text]',
      ]);
      testErrorsAndWarnings('from a_index | eval a=b', ['Unknown column [b]']);
      testErrorsAndWarnings('from a_index | eval a=b, ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
        'Unknown column [b]',
      ]);
      testErrorsAndWarnings('from a_index | eval a=round', ['Unknown column [round]']);
      testErrorsAndWarnings('from a_index | eval a=round(', [
        "SyntaxError: no viable alternative at input 'round('",
      ]);
      testErrorsAndWarnings('from a_index | eval a=round(doubleField) ', []);
      testErrorsAndWarnings('from a_index | eval a=round(doubleField), ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | eval a=round(doubleField) + round(doubleField) ', []);
      testErrorsAndWarnings('from a_index | eval a=round(doubleField) + round(textField) ', [
        'Argument of [round] must be [double], found value [textField] type [text]',
      ]);
      testErrorsAndWarnings(
        'from a_index | eval a=round(doubleField) + round(textField), doubleField  ',
        ['Argument of [round] must be [double], found value [textField] type [text]']
      );
      testErrorsAndWarnings(
        'from a_index | eval a=round(doubleField) + round(doubleField), doubleField  ',
        []
      );
      testErrorsAndWarnings(
        'from a_index | eval a=round(doubleField) + round(doubleField), b = doubleField  ',
        []
      );

      testErrorsAndWarnings('from a_index | eval a=[1, 2, 3]', []);
      testErrorsAndWarnings('from a_index | eval a=[true, false]', []);
      testErrorsAndWarnings('from a_index | eval a=["a", "b"]', []);
      testErrorsAndWarnings('from a_index | eval a=null', []);

      for (const field of fieldTypes) {
        testErrorsAndWarnings(`from a_index | eval ${fieldNameFromType(field)} IS NULL`, []);
        testErrorsAndWarnings(`from a_index | eval ${fieldNameFromType(field)} IS null`, []);
        testErrorsAndWarnings(`from a_index | eval ${fieldNameFromType(field)} is null`, []);
        testErrorsAndWarnings(`from a_index | eval ${fieldNameFromType(field)} is NULL`, []);
        testErrorsAndWarnings(`from a_index | eval ${fieldNameFromType(field)} IS NOT NULL`, []);
        testErrorsAndWarnings(`from a_index | eval ${fieldNameFromType(field)} IS NOT null`, []);
        testErrorsAndWarnings(`from a_index | eval ${fieldNameFromType(field)} IS not NULL`, []);
      }

      for (const nesting of NESTED_DEPTHS) {
        for (const evenOp of ['-', '+']) {
          for (const oddOp of ['-', '+']) {
            // This builds a combination of +/- operators
            // i.e. ---- something, -+-+ something, +-+- something, etc...
            const unaryCombination = Array(nesting)
              .fill('- ')
              .map((_, i) => (i % 2 ? oddOp : evenOp))
              .join('');
            testErrorsAndWarnings(`from a_index | eval ${unaryCombination} doubleField`, []);
            testErrorsAndWarnings(`from a_index | eval a=${unaryCombination} doubleField`, []);
            testErrorsAndWarnings(
              `from a_index | eval a=${unaryCombination} round(doubleField)`,
              []
            );
            testErrorsAndWarnings(`from a_index | eval 1 + ${unaryCombination} doubleField`, []);
            // still valid
            testErrorsAndWarnings(`from a_index | eval 1 ${unaryCombination} doubleField`, []);
          }
        }

        testErrorsAndWarnings(
          `from a_index | eval ${Array(nesting).fill('not ').join('')} booleanField`,
          []
        );
      }

      for (const wrongOp of ['*', '/', '%']) {
        testErrorsAndWarnings(`from a_index | eval ${wrongOp}+ doubleField`, [
          `SyntaxError: extraneous input '${wrongOp}' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}`,
        ]);
      }
      testErrorsAndWarnings(
        'from a_index | eval log10(-1)',
        [],
        ['Log of a negative number results in null: -1']
      );
      testErrorsAndWarnings(
        'from a_index | eval log(-1)',
        [],
        ['Log of a negative number results in null: -1']
      );
      testErrorsAndWarnings(
        'from a_index | eval log(-1, 20)',
        [],
        ['Log of a negative number results in null: -1']
      );
      testErrorsAndWarnings(
        'from a_index | eval log(-1, -20)',
        [],
        [
          'Log of a negative number results in null: -1',
          'Log of a negative number results in null: -20',
        ]
      );
      testErrorsAndWarnings(
        'from a_index | eval var0 = log(-1, -20)',
        [],
        [
          'Log of a negative number results in null: -1',
          'Log of a negative number results in null: -20',
        ]
      );
      for (const op of ['>', '>=', '<', '<=', '==', '!=']) {
        testErrorsAndWarnings(`from a_index | eval doubleField ${op} 0`, []);
        testErrorsAndWarnings(`from a_index | eval NOT doubleField ${op} 0`, []);
        testErrorsAndWarnings(`from a_index | eval (doubleField ${op} 0)`, []);
        testErrorsAndWarnings(`from a_index | eval (NOT (doubleField ${op} 0))`, []);
        testErrorsAndWarnings(`from a_index | eval 1 ${op} 0`, []);
        for (const type of ['text', 'double', 'date', 'boolean', 'ip']) {
          if (type === 'boolean') {
            testErrorsAndWarnings(
              `from a_index | eval ${type}Field ${op} ${type}Field`,
              type !== 'boolean' || ['==', '!='].includes(op)
                ? []
                : [
                    `Argument of [${op}] must be [date], found value [${type}Field] type [${type}]`,
                    `Argument of [${op}] must be [date], found value [${type}Field] type [${type}]`,
                  ]
            );
          } else {
            testErrorsAndWarnings(
              `from a_index | eval ${type}Field ${op} ${type}Field`,
              type !== 'boolean' || ['==', '!='].includes(op)
                ? []
                : [
                    `Argument of [${op}] must be [double], found value [${type}Field] type [${type}]`,
                    `Argument of [${op}] must be [double], found value [${type}Field] type [${type}]`,
                  ]
            );
          }
        }
        // Implicit casting of literal values tests
        testErrorsAndWarnings(`from a_index | eval doubleField ${op} textField`, [
          `Argument of [${op}] must be [double], found value [textField] type [text]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval keywordField ${op} doubleField`, [
          `Argument of [${op}] must be [double], found value [keywordField] type [keyword]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval doubleField ${op} "2022"`, [
          `Argument of [${op}] must be [date], found value [doubleField] type [double]`,
        ]);

        testErrorsAndWarnings(`from a_index | eval dateField ${op} keywordField`, [
          `Argument of [${op}] must be [date], found value [keywordField] type [keyword]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval keywordField ${op} dateField`, [
          `Argument of [${op}] must be [date], found value [keywordField] type [keyword]`,
        ]);

        // Check that the implicit cast doesn't apply for fields
        testErrorsAndWarnings(`from a_index | eval textField ${op} 0`, [
          `Argument of [${op}] must be [double], found value [textField] type [text]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval textField ${op} now()`, [
          `Argument of [${op}] must be [date], found value [textField] type [text]`,
        ]);

        testErrorsAndWarnings(`from a_index | eval dateField ${op} "2022"`, []);
        testErrorsAndWarnings(`from a_index | eval "2022" ${op} dateField`, []);

        testErrorsAndWarnings(`from a_index | eval versionField ${op} "1.2.3"`, []);
        testErrorsAndWarnings(`from a_index | eval "1.2.3" ${op} versionField`, []);

        testErrorsAndWarnings(
          `from a_index | eval booleanField ${op} "true"`,
          ['==', '!='].includes(op)
            ? []
            : [`Argument of [${op}] must be [date], found value [booleanField] type [boolean]`]
        );
        testErrorsAndWarnings(
          `from a_index | eval "true" ${op} booleanField`,
          ['==', '!='].includes(op)
            ? []
            : [`Argument of [${op}] must be [date], found value [booleanField] type [boolean]`]
        );

        testErrorsAndWarnings(`from a_index | eval ipField ${op} "136.36.3.205"`, []);
        testErrorsAndWarnings(`from a_index | eval "136.36.3.205" ${op} ipField`, []);
      }

      // casting for IN for version, date, boolean, ip
      testErrorsAndWarnings(
        'from a_index | eval versionField in ("1.2.3", "4.5.6", to_version("2.3.2"))',
        []
      );
      testErrorsAndWarnings(
        'from a_index | eval dateField in ("2023-12-12", "2024-12-12", date_parse("yyyy-MM-dd", "2025-12-12"))',
        []
      );
      testErrorsAndWarnings('from a_index | eval booleanField in ("true", "false", false)', []);
      testErrorsAndWarnings(
        'from a_index | eval ipField in ("136.36.3.205", "136.36.3.206", to_ip("136.36.3.207"))',
        []
      );

      for (const op of ['+', '-', '*', '/', '%']) {
        testErrorsAndWarnings(`from a_index | eval doubleField ${op} 1`, []);
        testErrorsAndWarnings(`from a_index | eval (doubleField ${op} 1)`, []);
        testErrorsAndWarnings(`from a_index | eval 1 ${op} 1`, []);
        testErrorsAndWarnings(
          `from a_index | eval now() ${op} now()`,
          ['+', '-'].includes(op)
            ? [`Argument of [${op}] must be [date_period], found value [now()] type [date]`]
            : [
                `Argument of [${op}] must be [double], found value [now()] type [date]`,
                `Argument of [${op}] must be [double], found value [now()] type [date]`,
              ]
        );

        testErrorsAndWarnings(
          `from a_index | eval 1 ${op} "1"`,
          ['+', '-'].includes(op)
            ? [`Argument of [${op}] must be [date_period], found value [1] type [integer]`]
            : [`Argument of [${op}] must be [double], found value [\"1\"] type [string]`]
        );
        testErrorsAndWarnings(
          `from a_index | eval "1" ${op} 1`,
          ['+', '-'].includes(op)
            ? [`Argument of [${op}] must be [date_period], found value [1] type [integer]`]
            : [`Argument of [${op}] must be [double], found value [\"1\"] type [string]`]
        );
        // TODO: enable when https://github.com/elastic/elasticsearch/issues/108432 is complete
        // testErrorsAndWarnings(`from a_index | eval "2022" ${op} 1 day`, []);
      }
      for (const divideByZeroExpr of ['1/0', 'var = 1/0', '1 + 1/0']) {
        testErrorsAndWarnings(
          `from a_index | eval ${divideByZeroExpr}`,
          [],
          ['Cannot divide by zero: 1/0']
        );
      }
      for (const divideByZeroExpr of ['1%0', 'var = 1%0', '1 + 1%0']) {
        testErrorsAndWarnings(
          `from a_index | eval ${divideByZeroExpr}`,
          [],
          ['Module by zero can return null value: 1%0']
        );
      }
      for (const op of ['like', 'rlike']) {
        testErrorsAndWarnings(`from a_index | eval textField ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | eval textField NOT ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | eval NOT textField ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | eval NOT textField NOT ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | eval doubleField ${op} "?a"`, [
          `Argument of [${op}] must be [text], found value [doubleField] type [double]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval doubleField NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [text], found value [doubleField] type [double]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval NOT doubleField ${op} "?a"`, [
          `Argument of [${op}] must be [text], found value [doubleField] type [double]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval NOT doubleField NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [text], found value [doubleField] type [double]`,
        ]);
      }
      // test lists
      testErrorsAndWarnings('from a_index | eval 1 in (1, 2, 3)', []);
      testErrorsAndWarnings('from a_index | eval doubleField in (1, 2, 3)', []);
      testErrorsAndWarnings('from a_index | eval doubleField not in (1, 2, 3)', []);
      testErrorsAndWarnings('from a_index | eval doubleField not in (1, 2, 3, doubleField)', []);
      testErrorsAndWarnings('from a_index | eval 1 in (1, 2, 3, round(doubleField))', []);
      testErrorsAndWarnings('from a_index | eval "a" in ("a", "b", "c")', []);
      testErrorsAndWarnings('from a_index | eval textField in ("a", "b", "c")', []);
      testErrorsAndWarnings('from a_index | eval textField not in ("a", "b", "c")', []);
      testErrorsAndWarnings('from a_index | eval textField not in ("a", "b", "c", textField)', []);
      testErrorsAndWarnings('from a_index | eval 1 in ("a", "b", "c")', [
        // 'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
      ]);
      testErrorsAndWarnings('from a_index | eval doubleField in ("a", "b", "c")', [
        // 'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
      ]);
      testErrorsAndWarnings('from a_index | eval doubleField not in ("a", "b", "c")', [
        // 'Argument of [not_in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
      ]);
      testErrorsAndWarnings('from a_index | eval doubleField not in (1, 2, 3, textField)', [
        // 'Argument of [not_in] must be [number[]], found value [(1, 2, 3, textField)] type [(number, number, number, string)]',
      ]);

      testErrorsAndWarnings('from a_index | eval avg(doubleField)', [
        'EVAL does not support function avg',
      ]);
      testErrorsAndWarnings(
        'from a_index | stats avg(doubleField) | eval `avg(doubleField)` + 1',
        []
      );
      testErrorsAndWarnings('from a_index | eval not', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
        'Error: [not] function expects exactly one argument, got 0.',
      ]);
      testErrorsAndWarnings('from a_index | eval in', [
        "SyntaxError: mismatched input 'in' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);

      testErrorsAndWarnings('from a_index | eval textField in textField', [
        "SyntaxError: missing '(' at 'textField'",
        "SyntaxError: mismatched input '<EOF>' expecting {',', ')'}",
      ]);

      testErrorsAndWarnings('from a_index | eval textField in textField)', [
        "SyntaxError: missing '(' at 'textField'",
        'Error: [in] function expects exactly 2 arguments, got 1.',
      ]);
      testErrorsAndWarnings('from a_index | eval textField not in textField', [
        "SyntaxError: missing '(' at 'textField'",
        "SyntaxError: mismatched input '<EOF>' expecting {',', ')'}",
      ]);

      testErrorsAndWarnings(
        'from a_index | eval mv_sort(["a", "b"], "bogus")',
        [],
        ['Invalid option ["bogus"] for mv_sort. Supported options: ["asc", "desc"].']
      );

      testErrorsAndWarnings(`from a_index | eval mv_sort(["a", "b"], "ASC")`, []);
      testErrorsAndWarnings(`from a_index | eval mv_sort(["a", "b"], "DESC")`, []);

      testErrorsAndWarnings(`from a_index | eval result = case(false, 0, 1), round(result)`, []);
      testErrorsAndWarnings(
        `from a_index | eval result = case(false, 0, 1) | stats sum(result)`,
        []
      );
      testErrorsAndWarnings(
        `from a_index | eval result = case(false, 0, 1) | stats var0 = sum(result)`,
        []
      );
      testErrorsAndWarnings(`from a_index | eval round(case(false, 0, 1))`, []);

      describe('date math', () => {
        testErrorsAndWarnings('from a_index | eval 1 anno', [
          'EVAL does not support [date_period] in expression [1 anno]',
        ]);
        testErrorsAndWarnings('from a_index | eval var = 1 anno', [
          "Unexpected time interval qualifier: 'anno'",
        ]);
        testErrorsAndWarnings('from a_index | eval now() + 1 anno', [
          "Unexpected time interval qualifier: 'anno'",
        ]);
        for (const unit of timeUnits) {
          testErrorsAndWarnings(`from a_index | eval 1 ${unit}`, [
            `EVAL does not support [date_period] in expression [1 ${unit}]`,
          ]);
          testErrorsAndWarnings(`from a_index | eval 1                ${unit}`, [
            `EVAL does not support [date_period] in expression [1 ${unit}]`,
          ]);

          // this is not possible for now
          // testErrorsAndWarnings(`from a_index | eval var = 1 ${timeLiteral.name}`, [
          //   `Eval does not support [date_period] in expression [1 ${timeLiteral.name}]`,
          // ]);
          testErrorsAndWarnings(`from a_index | eval var = now() - 1 ${unit}`, []);
          testErrorsAndWarnings(`from a_index | eval var = dateField - 1 ${unit}`, []);
          testErrorsAndWarnings(
            `from a_index | eval var = dateField - 1 ${unit.toUpperCase()}`,
            []
          );
          testErrorsAndWarnings(`from a_index | eval var = dateField - 1 ${capitalize(unit)}`, []);
          testErrorsAndWarnings(`from a_index | eval var = dateField + 1 ${unit}`, []);
          testErrorsAndWarnings(`from a_index | eval 1 ${unit} + 1 year`, [
            `Argument of [+] must be [date], found value [1 ${unit}] type [duration]`,
          ]);
          for (const op of ['*', '/', '%']) {
            testErrorsAndWarnings(`from a_index | eval var = now() ${op} 1 ${unit}`, [
              `Argument of [${op}] must be [double], found value [now()] type [date]`,
              `Argument of [${op}] must be [double], found value [1 ${unit}] type [duration]`,
            ]);
          }
        }
      });
    });

    describe('sort', () => {
      testErrorsAndWarnings('from a_index | sort ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | sort "field" ', []);
      testErrorsAndWarnings('from a_index | sort wrongField ', ['Unknown column [wrongField]']);
      testErrorsAndWarnings('from a_index | sort doubleField, ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | sort doubleField, textField', []);
      for (const dir of ['desc', 'asc']) {
        testErrorsAndWarnings(`from a_index | sort "field" ${dir} `, []);
        testErrorsAndWarnings(`from a_index | sort doubleField ${dir} `, []);
        testErrorsAndWarnings(`from a_index | sort doubleField ${dir} nulls `, [
          "SyntaxError: missing {'first', 'last'} at '<EOF>'",
        ]);
        for (const nullDir of ['first', 'last']) {
          testErrorsAndWarnings(`from a_index | sort doubleField ${dir} nulls ${nullDir}`, []);
          testErrorsAndWarnings(`from a_index | sort doubleField ${dir} ${nullDir}`, [
            `SyntaxError: extraneous input '${nullDir}' expecting <EOF>`,
          ]);
        }
      }
      for (const nullDir of ['first', 'last']) {
        testErrorsAndWarnings(`from a_index | sort doubleField nulls ${nullDir}`, []);
        testErrorsAndWarnings(`from a_index | sort doubleField ${nullDir}`, [
          `SyntaxError: extraneous input '${nullDir}' expecting <EOF>`,
        ]);
      }
      testErrorsAndWarnings(`row a = 1 | stats COUNT(*) | sort \`COUNT(*)\``, []);
      testErrorsAndWarnings(`ROW a = 1 | STATS couNt(*) | SORT \`couNt(*)\``, []);

      describe('sorting by expressions', () => {
        // SORT accepts complex expressions
        testErrorsAndWarnings(
          'from a_index | sort abs(doubleField) - to_long(textField) desc nulls first',
          []
        );

        // Expression parts are also validated
        testErrorsAndWarnings('from a_index | sort sin(textField)', [
          'Argument of [sin] must be [double], found value [textField] type [text]',
        ]);

        // Expression parts are also validated
        testErrorsAndWarnings('from a_index | sort doubleField + textField', [
          'Argument of [+] must be [double], found value [textField] type [text]',
        ]);
      });
    });

    describe('enrich', () => {
      testErrorsAndWarnings(`from a_index | enrich`, [
        "SyntaxError: missing ENRICH_POLICY_NAME at '<EOF>'",
      ]);
      testErrorsAndWarnings(`from a_index | enrich _`, ['Unknown policy [_]']);
      testErrorsAndWarnings(`from a_index | enrich _:`, [
        "SyntaxError: token recognition error at: ':'",
        'Unknown policy [_]',
      ]);
      testErrorsAndWarnings(`from a_index | enrich _:policy`, [
        'Unrecognized value [_] for ENRICH, mode needs to be one of [_ANY, _COORDINATOR, _REMOTE]',
      ]);
      testErrorsAndWarnings(`from a_index | enrich :policy`, [
        "SyntaxError: token recognition error at: ':'",
      ]);
      testErrorsAndWarnings(`from a_index | enrich any:`, [
        "SyntaxError: token recognition error at: ':'",
        'Unknown policy [any]',
      ]);
      testErrorsAndWarnings(`from a_index | enrich _any:`, [
        "SyntaxError: token recognition error at: ':'",
        'Unknown policy [_any]',
      ]);
      testErrorsAndWarnings(`from a_index | enrich any:policy`, [
        'Unrecognized value [any] for ENRICH, mode needs to be one of [_ANY, _COORDINATOR, _REMOTE]',
      ]);
      testErrorsAndWarnings(`from a_index | enrich policy `, []);
      testErrorsAndWarnings('from a_index | enrich `this``is fine`', [
        "SyntaxError: extraneous input 'fine`' expecting <EOF>",
        'Unknown policy [`this``is]',
      ]);
      testErrorsAndWarnings('from a_index | enrich this is fine', [
        "SyntaxError: mismatched input 'is' expecting <EOF>",
        'Unknown policy [this]',
      ]);
      for (const value of ['any', 'coordinator', 'remote']) {
        testErrorsAndWarnings(`from a_index | enrich _${value}:policy `, []);
        testErrorsAndWarnings(`from a_index | enrich _${value} :  policy `, [
          "SyntaxError: token recognition error at: ':'",
          "SyntaxError: extraneous input 'policy' expecting <EOF>",
          `Unknown policy [_${value}]`,
        ]);
        testErrorsAndWarnings(`from a_index | enrich _${value}:  policy `, [
          "SyntaxError: token recognition error at: ':'",
          "SyntaxError: extraneous input 'policy' expecting <EOF>",
          `Unknown policy [_${value}]`,
        ]);
        testErrorsAndWarnings(`from a_index | enrich _${camelCase(value)}:policy `, []);
        testErrorsAndWarnings(`from a_index | enrich _${value.toUpperCase()}:policy `, []);
      }

      testErrorsAndWarnings(`from a_index | enrich _unknown:policy`, [
        'Unrecognized value [_unknown] for ENRICH, mode needs to be one of [_ANY, _COORDINATOR, _REMOTE]',
      ]);
      testErrorsAndWarnings(`from a_index |enrich missing-policy `, [
        'Unknown policy [missing-policy]',
      ]);
      testErrorsAndWarnings(`from a_index |enrich policy on `, [
        "SyntaxError: missing ID_PATTERN at '<EOF>'",
      ]);
      testErrorsAndWarnings(`from a_index | enrich policy on b `, ['Unknown column [b]']);

      testErrorsAndWarnings('from a_index | enrich policy on `this``is fine`', [
        'Unknown column [this`is fine]',
      ]);
      testErrorsAndWarnings('from a_index | enrich policy on this is fine', [
        "SyntaxError: mismatched input 'is' expecting <EOF>",
        'Unknown column [this]',
      ]);
      testErrorsAndWarnings(`from a_index | enrich policy on textField with `, [
        "SyntaxError: mismatched input '<EOF>' expecting ID_PATTERN",
      ]);
      testErrorsAndWarnings(`from a_index | enrich policy on textField with var0 `, [
        'Unknown column [var0]',
      ]);
      testErrorsAndWarnings(`from a_index |enrich policy on doubleField with var0 = `, [
        "SyntaxError: missing ID_PATTERN at '<EOF>'",
        'Unknown column [var0]',
      ]);
      testErrorsAndWarnings(`from a_index | enrich policy on textField with var0 = c `, [
        'Unknown column [var0]',
        `Unknown column [c]`,
      ]);
      // need to re-enable once the fields/variables become location aware
      // testErrorsAndWarnings(`from a_index | enrich policy on textField with var0 = textField `, [
      //   `Unknown column [textField]`,
      // ]);
      testErrorsAndWarnings(`from a_index |enrich policy on doubleField with var0 = , `, [
        "SyntaxError: missing ID_PATTERN at ','",
        "SyntaxError: mismatched input '<EOF>' expecting ID_PATTERN",
        'Unknown column [var0]',
      ]);
      testErrorsAndWarnings(
        `from a_index | enrich policy on textField with var0 = otherField, var1 `,
        ['Unknown column [var1]']
      );
      testErrorsAndWarnings(
        `from a_index | enrich policy on textField with var0 = otherField `,
        []
      );
      testErrorsAndWarnings(
        `from a_index | enrich policy on textField with var0 = otherField, yetAnotherField `,
        []
      );
      testErrorsAndWarnings(
        `from a_index |enrich policy on doubleField with var0 = otherField, var1 = `,
        ["SyntaxError: missing ID_PATTERN at '<EOF>'", 'Unknown column [var1]']
      );

      testErrorsAndWarnings(
        `from a_index | enrich policy on textField with var0 = otherField, var1 = yetAnotherField`,
        []
      );
      testErrorsAndWarnings(
        'from a_index | enrich policy on textField with var0 = otherField, `this``is fine` = yetAnotherField',
        []
      );
      testErrorsAndWarnings(`from a_index | enrich policy with `, [
        "SyntaxError: mismatched input '<EOF>' expecting ID_PATTERN",
      ]);
      testErrorsAndWarnings(`from a_index | enrich policy with otherField`, []);
      testErrorsAndWarnings(`from a_index | enrich policy | eval otherField`, []);
      testErrorsAndWarnings(`from a_index | enrich policy with var0 = otherField | eval var0`, []);
      testErrorsAndWarnings('from a_index | enrich my-pol*', [
        'Using wildcards (*) in ENRICH is not allowed [my-pol*]',
      ]);
    });

    describe('shadowing', () => {
      testErrorsAndWarnings(
        'from a_index | eval textField = 5',
        [],
        ['Column [textField] of type text has been overwritten as new type: integer']
      );
      testErrorsAndWarnings(
        'from a_index | eval doubleField = "5"',
        [],
        ['Column [doubleField] of type double has been overwritten as new type: string']
      );
    });

    describe('quoting and escaping expressions', () => {
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
        const additionalPlusOneswithTicks = Array(nesting)
          .fill(' + 1')
          .reduce((acc, plusOneAppended, i) => {
            // workout how many ticks to add: 2^N-i
            const ticks = getTicks(Math.pow(2, nesting - 1 - i));
            return `${acc}${plusOneAppended}${ticks}`;
          }, '');
        const ret = `${openingTicks}${expr}${firstClosingBatch}${additionalPlusOneswithTicks}`;
        return ret;
      }

      for (const nesting of NESTED_DEPTHS) {
        // start with a quotable expression
        const expr = 'round(doubleField) + 1';
        const startingQuery = `from a_index | eval ${expr}`;
        // now pipe for each nesting level a new eval command that appends a +1 to the previous quoted expression
        const finalQuery = `${startingQuery} | ${Array(nesting)
          .fill('')
          .map((_, i) => {
            return `eval ${buildNestedExpression(expr, i)} + 1`;
          })
          .join(' | ')} | keep ${buildNestedExpression(expr, nesting)}`;
        testErrorsAndWarnings(finalQuery, []);
      }
    });

    describe('callbacks', () => {
      it(`should not fetch source and fields list when a row command is set`, async () => {
        const callbackMocks = getCallbackMocks();
        await validateQuery(`row a = 1 | eval a`, getAstAndSyntaxErrors, undefined, callbackMocks);
        expect(callbackMocks.getFieldsFor).not.toHaveBeenCalled();
        expect(callbackMocks.getSources).not.toHaveBeenCalled();
      });

      it(`should not fetch policies if no enrich command is found`, async () => {
        const callbackMocks = getCallbackMocks();
        await validateQuery(`row a = 1 | eval a`, getAstAndSyntaxErrors, undefined, callbackMocks);
        expect(callbackMocks.getPolicies).not.toHaveBeenCalled();
      });

      it(`should not fetch source and fields for empty command`, async () => {
        const callbackMocks = getCallbackMocks();
        await validateQuery(` `, getAstAndSyntaxErrors, undefined, callbackMocks);
        expect(callbackMocks.getFieldsFor).not.toHaveBeenCalled();
        expect(callbackMocks.getSources).not.toHaveBeenCalled();
      });

      it(`should skip initial source and fields call but still call fields for enriched policy`, async () => {
        const callbackMocks = getCallbackMocks();
        await validateQuery(
          `row a = 1 | eval b  = a | enrich policy`,
          getAstAndSyntaxErrors,
          undefined,
          callbackMocks
        );
        expect(callbackMocks.getSources).not.toHaveBeenCalled();
        expect(callbackMocks.getPolicies).toHaveBeenCalled();
        expect(callbackMocks.getFieldsFor).toHaveBeenCalledTimes(1);
        expect(callbackMocks.getFieldsFor).toHaveBeenLastCalledWith({
          query: `from enrich_index | keep otherField, yetAnotherField`,
        });
      });

      it('should call fields callbacks also for show command', async () => {
        const callbackMocks = getCallbackMocks();
        await validateQuery(
          `show info | keep name`,
          getAstAndSyntaxErrors,
          undefined,
          callbackMocks
        );
        expect(callbackMocks.getSources).not.toHaveBeenCalled();
        expect(callbackMocks.getPolicies).not.toHaveBeenCalled();
        expect(callbackMocks.getFieldsFor).toHaveBeenCalledTimes(1);
        expect(callbackMocks.getFieldsFor).toHaveBeenLastCalledWith({
          query: 'show info',
        });
      });

      it(`should fetch additional fields if an enrich command is found`, async () => {
        const callbackMocks = getCallbackMocks();
        await validateQuery(
          `from a_index | eval b  = a | enrich policy`,
          getAstAndSyntaxErrors,
          undefined,
          callbackMocks
        );
        expect(callbackMocks.getSources).toHaveBeenCalled();
        expect(callbackMocks.getPolicies).toHaveBeenCalled();
        expect(callbackMocks.getFieldsFor).toHaveBeenCalledTimes(2);
        expect(callbackMocks.getFieldsFor).toHaveBeenLastCalledWith({
          query: `from enrich_index | keep otherField, yetAnotherField`,
        });
      });

      it(`should not crash if no callbacks are available`, async () => {
        try {
          await validateQuery(
            `from a_index | eval b  = a | enrich policy | dissect textField "%{firstWord}"`,
            getAstAndSyntaxErrors,
            undefined,
            {
              getFieldsFor: undefined,
              getSources: undefined,
              getPolicies: undefined,
            }
          );
        } catch {
          fail('Should not throw');
        }
      });

      it(`should not crash if no callbacks are passed`, async () => {
        try {
          await validateQuery(
            `from a_index | eval b  = a | enrich policy | dissect textField "%{firstWord}"`,
            getAstAndSyntaxErrors
          );
        } catch {
          fail('Should not throw');
        }
      });
    });

    describe('inline casting', () => {
      // accepts casting
      testErrorsAndWarnings('from a_index | eval 1::keyword', []);

      // errors if the cast type is invalid
      // testErrorsAndWarnings('from a_index | eval 1::foo', ['Invalid type [foo] for casting']);

      // accepts casting with multiple types
      testErrorsAndWarnings('from a_index | eval 1::keyword::long::double', []);

      // takes into account casting in function arguments
      testErrorsAndWarnings('from a_index | eval trim("23"::double)', [
        'Argument of [trim] must be [keyword], found value ["23"::double] type [double]',
      ]);
      testErrorsAndWarnings('from a_index | eval trim(23::keyword)', []);
      testErrorsAndWarnings('from a_index | eval 1 + "2"::long', []);
      testErrorsAndWarnings('from a_index | eval 1 + "2"::LONG', []);
      testErrorsAndWarnings('from a_index | eval 1 + "2"::Long', []);
      testErrorsAndWarnings('from a_index | eval 1 + "2"::LoNg', []);

      testErrorsAndWarnings('from a_index | eval 1 + "2"', [
        // just a counter-case to make sure the previous test is meaningful
        'Argument of [+] must be [date_period], found value [1] type [integer]',
      ]);
      testErrorsAndWarnings(
        'from a_index | eval trim(to_double("23")::keyword::double::long::keyword::double)',
        [
          'Argument of [trim] must be [keyword], found value [to_double("23")::keyword::double::long::keyword::double] type [double]',
        ]
      );

      testErrorsAndWarnings('from a_index | eval CEIL(23::long)', []);
      testErrorsAndWarnings('from a_index | eval CEIL(23::unsigned_long)', []);
      testErrorsAndWarnings('from a_index | eval CEIL(23::int)', []);
      testErrorsAndWarnings('from a_index | eval CEIL(23::integer)', []);
      testErrorsAndWarnings('from a_index | eval CEIL(23::Integer)', []);
      testErrorsAndWarnings('from a_index | eval CEIL(23::double)', []);
      testErrorsAndWarnings('from a_index | eval CEIL(23::DOUBLE)', []);
      testErrorsAndWarnings('from a_index | eval CEIL(23::doubla)', [
        'Argument of [ceil] must be [double], found value [23::doubla] type [doubla]',
      ]);

      testErrorsAndWarnings('from a_index | eval TRIM(23::keyword)', []);
      testErrorsAndWarnings('from a_index | eval TRIM(23::text)', []);
      testErrorsAndWarnings('from a_index | eval TRIM(23::keyword)', []);

      testErrorsAndWarnings('from a_index | eval true AND "false"::boolean', []);
      testErrorsAndWarnings('from a_index | eval true AND "false"::bool', []);
      testErrorsAndWarnings('from a_index | eval true AND "false"', [
        // just a counter-case to make sure the previous tests are meaningful
        'Argument of [and] must be [boolean], found value ["false"] type [string]',
      ]);

      // enforces strings for cartesian_point conversion
      // testErrorsAndWarnings('from a_index | eval 23::cartesian_point', ['wrong type!']);

      // still validates nested functions when they are casted
      testErrorsAndWarnings('from a_index | eval to_lower(trim(doubleField)::keyword)', [
        'Argument of [trim] must be [keyword], found value [doubleField] type [double]',
      ]);
      testErrorsAndWarnings(
        'from a_index | eval to_upper(trim(doubleField)::keyword::keyword::keyword::keyword)',
        ['Argument of [trim] must be [keyword], found value [doubleField] type [double]']
      );
      testErrorsAndWarnings(
        'from a_index | eval to_lower(to_upper(trim(doubleField)::keyword)::keyword)',
        ['Argument of [trim] must be [keyword], found value [doubleField] type [double]']
      );
    });

    describe(FUNCTION_DESCRIBE_BLOCK_NAME, () => {
      describe('abs', () => {
        testErrorsAndWarnings('row var = abs(5.5)', []);
        testErrorsAndWarnings('row abs(5.5)', []);
        testErrorsAndWarnings('row var = abs(to_double(true))', []);
        testErrorsAndWarnings('row var = abs(5)', []);
        testErrorsAndWarnings('row abs(5)', []);
        testErrorsAndWarnings('row var = abs(to_integer(true))', []);

        testErrorsAndWarnings('row var = abs(true)', [
          'Argument of [abs] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where abs(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where abs(booleanField) > 0', [
          'Argument of [abs] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where abs(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where abs(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where abs(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = abs(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval abs(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = abs(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval abs(booleanField)', [
          'Argument of [abs] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = abs(*)', [
          'Using wildcards (*) in abs is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = abs(integerField)', []);
        testErrorsAndWarnings('from a_index | eval abs(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = abs(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = abs(longField)', []);
        testErrorsAndWarnings('from a_index | eval abs(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = abs(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval abs(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval abs(doubleField, extraArg)', [
          'Error: [abs] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort abs(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval abs(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval abs(nullVar)', []);
      });

      describe('acos', () => {
        testErrorsAndWarnings('row var = acos(5.5)', []);
        testErrorsAndWarnings('row acos(5.5)', []);
        testErrorsAndWarnings('row var = acos(to_double(true))', []);
        testErrorsAndWarnings('row var = acos(5)', []);
        testErrorsAndWarnings('row acos(5)', []);
        testErrorsAndWarnings('row var = acos(to_integer(true))', []);

        testErrorsAndWarnings('row var = acos(true)', [
          'Argument of [acos] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where acos(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where acos(booleanField) > 0', [
          'Argument of [acos] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where acos(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where acos(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where acos(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = acos(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval acos(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = acos(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval acos(booleanField)', [
          'Argument of [acos] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = acos(*)', [
          'Using wildcards (*) in acos is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = acos(integerField)', []);
        testErrorsAndWarnings('from a_index | eval acos(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = acos(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = acos(longField)', []);
        testErrorsAndWarnings('from a_index | eval acos(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = acos(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval acos(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval acos(doubleField, extraArg)', [
          'Error: [acos] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort acos(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval acos(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval acos(nullVar)', []);
      });

      describe('asin', () => {
        testErrorsAndWarnings('row var = asin(5.5)', []);
        testErrorsAndWarnings('row asin(5.5)', []);
        testErrorsAndWarnings('row var = asin(to_double(true))', []);
        testErrorsAndWarnings('row var = asin(5)', []);
        testErrorsAndWarnings('row asin(5)', []);
        testErrorsAndWarnings('row var = asin(to_integer(true))', []);

        testErrorsAndWarnings('row var = asin(true)', [
          'Argument of [asin] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where asin(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where asin(booleanField) > 0', [
          'Argument of [asin] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where asin(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where asin(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where asin(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = asin(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval asin(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = asin(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval asin(booleanField)', [
          'Argument of [asin] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = asin(*)', [
          'Using wildcards (*) in asin is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = asin(integerField)', []);
        testErrorsAndWarnings('from a_index | eval asin(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = asin(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = asin(longField)', []);
        testErrorsAndWarnings('from a_index | eval asin(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = asin(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval asin(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval asin(doubleField, extraArg)', [
          'Error: [asin] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort asin(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval asin(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval asin(nullVar)', []);
      });

      describe('atan', () => {
        testErrorsAndWarnings('row var = atan(5.5)', []);
        testErrorsAndWarnings('row atan(5.5)', []);
        testErrorsAndWarnings('row var = atan(to_double(true))', []);
        testErrorsAndWarnings('row var = atan(5)', []);
        testErrorsAndWarnings('row atan(5)', []);
        testErrorsAndWarnings('row var = atan(to_integer(true))', []);

        testErrorsAndWarnings('row var = atan(true)', [
          'Argument of [atan] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where atan(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where atan(booleanField) > 0', [
          'Argument of [atan] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where atan(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where atan(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where atan(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = atan(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval atan(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = atan(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval atan(booleanField)', [
          'Argument of [atan] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = atan(*)', [
          'Using wildcards (*) in atan is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = atan(integerField)', []);
        testErrorsAndWarnings('from a_index | eval atan(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = atan(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = atan(longField)', []);
        testErrorsAndWarnings('from a_index | eval atan(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = atan(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval atan(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval atan(doubleField, extraArg)', [
          'Error: [atan] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort atan(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval atan(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval atan(nullVar)', []);
      });

      describe('atan2', () => {
        testErrorsAndWarnings('row var = atan2(5.5, 5.5)', []);
        testErrorsAndWarnings('row atan2(5.5, 5.5)', []);
        testErrorsAndWarnings('row var = atan2(to_double(true), to_double(true))', []);
        testErrorsAndWarnings('row var = atan2(5.5, 5)', []);
        testErrorsAndWarnings('row atan2(5.5, 5)', []);
        testErrorsAndWarnings('row var = atan2(to_double(true), to_integer(true))', []);
        testErrorsAndWarnings('row var = atan2(to_double(true), 5)', []);
        testErrorsAndWarnings('row var = atan2(5, 5.5)', []);
        testErrorsAndWarnings('row atan2(5, 5.5)', []);
        testErrorsAndWarnings('row var = atan2(to_integer(true), to_double(true))', []);
        testErrorsAndWarnings('row var = atan2(5, 5)', []);
        testErrorsAndWarnings('row atan2(5, 5)', []);
        testErrorsAndWarnings('row var = atan2(to_integer(true), to_integer(true))', []);
        testErrorsAndWarnings('row var = atan2(to_integer(true), 5)', []);
        testErrorsAndWarnings('row var = atan2(5, to_double(true))', []);
        testErrorsAndWarnings('row var = atan2(5, to_integer(true))', []);

        testErrorsAndWarnings('row var = atan2(true, true)', [
          'Argument of [atan2] must be [double], found value [true] type [boolean]',
          'Argument of [atan2] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where atan2(doubleField, doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where atan2(booleanField, booleanField) > 0', [
          'Argument of [atan2] must be [double], found value [booleanField] type [boolean]',
          'Argument of [atan2] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where atan2(doubleField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where atan2(doubleField, longField) > 0', []);
        testErrorsAndWarnings('from a_index | where atan2(doubleField, unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | where atan2(integerField, doubleField) > 0', []);
        testErrorsAndWarnings('from a_index | where atan2(integerField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where atan2(integerField, longField) > 0', []);
        testErrorsAndWarnings(
          'from a_index | where atan2(integerField, unsignedLongField) > 0',
          []
        );
        testErrorsAndWarnings('from a_index | where atan2(longField, doubleField) > 0', []);
        testErrorsAndWarnings('from a_index | where atan2(longField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where atan2(longField, longField) > 0', []);
        testErrorsAndWarnings('from a_index | where atan2(longField, unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | where atan2(unsignedLongField, doubleField) > 0', []);
        testErrorsAndWarnings(
          'from a_index | where atan2(unsignedLongField, integerField) > 0',
          []
        );
        testErrorsAndWarnings('from a_index | where atan2(unsignedLongField, longField) > 0', []);
        testErrorsAndWarnings(
          'from a_index | where atan2(unsignedLongField, unsignedLongField) > 0',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = atan2(doubleField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval atan2(doubleField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = atan2(to_double(booleanField), to_double(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval atan2(booleanField, booleanField)', [
          'Argument of [atan2] must be [double], found value [booleanField] type [boolean]',
          'Argument of [atan2] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = atan2(doubleField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval atan2(doubleField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = atan2(to_double(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = atan2(doubleField, longField)', []);
        testErrorsAndWarnings('from a_index | eval atan2(doubleField, longField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = atan2(to_double(booleanField), longField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | eval var = atan2(doubleField, unsignedLongField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval atan2(doubleField, unsignedLongField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = atan2(to_double(booleanField), unsignedLongField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = atan2(integerField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval atan2(integerField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = atan2(to_integer(booleanField), to_double(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = atan2(integerField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval atan2(integerField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = atan2(to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = atan2(integerField, longField)', []);
        testErrorsAndWarnings('from a_index | eval atan2(integerField, longField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = atan2(to_integer(booleanField), longField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | eval var = atan2(integerField, unsignedLongField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval atan2(integerField, unsignedLongField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = atan2(to_integer(booleanField), unsignedLongField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = atan2(longField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval atan2(longField, doubleField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = atan2(longField, to_double(booleanField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = atan2(longField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval atan2(longField, integerField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = atan2(longField, to_integer(booleanField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = atan2(longField, longField)', []);
        testErrorsAndWarnings('from a_index | eval atan2(longField, longField)', []);
        testErrorsAndWarnings('from a_index | eval var = atan2(longField, unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval atan2(longField, unsignedLongField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = atan2(unsignedLongField, doubleField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval atan2(unsignedLongField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = atan2(unsignedLongField, to_double(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = atan2(unsignedLongField, integerField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval atan2(unsignedLongField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = atan2(unsignedLongField, to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = atan2(unsignedLongField, longField)', []);
        testErrorsAndWarnings('from a_index | eval atan2(unsignedLongField, longField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = atan2(unsignedLongField, unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval atan2(unsignedLongField, unsignedLongField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval atan2(doubleField, doubleField, extraArg)', [
          'Error: [atan2] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort atan2(doubleField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval atan2(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval atan2(nullVar, nullVar)', []);
      });

      describe('cbrt', () => {
        testErrorsAndWarnings('row var = cbrt(5.5)', []);
        testErrorsAndWarnings('row cbrt(5.5)', []);
        testErrorsAndWarnings('row var = cbrt(to_double(true))', []);
        testErrorsAndWarnings('row var = cbrt(5)', []);
        testErrorsAndWarnings('row cbrt(5)', []);
        testErrorsAndWarnings('row var = cbrt(to_integer(true))', []);

        testErrorsAndWarnings('row var = cbrt(true)', [
          'Argument of [cbrt] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where cbrt(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where cbrt(booleanField) > 0', [
          'Argument of [cbrt] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where cbrt(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where cbrt(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where cbrt(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = cbrt(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval cbrt(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = cbrt(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval cbrt(booleanField)', [
          'Argument of [cbrt] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = cbrt(*)', [
          'Using wildcards (*) in cbrt is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = cbrt(integerField)', []);
        testErrorsAndWarnings('from a_index | eval cbrt(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = cbrt(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = cbrt(longField)', []);
        testErrorsAndWarnings('from a_index | eval cbrt(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = cbrt(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval cbrt(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval cbrt(doubleField, extraArg)', [
          'Error: [cbrt] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort cbrt(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval cbrt(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval cbrt(nullVar)', []);
      });

      describe('ceil', () => {
        testErrorsAndWarnings('row var = ceil(5.5)', []);
        testErrorsAndWarnings('row ceil(5.5)', []);
        testErrorsAndWarnings('row var = ceil(to_double(true))', []);
        testErrorsAndWarnings('row var = ceil(5)', []);
        testErrorsAndWarnings('row ceil(5)', []);
        testErrorsAndWarnings('row var = ceil(to_integer(true))', []);

        testErrorsAndWarnings('row var = ceil(true)', [
          'Argument of [ceil] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where ceil(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where ceil(booleanField) > 0', [
          'Argument of [ceil] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where ceil(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where ceil(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where ceil(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = ceil(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval ceil(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = ceil(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval ceil(booleanField)', [
          'Argument of [ceil] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = ceil(*)', [
          'Using wildcards (*) in ceil is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = ceil(integerField)', []);
        testErrorsAndWarnings('from a_index | eval ceil(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = ceil(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = ceil(longField)', []);
        testErrorsAndWarnings('from a_index | eval ceil(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = ceil(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval ceil(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval ceil(doubleField, extraArg)', [
          'Error: [ceil] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort ceil(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval ceil(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval ceil(nullVar)', []);
      });

      describe('cidr_match', () => {
        testErrorsAndWarnings('row var = cidr_match(to_ip("127.0.0.1"), "a")', []);
        testErrorsAndWarnings('row cidr_match(to_ip("127.0.0.1"), "a")', []);
        testErrorsAndWarnings(
          'row var = cidr_match(to_ip(to_ip("127.0.0.1")), to_string(true))',
          []
        );

        testErrorsAndWarnings('row var = cidr_match(true, true)', [
          'Argument of [cidr_match] must be [ip], found value [true] type [boolean]',
          'Argument of [cidr_match] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = cidr_match(ipField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval cidr_match(ipField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = cidr_match(to_ip(ipField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval cidr_match(booleanField, booleanField)', [
          'Argument of [cidr_match] must be [ip], found value [booleanField] type [boolean]',
          'Argument of [cidr_match] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = cidr_match(ipField, textField)', []);
        testErrorsAndWarnings('from a_index | eval cidr_match(ipField, textField)', []);
        testErrorsAndWarnings('from a_index | sort cidr_match(ipField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval cidr_match(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval cidr_match(nullVar, nullVar)', []);
      });

      describe('coalesce', () => {
        testErrorsAndWarnings('row var = coalesce(true)', []);
        testErrorsAndWarnings('row coalesce(true)', []);
        testErrorsAndWarnings('row var = coalesce(to_boolean(true))', []);
        testErrorsAndWarnings('row var = coalesce(true, true)', []);
        testErrorsAndWarnings('row coalesce(true, true)', []);
        testErrorsAndWarnings('row var = coalesce(to_boolean(true), to_boolean(true))', []);
        testErrorsAndWarnings('row var = coalesce(cartesianPointField, cartesianPointField)', [
          'Unknown column [cartesianPointField]',
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row coalesce(cartesianPointField, cartesianPointField)', [
          'Unknown column [cartesianPointField]',
          'Unknown column [cartesianPointField]',
        ]);

        testErrorsAndWarnings(
          'row var = coalesce(to_cartesianpoint(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = coalesce(to_cartesianshape("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row coalesce(to_cartesianshape("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = coalesce(to_cartesianshape(cartesianPointField), to_cartesianshape(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = coalesce(to_datetime("2021-01-01T00:00:00Z"), to_datetime("2021-01-01T00:00:00Z"))',
          []
        );

        testErrorsAndWarnings(
          'row coalesce(to_datetime("2021-01-01T00:00:00Z"), to_datetime("2021-01-01T00:00:00Z"))',
          []
        );

        testErrorsAndWarnings(
          'row var = coalesce(to_datetime(to_datetime("2021-01-01T00:00:00Z")), to_datetime(to_datetime("2021-01-01T00:00:00Z")))',
          []
        );

        testErrorsAndWarnings('row var = coalesce(geoPointField, geoPointField)', [
          'Unknown column [geoPointField]',
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row coalesce(geoPointField, geoPointField)', [
          'Unknown column [geoPointField]',
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = coalesce(to_geopoint(geoPointField), to_geopoint(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );

        testErrorsAndWarnings(
          'row var = coalesce(to_geoshape("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row coalesce(to_geoshape("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = coalesce(to_geoshape(geoPointField), to_geoshape(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );
        testErrorsAndWarnings('row var = coalesce(5)', []);
        testErrorsAndWarnings('row coalesce(5)', []);
        testErrorsAndWarnings('row var = coalesce(to_integer(true))', []);
        testErrorsAndWarnings('row var = coalesce(5, 5)', []);
        testErrorsAndWarnings('row coalesce(5, 5)', []);
        testErrorsAndWarnings('row var = coalesce(to_integer(true), to_integer(true))', []);
        testErrorsAndWarnings('row var = coalesce(to_ip("127.0.0.1"), to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row coalesce(to_ip("127.0.0.1"), to_ip("127.0.0.1"))', []);

        testErrorsAndWarnings(
          'row var = coalesce(to_ip(to_ip("127.0.0.1")), to_ip(to_ip("127.0.0.1")))',
          []
        );

        testErrorsAndWarnings('row var = coalesce("a")', []);
        testErrorsAndWarnings('row coalesce("a")', []);
        testErrorsAndWarnings('row var = coalesce(to_string(true))', []);
        testErrorsAndWarnings('row var = coalesce("a", "a")', []);
        testErrorsAndWarnings('row coalesce("a", "a")', []);
        testErrorsAndWarnings('row var = coalesce(to_string(true), to_string(true))', []);
        testErrorsAndWarnings('row var = coalesce(to_version("1.0.0"), to_version("1.0.0"))', []);
        testErrorsAndWarnings('row coalesce(to_version("1.0.0"), to_version("1.0.0"))', []);
        testErrorsAndWarnings('row var = coalesce(to_version("a"), to_version("a"))', []);

        testErrorsAndWarnings('row var = coalesce(5.5, 5.5)', []);

        testErrorsAndWarnings('from a_index | where coalesce(integerField) > 0', []);

        testErrorsAndWarnings('from a_index | where coalesce(counterDoubleField) > 0', [
          'Argument of [coalesce] must be [boolean], found value [counterDoubleField] type [counter_double]',
        ]);

        testErrorsAndWarnings('from a_index | where coalesce(integerField, integerField) > 0', []);

        testErrorsAndWarnings(
          'from a_index | where coalesce(counterDoubleField, counterDoubleField) > 0',
          [
            'Argument of [coalesce] must be [boolean], found value [counterDoubleField] type [counter_double]',
            'Argument of [coalesce] must be [boolean], found value [counterDoubleField] type [counter_double]',
          ]
        );

        testErrorsAndWarnings('from a_index | where coalesce(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where coalesce(longField, longField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = coalesce(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = coalesce(to_boolean(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval coalesce(counterDoubleField)', [
          'Argument of [coalesce] must be [boolean], found value [counterDoubleField] type [counter_double]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = coalesce(booleanField, booleanField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(booleanField, booleanField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = coalesce(to_boolean(booleanField), to_boolean(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval coalesce(counterDoubleField, counterDoubleField)',
          [
            'Argument of [coalesce] must be [boolean], found value [counterDoubleField] type [counter_double]',
            'Argument of [coalesce] must be [boolean], found value [counterDoubleField] type [counter_double]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval var = coalesce(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval coalesce(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = coalesce(to_cartesianpoint(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = coalesce(cartesianShapeField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval coalesce(cartesianShapeField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = coalesce(to_cartesianshape(cartesianPointField), to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = coalesce(dateField, dateField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(dateField, dateField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = coalesce(to_datetime(dateField), to_datetime(dateField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = coalesce(geoPointField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval coalesce(geoPointField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = coalesce(to_geopoint(geoPointField), to_geopoint(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = coalesce(geoShapeField, geoShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval coalesce(geoShapeField, geoShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = coalesce(to_geoshape(geoPointField), to_geoshape(geoPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = coalesce(integerField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = coalesce(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = coalesce(integerField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(integerField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = coalesce(to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = coalesce(ipField, ipField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(ipField, ipField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = coalesce(to_ip(ipField), to_ip(ipField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = coalesce(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = coalesce(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = coalesce(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(keywordField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = coalesce(to_string(booleanField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = coalesce(longField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = coalesce(longField, longField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(longField, longField)', []);
        testErrorsAndWarnings('from a_index | eval var = coalesce(textField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = coalesce(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval var = coalesce(versionField, versionField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(versionField, versionField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = coalesce(to_version(keywordField), to_version(keywordField))',
          []
        );

        testErrorsAndWarnings('from a_index | sort coalesce(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval coalesce(nullVar)', []);
        testErrorsAndWarnings('from a_index | eval coalesce("2022", "2022")', []);

        testErrorsAndWarnings(
          'from a_index | eval coalesce(concat("20", "22"), concat("20", "22"))',
          []
        );

        testErrorsAndWarnings(
          'row var = coalesce(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row coalesce(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = coalesce(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")), to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = coalesce(to_cartesianshape(to_cartesianpoint("POINT (30 10)")), to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = coalesce(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row coalesce(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = coalesce(to_geopoint(to_geopoint("POINT (30 10)")), to_geopoint(to_geopoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = coalesce(to_geoshape(to_geopoint("POINT (30 10)")), to_geoshape(to_geopoint("POINT (30 10)")))',
          []
        );
      });

      describe('concat', () => {
        testErrorsAndWarnings('row var = concat("a", "a")', []);
        testErrorsAndWarnings('row concat("a", "a")', []);
        testErrorsAndWarnings('row var = concat(to_string(true), to_string(true))', []);

        testErrorsAndWarnings('row var = concat(true, true)', [
          'Argument of [concat] must be [keyword], found value [true] type [boolean]',
          'Argument of [concat] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = concat(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval concat(keywordField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = concat(to_string(booleanField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval concat(booleanField, booleanField)', [
          'Argument of [concat] must be [keyword], found value [booleanField] type [boolean]',
          'Argument of [concat] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = concat(keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval concat(keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval var = concat(textField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval concat(textField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = concat(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval concat(textField, textField)', []);
        testErrorsAndWarnings('from a_index | sort concat(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval concat(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval concat(nullVar, nullVar)', []);
      });

      describe('cos', () => {
        testErrorsAndWarnings('row var = cos(5.5)', []);
        testErrorsAndWarnings('row cos(5.5)', []);
        testErrorsAndWarnings('row var = cos(to_double(true))', []);
        testErrorsAndWarnings('row var = cos(5)', []);
        testErrorsAndWarnings('row cos(5)', []);
        testErrorsAndWarnings('row var = cos(to_integer(true))', []);

        testErrorsAndWarnings('row var = cos(true)', [
          'Argument of [cos] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where cos(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where cos(booleanField) > 0', [
          'Argument of [cos] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where cos(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where cos(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where cos(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = cos(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval cos(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = cos(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval cos(booleanField)', [
          'Argument of [cos] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = cos(*)', [
          'Using wildcards (*) in cos is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = cos(integerField)', []);
        testErrorsAndWarnings('from a_index | eval cos(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = cos(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = cos(longField)', []);
        testErrorsAndWarnings('from a_index | eval cos(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = cos(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval cos(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval cos(doubleField, extraArg)', [
          'Error: [cos] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort cos(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval cos(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval cos(nullVar)', []);
      });

      describe('cosh', () => {
        testErrorsAndWarnings('row var = cosh(5.5)', []);
        testErrorsAndWarnings('row cosh(5.5)', []);
        testErrorsAndWarnings('row var = cosh(to_double(true))', []);
        testErrorsAndWarnings('row var = cosh(5)', []);
        testErrorsAndWarnings('row cosh(5)', []);
        testErrorsAndWarnings('row var = cosh(to_integer(true))', []);

        testErrorsAndWarnings('row var = cosh(true)', [
          'Argument of [cosh] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where cosh(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where cosh(booleanField) > 0', [
          'Argument of [cosh] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where cosh(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where cosh(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where cosh(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = cosh(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval cosh(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = cosh(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval cosh(booleanField)', [
          'Argument of [cosh] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = cosh(*)', [
          'Using wildcards (*) in cosh is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = cosh(integerField)', []);
        testErrorsAndWarnings('from a_index | eval cosh(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = cosh(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = cosh(longField)', []);
        testErrorsAndWarnings('from a_index | eval cosh(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = cosh(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval cosh(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval cosh(doubleField, extraArg)', [
          'Error: [cosh] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort cosh(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval cosh(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval cosh(nullVar)', []);
      });

      describe('date_diff', () => {
        testErrorsAndWarnings(
          'from a_index | eval var = date_diff("year", dateField, dateField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval date_diff("year", dateField, dateField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = date_diff("year", to_datetime(dateField), to_datetime(dateField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval date_diff(booleanField, booleanField, booleanField)',
          [
            'Argument of [date_diff] must be [keyword], found value [booleanField] type [boolean]',
            'Argument of [date_diff] must be [date], found value [booleanField] type [boolean]',
            'Argument of [date_diff] must be [date], found value [booleanField] type [boolean]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval var = date_diff(textField, dateField, dateField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval date_diff(textField, dateField, dateField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = date_diff(to_string(booleanField), to_datetime(dateField), to_datetime(dateField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval date_diff("year", dateField, dateField, extraArg)',
          ['Error: [date_diff] function expects exactly 3 arguments, got 4.']
        );

        testErrorsAndWarnings('from a_index | sort date_diff("year", dateField, dateField)', []);

        testErrorsAndWarnings('from a_index | eval date_diff(null, null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval date_diff(nullVar, nullVar, nullVar)', []);
        testErrorsAndWarnings('from a_index | eval date_diff("year", "2022", "2022")', []);

        testErrorsAndWarnings(
          'from a_index | eval date_diff("year", concat("20", "22"), concat("20", "22"))',
          [
            'Argument of [date_diff] must be [date], found value [concat("20","22")] type [keyword]',
            'Argument of [date_diff] must be [date], found value [concat("20","22")] type [keyword]',
          ]
        );

        testErrorsAndWarnings('from a_index | eval date_diff(textField, "2022", "2022")', []);

        testErrorsAndWarnings(
          'from a_index | eval date_diff(textField, concat("20", "22"), concat("20", "22"))',
          [
            'Argument of [date_diff] must be [date], found value [concat("20","22")] type [keyword]',
            'Argument of [date_diff] must be [date], found value [concat("20","22")] type [keyword]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval var = date_diff(to_string(booleanField), dateField, dateField)',
          []
        );
      });

      describe('date_extract', () => {
        testErrorsAndWarnings(
          'row var = date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", to_datetime("2021-01-01T00:00:00Z"))',
          []
        );

        testErrorsAndWarnings(
          'row date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", to_datetime("2021-01-01T00:00:00Z"))',
          []
        );

        testErrorsAndWarnings(
          'row var = date_extract("a", to_datetime("2021-01-01T00:00:00Z"))',
          []
        );
        testErrorsAndWarnings('row date_extract("a", to_datetime("2021-01-01T00:00:00Z"))', []);

        testErrorsAndWarnings('row var = date_extract(true, true)', [
          'Argument of [date_extract] must be [keyword], found value [true] type [boolean]',
          'Argument of [date_extract] must be [date], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", dateField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", dateField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", to_datetime(dateField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval date_extract(booleanField, booleanField)', [
          'Argument of [date_extract] must be [keyword], found value [booleanField] type [boolean]',
          'Argument of [date_extract] must be [date], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = date_extract(textField, dateField)', []);
        testErrorsAndWarnings('from a_index | eval date_extract(textField, dateField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = date_extract(to_string(booleanField), to_datetime(dateField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", dateField, extraArg)',
          ['Error: [date_extract] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | sort date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", dateField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval date_extract(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval date_extract(nullVar, nullVar)', []);

        testErrorsAndWarnings(
          'from a_index | eval date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", "2022")',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", concat("20", "22"))',
          [
            'Argument of [date_extract] must be [date], found value [concat("20","22")] type [keyword]',
          ]
        );

        testErrorsAndWarnings('from a_index | eval date_extract(textField, "2022")', []);
        testErrorsAndWarnings('from a_index | eval date_extract(textField, concat("20", "22"))', [
          'Argument of [date_extract] must be [date], found value [concat("20","22")] type [keyword]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = date_extract(to_string(booleanField), dateField)',
          []
        );
      });

      describe('date_format', () => {
        testErrorsAndWarnings(
          'row var = date_format("a", to_datetime("2021-01-01T00:00:00Z"))',
          []
        );
        testErrorsAndWarnings('row date_format("a", to_datetime("2021-01-01T00:00:00Z"))', []);

        testErrorsAndWarnings('row var = date_format(true, true)', [
          'Argument of [date_format] must be [keyword], found value [true] type [boolean]',
          'Argument of [date_format] must be [date], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = date_format(keywordField, dateField)', []);
        testErrorsAndWarnings('from a_index | eval date_format(keywordField, dateField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = date_format(to_string(booleanField), to_datetime(dateField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval date_format(booleanField, booleanField)', [
          'Argument of [date_format] must be [keyword], found value [booleanField] type [boolean]',
          'Argument of [date_format] must be [date], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = date_format(textField, dateField)', []);
        testErrorsAndWarnings('from a_index | eval date_format(textField, dateField)', []);

        testErrorsAndWarnings(
          'from a_index | eval date_format(keywordField, dateField, extraArg)',
          ['Error: [date_format] function expects no more than 2 arguments, got 3.']
        );

        testErrorsAndWarnings('from a_index | sort date_format(keywordField, dateField)', []);
        testErrorsAndWarnings('from a_index | eval date_format(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval date_format(nullVar, nullVar)', []);
        testErrorsAndWarnings('from a_index | eval date_format(keywordField, "2022")', []);

        testErrorsAndWarnings('from a_index | eval date_format(keywordField, concat("20", "22"))', [
          'Argument of [date_format] must be [date], found value [concat("20","22")] type [keyword]',
        ]);

        testErrorsAndWarnings('from a_index | eval date_format(textField, "2022")', []);
        testErrorsAndWarnings('from a_index | eval date_format(textField, concat("20", "22"))', [
          'Argument of [date_format] must be [date], found value [concat("20","22")] type [keyword]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = date_format(to_string(booleanField), dateField)',
          []
        );
      });

      describe('date_parse', () => {
        testErrorsAndWarnings('row var = date_parse("a", "a")', []);
        testErrorsAndWarnings('row date_parse("a", "a")', []);
        testErrorsAndWarnings('row var = date_parse(to_string(true), to_string(true))', []);

        testErrorsAndWarnings('row var = date_parse(true, true)', [
          'Argument of [date_parse] must be [keyword], found value [true] type [boolean]',
          'Argument of [date_parse] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = date_parse(keywordField, keywordField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval date_parse(keywordField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = date_parse(to_string(booleanField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval date_parse(booleanField, booleanField)', [
          'Argument of [date_parse] must be [keyword], found value [booleanField] type [boolean]',
          'Argument of [date_parse] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = date_parse(keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval date_parse(keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval var = date_parse(textField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval date_parse(textField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = date_parse(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval date_parse(textField, textField)', []);

        testErrorsAndWarnings(
          'from a_index | eval date_parse(keywordField, keywordField, extraArg)',
          ['Error: [date_parse] function expects no more than 2 arguments, got 3.']
        );

        testErrorsAndWarnings('from a_index | sort date_parse(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval date_parse(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval date_parse(nullVar, nullVar)', []);
      });

      describe('date_trunc', () => {
        testErrorsAndWarnings(
          'row var = date_trunc(1 year, to_datetime("2021-01-01T00:00:00Z"))',
          []
        );
        testErrorsAndWarnings('row date_trunc(1 year, to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row var = date_trunc("a", to_datetime("2021-01-01T00:00:00Z"))', [
          'Argument of [date_trunc] must be [time_literal], found value ["a"] type [string]',
        ]);
        testErrorsAndWarnings('row date_trunc("a", to_datetime("2021-01-01T00:00:00Z"))', [
          'Argument of [date_trunc] must be [time_literal], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('row var = date_trunc(true, true)', [
          'Argument of [date_trunc] must be [time_literal], found value [true] type [boolean]',
          'Argument of [date_trunc] must be [date], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = date_trunc(1 year, dateField)', []);
        testErrorsAndWarnings('from a_index | eval date_trunc(1 year, dateField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = date_trunc(1 year, to_datetime(dateField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval date_trunc(booleanField, booleanField)', [
          'Argument of [date_trunc] must be [time_literal], found value [booleanField] type [boolean]',
          'Argument of [date_trunc] must be [date], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = date_trunc(textField, dateField)', [
          'Argument of [date_trunc] must be [time_literal], found value [textField] type [text]',
        ]);
        testErrorsAndWarnings('from a_index | eval date_trunc(textField, dateField)', [
          'Argument of [date_trunc] must be [time_literal], found value [textField] type [text]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = date_trunc(textField, to_datetime(dateField))',
          ['Argument of [date_trunc] must be [time_literal], found value [textField] type [text]']
        );

        testErrorsAndWarnings('from a_index | eval date_trunc(1 year, dateField, extraArg)', [
          'Error: [date_trunc] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort date_trunc(1 year, dateField)', []);
        testErrorsAndWarnings('from a_index | eval date_trunc(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval date_trunc(nullVar, nullVar)', []);
        testErrorsAndWarnings('from a_index | eval date_trunc(1 year, "2022")', []);
        testErrorsAndWarnings('from a_index | eval date_trunc(1 year, concat("20", "22"))', [
          'Argument of [date_trunc] must be [date], found value [concat("20","22")] type [keyword]',
        ]);
        testErrorsAndWarnings('from a_index | eval date_trunc(textField, "2022")', [
          'Argument of [date_trunc] must be [time_literal], found value [textField] type [text]',
        ]);
        testErrorsAndWarnings('from a_index | eval date_trunc(textField, concat("20", "22"))', [
          'Argument of [date_trunc] must be [time_literal], found value [textField] type [text]',
          'Argument of [date_trunc] must be [date], found value [concat("20","22")] type [keyword]',
        ]);
        testErrorsAndWarnings(
          'row var = date_trunc(1 day, to_datetime("2021-01-01T00:00:00Z"))',
          []
        );
        testErrorsAndWarnings('row date_trunc(1 day, to_datetime("2021-01-01T00:00:00Z"))', []);
      });

      describe('e', () => {
        testErrorsAndWarnings('row var = e()', []);
        testErrorsAndWarnings('row e()', []);
        testErrorsAndWarnings('from a_index | where e() > 0', []);
        testErrorsAndWarnings('from a_index | eval var = e()', []);
        testErrorsAndWarnings('from a_index | eval e()', []);

        testErrorsAndWarnings('from a_index | eval e(extraArg)', [
          'Error: [e] function expects exactly 0 arguments, got 1.',
        ]);

        testErrorsAndWarnings('from a_index | sort e()', []);
        testErrorsAndWarnings('row nullVar = null | eval e()', []);
      });

      describe('ends_with', () => {
        testErrorsAndWarnings('row var = ends_with("a", "a")', []);
        testErrorsAndWarnings('row ends_with("a", "a")', []);
        testErrorsAndWarnings('row var = ends_with(to_string(true), to_string(true))', []);

        testErrorsAndWarnings('row var = ends_with(true, true)', [
          'Argument of [ends_with] must be [keyword], found value [true] type [boolean]',
          'Argument of [ends_with] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = ends_with(keywordField, keywordField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval ends_with(keywordField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = ends_with(to_string(booleanField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval ends_with(booleanField, booleanField)', [
          'Argument of [ends_with] must be [keyword], found value [booleanField] type [boolean]',
          'Argument of [ends_with] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = ends_with(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval ends_with(textField, textField)', []);

        testErrorsAndWarnings(
          'from a_index | eval ends_with(keywordField, keywordField, extraArg)',
          ['Error: [ends_with] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings('from a_index | sort ends_with(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval ends_with(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval ends_with(nullVar, nullVar)', []);
        testErrorsAndWarnings('from a_index | eval var = ends_with(keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval ends_with(keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval var = ends_with(textField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval ends_with(textField, keywordField)', []);
      });

      describe('exp', () => {
        testErrorsAndWarnings('row var = exp(5.5)', []);
        testErrorsAndWarnings('row exp(5.5)', []);
        testErrorsAndWarnings('row var = exp(to_double(true))', []);
        testErrorsAndWarnings('row var = exp(5)', []);
        testErrorsAndWarnings('row exp(5)', []);
        testErrorsAndWarnings('row var = exp(to_integer(true))', []);

        testErrorsAndWarnings('row var = exp(true)', [
          'Argument of [exp] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where exp(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where exp(booleanField) > 0', [
          'Argument of [exp] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where exp(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where exp(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where exp(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = exp(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval exp(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = exp(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval exp(booleanField)', [
          'Argument of [exp] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = exp(*)', [
          'Using wildcards (*) in exp is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = exp(integerField)', []);
        testErrorsAndWarnings('from a_index | eval exp(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = exp(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = exp(longField)', []);
        testErrorsAndWarnings('from a_index | eval exp(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = exp(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval exp(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval exp(doubleField, extraArg)', [
          'Error: [exp] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort exp(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval exp(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval exp(nullVar)', []);
      });

      describe('floor', () => {
        testErrorsAndWarnings('row var = floor(5.5)', []);
        testErrorsAndWarnings('row floor(5.5)', []);
        testErrorsAndWarnings('row var = floor(to_double(true))', []);
        testErrorsAndWarnings('row var = floor(5)', []);
        testErrorsAndWarnings('row floor(5)', []);
        testErrorsAndWarnings('row var = floor(to_integer(true))', []);

        testErrorsAndWarnings('row var = floor(true)', [
          'Argument of [floor] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where floor(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where floor(booleanField) > 0', [
          'Argument of [floor] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where floor(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where floor(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where floor(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = floor(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval floor(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = floor(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval floor(booleanField)', [
          'Argument of [floor] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = floor(*)', [
          'Using wildcards (*) in floor is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = floor(integerField)', []);
        testErrorsAndWarnings('from a_index | eval floor(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = floor(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = floor(longField)', []);
        testErrorsAndWarnings('from a_index | eval floor(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = floor(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval floor(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval floor(doubleField, extraArg)', [
          'Error: [floor] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort floor(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval floor(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval floor(nullVar)', []);
      });

      describe('from_base64', () => {
        testErrorsAndWarnings('row var = from_base64("a")', []);
        testErrorsAndWarnings('row from_base64("a")', []);
        testErrorsAndWarnings('row var = from_base64(to_string(true))', []);

        testErrorsAndWarnings('row var = from_base64(true)', [
          'Argument of [from_base64] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = from_base64(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval from_base64(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = from_base64(to_string(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval from_base64(booleanField)', [
          'Argument of [from_base64] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = from_base64(*)', [
          'Using wildcards (*) in from_base64 is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = from_base64(textField)', []);
        testErrorsAndWarnings('from a_index | eval from_base64(textField)', []);

        testErrorsAndWarnings('from a_index | eval from_base64(keywordField, extraArg)', [
          'Error: [from_base64] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort from_base64(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval from_base64(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval from_base64(nullVar)', []);
      });

      describe('greatest', () => {
        testErrorsAndWarnings('row var = greatest(true)', []);
        testErrorsAndWarnings('row greatest(true)', []);
        testErrorsAndWarnings('row var = greatest(to_boolean(true))', []);
        testErrorsAndWarnings('row var = greatest(true, true)', []);
        testErrorsAndWarnings('row greatest(true, true)', []);
        testErrorsAndWarnings('row var = greatest(to_boolean(true), to_boolean(true))', []);
        testErrorsAndWarnings('row var = greatest(5.5, 5.5)', []);
        testErrorsAndWarnings('row greatest(5.5, 5.5)', []);
        testErrorsAndWarnings('row var = greatest(to_double(true), to_double(true))', []);
        testErrorsAndWarnings('row var = greatest(5)', []);
        testErrorsAndWarnings('row greatest(5)', []);
        testErrorsAndWarnings('row var = greatest(to_integer(true))', []);
        testErrorsAndWarnings('row var = greatest(5, 5)', []);
        testErrorsAndWarnings('row greatest(5, 5)', []);
        testErrorsAndWarnings('row var = greatest(to_integer(true), to_integer(true))', []);
        testErrorsAndWarnings('row var = greatest(to_ip("127.0.0.1"), to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row greatest(to_ip("127.0.0.1"), to_ip("127.0.0.1"))', []);

        testErrorsAndWarnings(
          'row var = greatest(to_ip(to_ip("127.0.0.1")), to_ip(to_ip("127.0.0.1")))',
          []
        );

        testErrorsAndWarnings('row var = greatest("a")', []);
        testErrorsAndWarnings('row greatest("a")', []);
        testErrorsAndWarnings('row var = greatest(to_string(true))', []);
        testErrorsAndWarnings('row var = greatest("a", "a")', []);
        testErrorsAndWarnings('row greatest("a", "a")', []);
        testErrorsAndWarnings('row var = greatest(to_string(true), to_string(true))', []);
        testErrorsAndWarnings('row var = greatest(to_version("1.0.0"), to_version("1.0.0"))', []);
        testErrorsAndWarnings('row greatest(to_version("1.0.0"), to_version("1.0.0"))', []);
        testErrorsAndWarnings('row var = greatest(to_version("a"), to_version("a"))', []);

        testErrorsAndWarnings(
          'row var = greatest(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          [
            'Argument of [greatest] must be [boolean], found value [to_cartesianpoint("POINT (30 10)")] type [cartesian_point]',
            'Argument of [greatest] must be [boolean], found value [to_cartesianpoint("POINT (30 10)")] type [cartesian_point]',
          ]
        );

        testErrorsAndWarnings('from a_index | where greatest(doubleField, doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where greatest(integerField) > 0', []);

        testErrorsAndWarnings('from a_index | where greatest(cartesianPointField) > 0', [
          'Argument of [greatest] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | where greatest(integerField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where greatest(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where greatest(longField, longField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = greatest(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = greatest(to_boolean(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval greatest(cartesianPointField)', [
          'Argument of [greatest] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = greatest(booleanField, booleanField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(booleanField, booleanField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = greatest(to_boolean(booleanField), to_boolean(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval greatest(cartesianPointField, cartesianPointField)',
          [
            'Argument of [greatest] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
            'Argument of [greatest] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
          ]
        );

        testErrorsAndWarnings('from a_index | eval var = greatest(doubleField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(doubleField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = greatest(to_double(booleanField), to_double(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = greatest(integerField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = greatest(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = greatest(integerField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(integerField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = greatest(to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = greatest(ipField, ipField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(ipField, ipField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = greatest(to_ip(ipField), to_ip(ipField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = greatest(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = greatest(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = greatest(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(keywordField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = greatest(to_string(booleanField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = greatest(longField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = greatest(longField, longField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(longField, longField)', []);
        testErrorsAndWarnings('from a_index | eval var = greatest(textField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = greatest(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval var = greatest(versionField, versionField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(versionField, versionField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = greatest(to_version(keywordField), to_version(keywordField))',
          []
        );

        testErrorsAndWarnings('from a_index | sort greatest(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval greatest(nullVar)', []);

        testErrorsAndWarnings(
          'from a_index | where greatest(cartesianPointField, cartesianPointField) > 0',
          [
            'Argument of [greatest] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
            'Argument of [greatest] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
          ]
        );
      });

      describe('ip_prefix', () => {
        testErrorsAndWarnings('row var = ip_prefix(to_ip("127.0.0.1"), 5, 5)', []);
        testErrorsAndWarnings('row ip_prefix(to_ip("127.0.0.1"), 5, 5)', []);

        testErrorsAndWarnings(
          'row var = ip_prefix(to_ip(to_ip("127.0.0.1")), to_integer(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings('row var = ip_prefix(true, true, true)', [
          'Argument of [ip_prefix] must be [ip], found value [true] type [boolean]',
          'Argument of [ip_prefix] must be [integer], found value [true] type [boolean]',
          'Argument of [ip_prefix] must be [integer], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = ip_prefix(ipField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval ip_prefix(ipField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = ip_prefix(to_ip(ipField), to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval ip_prefix(booleanField, booleanField, booleanField)',
          [
            'Argument of [ip_prefix] must be [ip], found value [booleanField] type [boolean]',
            'Argument of [ip_prefix] must be [integer], found value [booleanField] type [boolean]',
            'Argument of [ip_prefix] must be [integer], found value [booleanField] type [boolean]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval ip_prefix(ipField, integerField, integerField, extraArg)',
          ['Error: [ip_prefix] function expects exactly 3 arguments, got 4.']
        );

        testErrorsAndWarnings(
          'from a_index | sort ip_prefix(ipField, integerField, integerField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval ip_prefix(null, null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval ip_prefix(nullVar, nullVar, nullVar)', []);
      });

      describe('least', () => {
        testErrorsAndWarnings('row var = least(true)', []);
        testErrorsAndWarnings('row least(true)', []);
        testErrorsAndWarnings('row var = least(to_boolean(true))', []);
        testErrorsAndWarnings('row var = least(true, true)', []);
        testErrorsAndWarnings('row least(true, true)', []);
        testErrorsAndWarnings('row var = least(to_boolean(true), to_boolean(true))', []);
        testErrorsAndWarnings('row var = least(5.5, 5.5)', []);
        testErrorsAndWarnings('row least(5.5, 5.5)', []);
        testErrorsAndWarnings('row var = least(to_double(true), to_double(true))', []);
        testErrorsAndWarnings('row var = least(5)', []);
        testErrorsAndWarnings('row least(5)', []);
        testErrorsAndWarnings('row var = least(to_integer(true))', []);
        testErrorsAndWarnings('row var = least(5, 5)', []);
        testErrorsAndWarnings('row least(5, 5)', []);
        testErrorsAndWarnings('row var = least(to_integer(true), to_integer(true))', []);
        testErrorsAndWarnings('row var = least(to_ip("127.0.0.1"), to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row least(to_ip("127.0.0.1"), to_ip("127.0.0.1"))', []);

        testErrorsAndWarnings(
          'row var = least(to_ip(to_ip("127.0.0.1")), to_ip(to_ip("127.0.0.1")))',
          []
        );

        testErrorsAndWarnings('row var = least("a")', []);
        testErrorsAndWarnings('row least("a")', []);
        testErrorsAndWarnings('row var = least(to_string(true))', []);
        testErrorsAndWarnings('row var = least("a", "a")', []);
        testErrorsAndWarnings('row least("a", "a")', []);
        testErrorsAndWarnings('row var = least(to_string(true), to_string(true))', []);
        testErrorsAndWarnings('row var = least(to_version("1.0.0"), to_version("1.0.0"))', []);
        testErrorsAndWarnings('row least(to_version("1.0.0"), to_version("1.0.0"))', []);
        testErrorsAndWarnings('row var = least(to_version("a"), to_version("a"))', []);

        testErrorsAndWarnings(
          'row var = least(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          [
            'Argument of [least] must be [boolean], found value [to_cartesianpoint("POINT (30 10)")] type [cartesian_point]',
            'Argument of [least] must be [boolean], found value [to_cartesianpoint("POINT (30 10)")] type [cartesian_point]',
          ]
        );

        testErrorsAndWarnings('from a_index | where least(doubleField, doubleField) > 0', []);

        testErrorsAndWarnings(
          'from a_index | where least(cartesianPointField, cartesianPointField) > 0',
          [
            'Argument of [least] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
            'Argument of [least] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
          ]
        );

        testErrorsAndWarnings('from a_index | where least(integerField) > 0', []);

        testErrorsAndWarnings('from a_index | where least(cartesianPointField) > 0', [
          'Argument of [least] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | where least(integerField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where least(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where least(longField, longField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = least(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval least(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = least(to_boolean(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval least(cartesianPointField)', [
          'Argument of [least] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = least(booleanField, booleanField)', []);
        testErrorsAndWarnings('from a_index | eval least(booleanField, booleanField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = least(to_boolean(booleanField), to_boolean(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval least(cartesianPointField, cartesianPointField)',
          [
            'Argument of [least] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
            'Argument of [least] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
          ]
        );

        testErrorsAndWarnings('from a_index | eval var = least(doubleField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval least(doubleField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = least(to_double(booleanField), to_double(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = least(integerField)', []);
        testErrorsAndWarnings('from a_index | eval least(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = least(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = least(integerField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval least(integerField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = least(to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = least(ipField, ipField)', []);
        testErrorsAndWarnings('from a_index | eval least(ipField, ipField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = least(to_ip(ipField), to_ip(ipField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = least(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval least(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = least(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = least(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval least(keywordField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = least(to_string(booleanField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = least(longField)', []);
        testErrorsAndWarnings('from a_index | eval least(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = least(longField, longField)', []);
        testErrorsAndWarnings('from a_index | eval least(longField, longField)', []);
        testErrorsAndWarnings('from a_index | eval var = least(textField)', []);
        testErrorsAndWarnings('from a_index | eval least(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = least(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval least(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval var = least(versionField, versionField)', []);
        testErrorsAndWarnings('from a_index | eval least(versionField, versionField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = least(to_version(keywordField), to_version(keywordField))',
          []
        );

        testErrorsAndWarnings('from a_index | sort least(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval least(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval least(nullVar)', []);
      });

      describe('left', () => {
        testErrorsAndWarnings('row var = left("a", 5)', []);
        testErrorsAndWarnings('row left("a", 5)', []);
        testErrorsAndWarnings('row var = left(to_string(true), to_integer(true))', []);

        testErrorsAndWarnings('row var = left(true, true)', [
          'Argument of [left] must be [keyword], found value [true] type [boolean]',
          'Argument of [left] must be [integer], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = left(keywordField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval left(keywordField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = left(to_string(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval left(booleanField, booleanField)', [
          'Argument of [left] must be [keyword], found value [booleanField] type [boolean]',
          'Argument of [left] must be [integer], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = left(textField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval left(textField, integerField)', []);

        testErrorsAndWarnings('from a_index | eval left(keywordField, integerField, extraArg)', [
          'Error: [left] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort left(keywordField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval left(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval left(nullVar, nullVar)', []);
      });

      describe('length', () => {
        testErrorsAndWarnings('row var = length("a")', []);
        testErrorsAndWarnings('row length("a")', []);
        testErrorsAndWarnings('row var = length(to_string(true))', []);

        testErrorsAndWarnings('row var = length(true)', [
          'Argument of [length] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = length(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval length(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = length(to_string(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval length(booleanField)', [
          'Argument of [length] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = length(*)', [
          'Using wildcards (*) in length is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = length(textField)', []);
        testErrorsAndWarnings('from a_index | eval length(textField)', []);

        testErrorsAndWarnings('from a_index | eval length(keywordField, extraArg)', [
          'Error: [length] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort length(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval length(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval length(nullVar)', []);
      });

      describe('locate', () => {
        testErrorsAndWarnings('row var = locate("a", "a")', []);
        testErrorsAndWarnings('row locate("a", "a")', []);
        testErrorsAndWarnings('row var = locate(to_string(true), to_string(true))', []);
        testErrorsAndWarnings('row var = locate("a", "a", 5)', []);
        testErrorsAndWarnings('row locate("a", "a", 5)', []);
        testErrorsAndWarnings(
          'row var = locate(to_string(true), to_string(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings('row var = locate(true, true, true)', [
          'Argument of [locate] must be [keyword], found value [true] type [boolean]',
          'Argument of [locate] must be [keyword], found value [true] type [boolean]',
          'Argument of [locate] must be [integer], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = locate(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval locate(keywordField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = locate(to_string(booleanField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval locate(booleanField, booleanField)', [
          'Argument of [locate] must be [keyword], found value [booleanField] type [boolean]',
          'Argument of [locate] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = locate(keywordField, keywordField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval locate(keywordField, keywordField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = locate(to_string(booleanField), to_string(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval locate(booleanField, booleanField, booleanField)',
          [
            'Argument of [locate] must be [keyword], found value [booleanField] type [boolean]',
            'Argument of [locate] must be [keyword], found value [booleanField] type [boolean]',
            'Argument of [locate] must be [integer], found value [booleanField] type [boolean]',
          ]
        );

        testErrorsAndWarnings('from a_index | eval var = locate(keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval locate(keywordField, textField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = locate(keywordField, textField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval locate(keywordField, textField, integerField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = locate(textField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval locate(textField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = locate(textField, keywordField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval locate(textField, keywordField, integerField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = locate(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval locate(textField, textField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = locate(textField, textField, integerField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval locate(textField, textField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval locate(keywordField, keywordField, integerField, extraArg)',
          ['Error: [locate] function expects no more than 3 arguments, got 4.']
        );

        testErrorsAndWarnings('from a_index | sort locate(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval locate(null, null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval locate(nullVar, nullVar, nullVar)', []);
      });

      describe('log', () => {
        testErrorsAndWarnings('row var = log(5.5)', []);
        testErrorsAndWarnings('row log(5.5)', []);
        testErrorsAndWarnings('row var = log(to_double(true))', []);
        testErrorsAndWarnings('row var = log(5.5, 5.5)', []);
        testErrorsAndWarnings('row log(5.5, 5.5)', []);
        testErrorsAndWarnings('row var = log(to_double(true), to_double(true))', []);
        testErrorsAndWarnings('row var = log(5.5, 5)', []);
        testErrorsAndWarnings('row log(5.5, 5)', []);
        testErrorsAndWarnings('row var = log(to_double(true), to_integer(true))', []);
        testErrorsAndWarnings('row var = log(to_double(true), 5)', []);
        testErrorsAndWarnings('row var = log(5)', []);
        testErrorsAndWarnings('row log(5)', []);
        testErrorsAndWarnings('row var = log(to_integer(true))', []);
        testErrorsAndWarnings('row var = log(5, 5.5)', []);
        testErrorsAndWarnings('row log(5, 5.5)', []);
        testErrorsAndWarnings('row var = log(to_integer(true), to_double(true))', []);
        testErrorsAndWarnings('row var = log(5, 5)', []);
        testErrorsAndWarnings('row log(5, 5)', []);
        testErrorsAndWarnings('row var = log(to_integer(true), to_integer(true))', []);
        testErrorsAndWarnings('row var = log(to_integer(true), 5)', []);
        testErrorsAndWarnings('row var = log(5, to_double(true))', []);
        testErrorsAndWarnings('row var = log(5, to_integer(true))', []);

        testErrorsAndWarnings('row var = log(true, true)', [
          'Argument of [log] must be [double], found value [true] type [boolean]',
          'Argument of [log] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where log(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where log(booleanField) > 0', [
          'Argument of [log] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where log(doubleField, doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where log(booleanField, booleanField) > 0', [
          'Argument of [log] must be [double], found value [booleanField] type [boolean]',
          'Argument of [log] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where log(doubleField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(doubleField, longField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(doubleField, unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(integerField, doubleField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(integerField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(integerField, longField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(integerField, unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(longField, doubleField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(longField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(longField, longField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(longField, unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(unsignedLongField, doubleField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(unsignedLongField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where log(unsignedLongField, longField) > 0', []);
        testErrorsAndWarnings(
          'from a_index | where log(unsignedLongField, unsignedLongField) > 0',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = log(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval log(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = log(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval log(booleanField)', [
          'Argument of [log] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = log(*)', [
          'Using wildcards (*) in log is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = log(doubleField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval log(doubleField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = log(to_double(booleanField), to_double(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval log(booleanField, booleanField)', [
          'Argument of [log] must be [double], found value [booleanField] type [boolean]',
          'Argument of [log] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = log(doubleField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval log(doubleField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = log(to_double(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = log(doubleField, longField)', []);
        testErrorsAndWarnings('from a_index | eval log(doubleField, longField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = log(to_double(booleanField), longField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = log(doubleField, unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval log(doubleField, unsignedLongField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = log(to_double(booleanField), unsignedLongField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = log(integerField)', []);
        testErrorsAndWarnings('from a_index | eval log(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = log(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = log(integerField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval log(integerField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = log(to_integer(booleanField), to_double(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = log(integerField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval log(integerField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = log(to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = log(integerField, longField)', []);
        testErrorsAndWarnings('from a_index | eval log(integerField, longField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = log(to_integer(booleanField), longField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = log(integerField, unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval log(integerField, unsignedLongField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = log(to_integer(booleanField), unsignedLongField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = log(longField)', []);
        testErrorsAndWarnings('from a_index | eval log(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = log(longField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval log(longField, doubleField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = log(longField, to_double(booleanField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = log(longField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval log(longField, integerField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = log(longField, to_integer(booleanField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = log(longField, longField)', []);
        testErrorsAndWarnings('from a_index | eval log(longField, longField)', []);
        testErrorsAndWarnings('from a_index | eval var = log(longField, unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval log(longField, unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = log(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval log(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = log(unsignedLongField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval log(unsignedLongField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = log(unsignedLongField, to_double(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = log(unsignedLongField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval log(unsignedLongField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = log(unsignedLongField, to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = log(unsignedLongField, longField)', []);
        testErrorsAndWarnings('from a_index | eval log(unsignedLongField, longField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = log(unsignedLongField, unsignedLongField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval log(unsignedLongField, unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval log(doubleField, doubleField, extraArg)', [
          'Error: [log] function expects no more than 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort log(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval log(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval log(nullVar, nullVar)', []);
      });

      describe('log10', () => {
        testErrorsAndWarnings('row var = log10(5.5)', []);
        testErrorsAndWarnings('row log10(5.5)', []);
        testErrorsAndWarnings('row var = log10(to_double(true))', []);
        testErrorsAndWarnings('row var = log10(5)', []);
        testErrorsAndWarnings('row log10(5)', []);
        testErrorsAndWarnings('row var = log10(to_integer(true))', []);

        testErrorsAndWarnings('row var = log10(true)', [
          'Argument of [log10] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where log10(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where log10(booleanField) > 0', [
          'Argument of [log10] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where log10(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where log10(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where log10(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = log10(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval log10(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = log10(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval log10(booleanField)', [
          'Argument of [log10] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = log10(*)', [
          'Using wildcards (*) in log10 is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = log10(integerField)', []);
        testErrorsAndWarnings('from a_index | eval log10(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = log10(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = log10(longField)', []);
        testErrorsAndWarnings('from a_index | eval log10(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = log10(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval log10(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval log10(doubleField, extraArg)', [
          'Error: [log10] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort log10(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval log10(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval log10(nullVar)', []);
      });

      describe('ltrim', () => {
        testErrorsAndWarnings('row var = ltrim("a")', []);
        testErrorsAndWarnings('row ltrim("a")', []);
        testErrorsAndWarnings('row var = ltrim(to_string(true))', []);

        testErrorsAndWarnings('row var = ltrim(true)', [
          'Argument of [ltrim] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = ltrim(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval ltrim(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = ltrim(to_string(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval ltrim(booleanField)', [
          'Argument of [ltrim] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = ltrim(*)', [
          'Using wildcards (*) in ltrim is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = ltrim(textField)', []);
        testErrorsAndWarnings('from a_index | eval ltrim(textField)', []);

        testErrorsAndWarnings('from a_index | eval ltrim(keywordField, extraArg)', [
          'Error: [ltrim] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort ltrim(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval ltrim(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval ltrim(nullVar)', []);
      });

      describe('mv_append', () => {
        testErrorsAndWarnings('row var = mv_append(true, true)', []);
        testErrorsAndWarnings('row mv_append(true, true)', []);
        testErrorsAndWarnings('row var = mv_append(to_boolean(true), to_boolean(true))', []);
        testErrorsAndWarnings('row var = mv_append(cartesianPointField, cartesianPointField)', [
          'Unknown column [cartesianPointField]',
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row mv_append(cartesianPointField, cartesianPointField)', [
          'Unknown column [cartesianPointField]',
          'Unknown column [cartesianPointField]',
        ]);

        testErrorsAndWarnings(
          'row var = mv_append(to_cartesianpoint(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = mv_append(to_cartesianshape("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row mv_append(to_cartesianshape("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_append(to_cartesianshape(cartesianPointField), to_cartesianshape(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = mv_append(to_datetime("2021-01-01T00:00:00Z"), to_datetime("2021-01-01T00:00:00Z"))',
          []
        );

        testErrorsAndWarnings(
          'row mv_append(to_datetime("2021-01-01T00:00:00Z"), to_datetime("2021-01-01T00:00:00Z"))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_append(to_datetime(to_datetime("2021-01-01T00:00:00Z")), to_datetime(to_datetime("2021-01-01T00:00:00Z")))',
          []
        );

        testErrorsAndWarnings('row var = mv_append(5.5, 5.5)', []);

        testErrorsAndWarnings('row mv_append(5.5, 5.5)', []);
        testErrorsAndWarnings('row var = mv_append(to_double(true), to_double(true))', []);
        testErrorsAndWarnings('row var = mv_append(geoPointField, geoPointField)', [
          'Unknown column [geoPointField]',
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row mv_append(geoPointField, geoPointField)', [
          'Unknown column [geoPointField]',
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = mv_append(to_geopoint(geoPointField), to_geopoint(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );

        testErrorsAndWarnings(
          'row var = mv_append(to_geoshape("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row mv_append(to_geoshape("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_append(to_geoshape(geoPointField), to_geoshape(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );
        testErrorsAndWarnings('row var = mv_append(5, 5)', []);
        testErrorsAndWarnings('row mv_append(5, 5)', []);
        testErrorsAndWarnings('row var = mv_append(to_integer(true), to_integer(true))', []);
        testErrorsAndWarnings('row var = mv_append(to_ip("127.0.0.1"), to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row mv_append(to_ip("127.0.0.1"), to_ip("127.0.0.1"))', []);

        testErrorsAndWarnings(
          'row var = mv_append(to_ip(to_ip("127.0.0.1")), to_ip(to_ip("127.0.0.1")))',
          []
        );

        testErrorsAndWarnings('row var = mv_append("a", "a")', []);
        testErrorsAndWarnings('row mv_append("a", "a")', []);
        testErrorsAndWarnings('row var = mv_append(to_string(true), to_string(true))', []);
        testErrorsAndWarnings('row var = mv_append(to_version("1.0.0"), to_version("1.0.0"))', []);
        testErrorsAndWarnings('row mv_append(to_version("1.0.0"), to_version("1.0.0"))', []);
        testErrorsAndWarnings('row var = mv_append(to_version("a"), to_version("a"))', []);
        testErrorsAndWarnings('from a_index | where mv_append(doubleField, doubleField) > 0', []);

        testErrorsAndWarnings(
          'from a_index | where mv_append(counterDoubleField, counterDoubleField) > 0',
          [
            'Argument of [mv_append] must be [boolean], found value [counterDoubleField] type [counter_double]',
            'Argument of [mv_append] must be [boolean], found value [counterDoubleField] type [counter_double]',
          ]
        );

        testErrorsAndWarnings('from a_index | where mv_append(integerField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_append(longField, longField) > 0', []);
        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(booleanField, booleanField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval mv_append(booleanField, booleanField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(to_boolean(booleanField), to_boolean(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_append(counterDoubleField, counterDoubleField)',
          [
            'Argument of [mv_append] must be [boolean], found value [counterDoubleField] type [counter_double]',
            'Argument of [mv_append] must be [boolean], found value [counterDoubleField] type [counter_double]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_append(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(to_cartesianpoint(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(cartesianShapeField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_append(cartesianShapeField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(to_cartesianshape(cartesianPointField), to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = mv_append(dateField, dateField)', []);
        testErrorsAndWarnings('from a_index | eval mv_append(dateField, dateField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(to_datetime(dateField), to_datetime(dateField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = mv_append(doubleField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval mv_append(doubleField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(to_double(booleanField), to_double(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(geoPointField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval mv_append(geoPointField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(to_geopoint(geoPointField), to_geopoint(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(geoShapeField, geoShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval mv_append(geoShapeField, geoShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(to_geoshape(geoPointField), to_geoshape(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(integerField, integerField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval mv_append(integerField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = mv_append(ipField, ipField)', []);
        testErrorsAndWarnings('from a_index | eval mv_append(ipField, ipField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(to_ip(ipField), to_ip(ipField))',
          []
        );
        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(keywordField, keywordField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval mv_append(keywordField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(to_string(booleanField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = mv_append(longField, longField)', []);
        testErrorsAndWarnings('from a_index | eval mv_append(longField, longField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_append(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval mv_append(textField, textField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(versionField, versionField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval mv_append(versionField, versionField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_append(to_version(keywordField), to_version(keywordField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_append(booleanField, booleanField, extraArg)',
          ['Error: [mv_append] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings('from a_index | sort mv_append(booleanField, booleanField)', []);
        testErrorsAndWarnings('from a_index | eval mv_append(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval mv_append(nullVar, nullVar)', []);
        testErrorsAndWarnings('from a_index | eval mv_append("2022", "2022")', []);

        testErrorsAndWarnings(
          'from a_index | eval mv_append(concat("20", "22"), concat("20", "22"))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_append(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row mv_append(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_append(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")), to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_append(to_cartesianshape(to_cartesianpoint("POINT (30 10)")), to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_append(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row mv_append(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_append(to_geopoint(to_geopoint("POINT (30 10)")), to_geopoint(to_geopoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_append(to_geoshape(to_geopoint("POINT (30 10)")), to_geoshape(to_geopoint("POINT (30 10)")))',
          []
        );
      });

      describe('mv_avg', () => {
        testErrorsAndWarnings('row var = mv_avg(5.5)', []);
        testErrorsAndWarnings('row mv_avg(5.5)', []);
        testErrorsAndWarnings('row var = mv_avg(to_double(true))', []);
        testErrorsAndWarnings('row var = mv_avg(5)', []);
        testErrorsAndWarnings('row mv_avg(5)', []);
        testErrorsAndWarnings('row var = mv_avg(to_integer(true))', []);

        testErrorsAndWarnings('row var = mv_avg(true)', [
          'Argument of [mv_avg] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_avg(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where mv_avg(booleanField) > 0', [
          'Argument of [mv_avg] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_avg(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_avg(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_avg(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = mv_avg(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval mv_avg(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_avg(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval mv_avg(booleanField)', [
          'Argument of [mv_avg] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_avg(*)', [
          'Using wildcards (*) in mv_avg is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_avg(integerField)', []);
        testErrorsAndWarnings('from a_index | eval mv_avg(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_avg(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_avg(longField)', []);
        testErrorsAndWarnings('from a_index | eval mv_avg(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_avg(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval mv_avg(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval mv_avg(doubleField, extraArg)', [
          'Error: [mv_avg] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_avg(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval mv_avg(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval mv_avg(nullVar)', []);
      });

      describe('mv_concat', () => {
        testErrorsAndWarnings('row var = mv_concat("a", "a")', []);
        testErrorsAndWarnings('row mv_concat("a", "a")', []);
        testErrorsAndWarnings('row var = mv_concat(to_string(true), to_string(true))', []);

        testErrorsAndWarnings('row var = mv_concat(true, true)', [
          'Argument of [mv_concat] must be [keyword], found value [true] type [boolean]',
          'Argument of [mv_concat] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_concat(keywordField, keywordField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval mv_concat(keywordField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_concat(to_string(booleanField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval mv_concat(booleanField, booleanField)', [
          'Argument of [mv_concat] must be [keyword], found value [booleanField] type [boolean]',
          'Argument of [mv_concat] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_concat(keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval mv_concat(keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_concat(textField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval mv_concat(textField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_concat(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval mv_concat(textField, textField)', []);

        testErrorsAndWarnings(
          'from a_index | eval mv_concat(keywordField, keywordField, extraArg)',
          ['Error: [mv_concat] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings('from a_index | sort mv_concat(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval mv_concat(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval mv_concat(nullVar, nullVar)', []);
      });

      describe('mv_count', () => {
        testErrorsAndWarnings('row var = mv_count(true)', []);
        testErrorsAndWarnings('row mv_count(true)', []);
        testErrorsAndWarnings('row var = mv_count(to_boolean(true))', []);
        testErrorsAndWarnings('row var = mv_count(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row mv_count(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_count(to_cartesianpoint(cartesianPointField))', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_count(to_cartesianshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_count(to_cartesianshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = mv_count(to_cartesianshape(cartesianPointField))', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_count(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row mv_count(to_datetime("2021-01-01T00:00:00Z"))', []);

        testErrorsAndWarnings(
          'row var = mv_count(to_datetime(to_datetime("2021-01-01T00:00:00Z")))',
          []
        );

        testErrorsAndWarnings('row var = mv_count(5.5)', []);

        testErrorsAndWarnings('row mv_count(5.5)', []);
        testErrorsAndWarnings('row var = mv_count(to_double(true))', []);
        testErrorsAndWarnings('row var = mv_count(geoPointField)', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row mv_count(geoPointField)', ['Unknown column [geoPointField]']);
        testErrorsAndWarnings('row var = mv_count(to_geopoint(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_count(to_geoshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_count(to_geoshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = mv_count(to_geoshape(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_count(5)', []);
        testErrorsAndWarnings('row mv_count(5)', []);
        testErrorsAndWarnings('row var = mv_count(to_integer(true))', []);
        testErrorsAndWarnings('row var = mv_count(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row mv_count(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row var = mv_count(to_ip(to_ip("127.0.0.1")))', []);
        testErrorsAndWarnings('row var = mv_count("a")', []);
        testErrorsAndWarnings('row mv_count("a")', []);
        testErrorsAndWarnings('row var = mv_count(to_string(true))', []);
        testErrorsAndWarnings('row var = mv_count(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row mv_count(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row var = mv_count(to_version("a"))', []);
        testErrorsAndWarnings('from a_index | where mv_count(booleanField) > 0', []);

        testErrorsAndWarnings('from a_index | where mv_count(counterDoubleField) > 0', [
          'Argument of [mv_count] must be [boolean], found value [counterDoubleField] type [counter_double]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_count(cartesianPointField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_count(cartesianShapeField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_count(dateField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_count(doubleField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_count(geoPointField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_count(geoShapeField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_count(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_count(ipField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_count(keywordField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_count(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_count(textField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_count(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_count(versionField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(to_boolean(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval mv_count(counterDoubleField)', [
          'Argument of [mv_count] must be [boolean], found value [counterDoubleField] type [counter_double]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_count(*)', [
          'Using wildcards (*) in mv_count is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_count(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(cartesianPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_count(to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = mv_count(cartesianShapeField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(cartesianShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_count(to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = mv_count(dateField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(to_datetime(dateField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(to_double(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(to_geopoint(geoPointField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(geoShapeField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(geoShapeField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(to_geoshape(geoPointField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(integerField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(ipField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(ipField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(to_ip(ipField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(longField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(textField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(versionField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(versionField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(to_version(keywordField))', []);

        testErrorsAndWarnings('from a_index | eval mv_count(booleanField, extraArg)', [
          'Error: [mv_count] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_count(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval mv_count(nullVar)', []);
        testErrorsAndWarnings('from a_index | eval mv_count("2022")', []);
        testErrorsAndWarnings('from a_index | eval mv_count(concat("20", "22"))', []);
        testErrorsAndWarnings('row var = mv_count(to_cartesianpoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_count(to_cartesianpoint("POINT (30 10)"))', []);

        testErrorsAndWarnings(
          'row var = mv_count(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_count(to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings('row var = mv_count(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_count(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = mv_count(to_geopoint(to_geopoint("POINT (30 10)")))', []);
        testErrorsAndWarnings('row var = mv_count(to_geoshape(to_geopoint("POINT (30 10)")))', []);
        testErrorsAndWarnings('from a_index | where mv_count(dateNanosField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(dateNanosField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(dateNanosField)', []);
      });

      describe('mv_dedupe', () => {
        testErrorsAndWarnings('row var = mv_dedupe(true)', []);
        testErrorsAndWarnings('row mv_dedupe(true)', []);
        testErrorsAndWarnings('row var = mv_dedupe(to_boolean(true))', []);
        testErrorsAndWarnings('row var = mv_dedupe(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row mv_dedupe(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_dedupe(to_cartesianpoint(cartesianPointField))', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_dedupe(to_cartesianshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_dedupe(to_cartesianshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = mv_dedupe(to_cartesianshape(cartesianPointField))', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_dedupe(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row mv_dedupe(to_datetime("2021-01-01T00:00:00Z"))', []);

        testErrorsAndWarnings(
          'row var = mv_dedupe(to_datetime(to_datetime("2021-01-01T00:00:00Z")))',
          []
        );

        testErrorsAndWarnings('row var = mv_dedupe(5.5)', []);

        testErrorsAndWarnings('row mv_dedupe(5.5)', []);
        testErrorsAndWarnings('row var = mv_dedupe(to_double(true))', []);
        testErrorsAndWarnings('row var = mv_dedupe(geoPointField)', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row mv_dedupe(geoPointField)', ['Unknown column [geoPointField]']);
        testErrorsAndWarnings('row var = mv_dedupe(to_geopoint(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_dedupe(to_geoshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_dedupe(to_geoshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = mv_dedupe(to_geoshape(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_dedupe(5)', []);
        testErrorsAndWarnings('row mv_dedupe(5)', []);
        testErrorsAndWarnings('row var = mv_dedupe(to_integer(true))', []);
        testErrorsAndWarnings('row var = mv_dedupe(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row mv_dedupe(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row var = mv_dedupe(to_ip(to_ip("127.0.0.1")))', []);
        testErrorsAndWarnings('row var = mv_dedupe("a")', []);
        testErrorsAndWarnings('row mv_dedupe("a")', []);
        testErrorsAndWarnings('row var = mv_dedupe(to_string(true))', []);
        testErrorsAndWarnings('row var = mv_dedupe(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row mv_dedupe(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row var = mv_dedupe(to_version("a"))', []);
        testErrorsAndWarnings('from a_index | where mv_dedupe(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where mv_dedupe(counterDoubleField) > 0', [
          'Argument of [mv_dedupe] must be [boolean], found value [counterDoubleField] type [counter_double]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_dedupe(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_dedupe(longField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(to_boolean(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval mv_dedupe(counterDoubleField)', [
          'Argument of [mv_dedupe] must be [boolean], found value [counterDoubleField] type [counter_double]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(*)', [
          'Using wildcards (*) in mv_dedupe is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(cartesianPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_dedupe(to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(cartesianShapeField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(cartesianShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_dedupe(to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(dateField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(to_datetime(dateField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(to_double(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(geoPointField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = mv_dedupe(to_geopoint(geoPointField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(geoShapeField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(geoShapeField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = mv_dedupe(to_geoshape(geoPointField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(integerField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(ipField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(ipField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(to_ip(ipField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(longField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(textField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(versionField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(versionField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(to_version(keywordField))', []);

        testErrorsAndWarnings('from a_index | eval mv_dedupe(booleanField, extraArg)', [
          'Error: [mv_dedupe] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_dedupe(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval mv_dedupe(nullVar)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe("2022")', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(concat("20", "22"))', []);
        testErrorsAndWarnings('row var = mv_dedupe(to_cartesianpoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_dedupe(to_cartesianpoint("POINT (30 10)"))', []);

        testErrorsAndWarnings(
          'row var = mv_dedupe(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_dedupe(to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings('row var = mv_dedupe(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_dedupe(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = mv_dedupe(to_geopoint(to_geopoint("POINT (30 10)")))', []);
        testErrorsAndWarnings('row var = mv_dedupe(to_geoshape(to_geopoint("POINT (30 10)")))', []);
      });

      describe('mv_first', () => {
        testErrorsAndWarnings('row var = mv_first(true)', []);
        testErrorsAndWarnings('row mv_first(true)', []);
        testErrorsAndWarnings('row var = mv_first(to_boolean(true))', []);
        testErrorsAndWarnings('row var = mv_first(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row mv_first(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_first(to_cartesianpoint(cartesianPointField))', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_first(to_cartesianshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_first(to_cartesianshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = mv_first(to_cartesianshape(cartesianPointField))', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_first(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row mv_first(to_datetime("2021-01-01T00:00:00Z"))', []);

        testErrorsAndWarnings(
          'row var = mv_first(to_datetime(to_datetime("2021-01-01T00:00:00Z")))',
          []
        );

        testErrorsAndWarnings('row var = mv_first(5.5)', []);

        testErrorsAndWarnings('row mv_first(5.5)', []);
        testErrorsAndWarnings('row var = mv_first(to_double(true))', []);
        testErrorsAndWarnings('row var = mv_first(geoPointField)', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row mv_first(geoPointField)', ['Unknown column [geoPointField]']);
        testErrorsAndWarnings('row var = mv_first(to_geopoint(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_first(to_geoshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_first(to_geoshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = mv_first(to_geoshape(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_first(5)', []);
        testErrorsAndWarnings('row mv_first(5)', []);
        testErrorsAndWarnings('row var = mv_first(to_integer(true))', []);
        testErrorsAndWarnings('row var = mv_first(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row mv_first(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row var = mv_first(to_ip(to_ip("127.0.0.1")))', []);
        testErrorsAndWarnings('row var = mv_first("a")', []);
        testErrorsAndWarnings('row mv_first("a")', []);
        testErrorsAndWarnings('row var = mv_first(to_string(true))', []);
        testErrorsAndWarnings('row var = mv_first(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row mv_first(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row var = mv_first(to_version("a"))', []);
        testErrorsAndWarnings('from a_index | where mv_first(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where mv_first(counterDoubleField) > 0', [
          'Argument of [mv_first] must be [boolean], found value [counterDoubleField] type [counter_double]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_first(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_first(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_first(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(to_boolean(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval mv_first(counterDoubleField)', [
          'Argument of [mv_first] must be [boolean], found value [counterDoubleField] type [counter_double]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_first(*)', [
          'Using wildcards (*) in mv_first is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_first(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(cartesianPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_first(to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = mv_first(cartesianShapeField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(cartesianShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_first(to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = mv_first(dateField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(to_datetime(dateField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(to_double(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(to_geopoint(geoPointField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(geoShapeField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(geoShapeField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(to_geoshape(geoPointField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(integerField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(ipField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(ipField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(to_ip(ipField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(longField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(textField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(versionField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(versionField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(to_version(keywordField))', []);

        testErrorsAndWarnings('from a_index | eval mv_first(booleanField, extraArg)', [
          'Error: [mv_first] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_first(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval mv_first(nullVar)', []);
        testErrorsAndWarnings('from a_index | eval mv_first("2022")', []);
        testErrorsAndWarnings('from a_index | eval mv_first(concat("20", "22"))', []);
        testErrorsAndWarnings('row var = mv_first(to_cartesianpoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_first(to_cartesianpoint("POINT (30 10)"))', []);

        testErrorsAndWarnings(
          'row var = mv_first(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_first(to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings('row var = mv_first(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_first(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = mv_first(to_geopoint(to_geopoint("POINT (30 10)")))', []);
        testErrorsAndWarnings('row var = mv_first(to_geoshape(to_geopoint("POINT (30 10)")))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(dateNanosField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(dateNanosField)', []);
      });

      describe('mv_last', () => {
        testErrorsAndWarnings('row var = mv_last(true)', []);
        testErrorsAndWarnings('row mv_last(true)', []);
        testErrorsAndWarnings('row var = mv_last(to_boolean(true))', []);
        testErrorsAndWarnings('row var = mv_last(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row mv_last(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_last(to_cartesianpoint(cartesianPointField))', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_last(to_cartesianshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_last(to_cartesianshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = mv_last(to_cartesianshape(cartesianPointField))', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_last(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row mv_last(to_datetime("2021-01-01T00:00:00Z"))', []);

        testErrorsAndWarnings(
          'row var = mv_last(to_datetime(to_datetime("2021-01-01T00:00:00Z")))',
          []
        );

        testErrorsAndWarnings('row var = mv_last(5.5)', []);

        testErrorsAndWarnings('row mv_last(5.5)', []);
        testErrorsAndWarnings('row var = mv_last(to_double(true))', []);
        testErrorsAndWarnings('row var = mv_last(geoPointField)', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row mv_last(geoPointField)', ['Unknown column [geoPointField]']);
        testErrorsAndWarnings('row var = mv_last(to_geopoint(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_last(to_geoshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_last(to_geoshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = mv_last(to_geoshape(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row var = mv_last(5)', []);
        testErrorsAndWarnings('row mv_last(5)', []);
        testErrorsAndWarnings('row var = mv_last(to_integer(true))', []);
        testErrorsAndWarnings('row var = mv_last(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row mv_last(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row var = mv_last(to_ip(to_ip("127.0.0.1")))', []);
        testErrorsAndWarnings('row var = mv_last("a")', []);
        testErrorsAndWarnings('row mv_last("a")', []);
        testErrorsAndWarnings('row var = mv_last(to_string(true))', []);
        testErrorsAndWarnings('row var = mv_last(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row mv_last(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row var = mv_last(to_version("a"))', []);
        testErrorsAndWarnings('from a_index | where mv_last(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where mv_last(counterDoubleField) > 0', [
          'Argument of [mv_last] must be [boolean], found value [counterDoubleField] type [counter_double]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_last(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_last(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_last(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(to_boolean(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval mv_last(counterDoubleField)', [
          'Argument of [mv_last] must be [boolean], found value [counterDoubleField] type [counter_double]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_last(*)', [
          'Using wildcards (*) in mv_last is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_last(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(cartesianPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_last(to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = mv_last(cartesianShapeField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(cartesianShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_last(to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = mv_last(dateField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(to_datetime(dateField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(to_double(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(to_geopoint(geoPointField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(geoShapeField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(geoShapeField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(to_geoshape(geoPointField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(integerField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(ipField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(ipField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(to_ip(ipField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(longField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(textField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(versionField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(versionField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(to_version(keywordField))', []);

        testErrorsAndWarnings('from a_index | eval mv_last(booleanField, extraArg)', [
          'Error: [mv_last] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_last(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval mv_last(nullVar)', []);
        testErrorsAndWarnings('from a_index | eval mv_last("2022")', []);
        testErrorsAndWarnings('from a_index | eval mv_last(concat("20", "22"))', []);
        testErrorsAndWarnings('row var = mv_last(to_cartesianpoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_last(to_cartesianpoint("POINT (30 10)"))', []);

        testErrorsAndWarnings(
          'row var = mv_last(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_last(to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings('row var = mv_last(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row mv_last(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = mv_last(to_geopoint(to_geopoint("POINT (30 10)")))', []);
        testErrorsAndWarnings('row var = mv_last(to_geoshape(to_geopoint("POINT (30 10)")))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(dateNanosField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(dateNanosField)', []);
      });

      describe('mv_max', () => {
        testErrorsAndWarnings('row var = mv_max(true)', []);
        testErrorsAndWarnings('row mv_max(true)', []);
        testErrorsAndWarnings('row var = mv_max(to_boolean(true))', []);
        testErrorsAndWarnings('row var = mv_max(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row mv_max(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings(
          'row var = mv_max(to_datetime(to_datetime("2021-01-01T00:00:00Z")))',
          []
        );
        testErrorsAndWarnings('row var = mv_max(5.5)', []);
        testErrorsAndWarnings('row mv_max(5.5)', []);
        testErrorsAndWarnings('row var = mv_max(to_double(true))', []);
        testErrorsAndWarnings('row var = mv_max(5)', []);
        testErrorsAndWarnings('row mv_max(5)', []);
        testErrorsAndWarnings('row var = mv_max(to_integer(true))', []);
        testErrorsAndWarnings('row var = mv_max(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row mv_max(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row var = mv_max(to_ip(to_ip("127.0.0.1")))', []);
        testErrorsAndWarnings('row var = mv_max("a")', []);
        testErrorsAndWarnings('row mv_max("a")', []);
        testErrorsAndWarnings('row var = mv_max(to_string(true))', []);
        testErrorsAndWarnings('row var = mv_max(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row mv_max(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row var = mv_max(to_version("a"))', []);

        testErrorsAndWarnings('row var = mv_max(to_cartesianpoint("POINT (30 10)"))', [
          'Argument of [mv_max] must be [boolean], found value [to_cartesianpoint("POINT (30 10)")] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_max(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where mv_max(cartesianPointField) > 0', [
          'Argument of [mv_max] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_max(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_max(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_max(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval mv_max(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(to_boolean(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval mv_max(cartesianPointField)', [
          'Argument of [mv_max] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_max(*)', [
          'Using wildcards (*) in mv_max is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_max(dateField)', []);
        testErrorsAndWarnings('from a_index | eval mv_max(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(to_datetime(dateField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval mv_max(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(to_double(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(integerField)', []);
        testErrorsAndWarnings('from a_index | eval mv_max(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(ipField)', []);
        testErrorsAndWarnings('from a_index | eval mv_max(ipField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(to_ip(ipField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval mv_max(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(longField)', []);
        testErrorsAndWarnings('from a_index | eval mv_max(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(textField)', []);
        testErrorsAndWarnings('from a_index | eval mv_max(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval mv_max(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(versionField)', []);
        testErrorsAndWarnings('from a_index | eval mv_max(versionField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(to_version(keywordField))', []);

        testErrorsAndWarnings('from a_index | eval mv_max(booleanField, extraArg)', [
          'Error: [mv_max] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_max(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval mv_max(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval mv_max(nullVar)', []);
        testErrorsAndWarnings('from a_index | eval mv_max("2022")', []);
        testErrorsAndWarnings('from a_index | eval mv_max(concat("20", "22"))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(dateNanosField)', []);
        testErrorsAndWarnings('from a_index | eval mv_max(dateNanosField)', []);
      });

      describe('mv_median', () => {
        testErrorsAndWarnings('row var = mv_median(5.5)', []);
        testErrorsAndWarnings('row mv_median(5.5)', []);
        testErrorsAndWarnings('row var = mv_median(to_double(true))', []);
        testErrorsAndWarnings('row var = mv_median(5)', []);
        testErrorsAndWarnings('row mv_median(5)', []);
        testErrorsAndWarnings('row var = mv_median(to_integer(true))', []);

        testErrorsAndWarnings('row var = mv_median(true)', [
          'Argument of [mv_median] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_median(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where mv_median(booleanField) > 0', [
          'Argument of [mv_median] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_median(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_median(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_median(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = mv_median(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval mv_median(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_median(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval mv_median(booleanField)', [
          'Argument of [mv_median] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_median(*)', [
          'Using wildcards (*) in mv_median is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_median(integerField)', []);
        testErrorsAndWarnings('from a_index | eval mv_median(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_median(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_median(longField)', []);
        testErrorsAndWarnings('from a_index | eval mv_median(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_median(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval mv_median(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval mv_median(doubleField, extraArg)', [
          'Error: [mv_median] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_median(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval mv_median(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval mv_median(nullVar)', []);
      });

      describe('mv_min', () => {
        testErrorsAndWarnings('row var = mv_min(true)', []);
        testErrorsAndWarnings('row mv_min(true)', []);
        testErrorsAndWarnings('row var = mv_min(to_boolean(true))', []);
        testErrorsAndWarnings('row var = mv_min(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row mv_min(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings(
          'row var = mv_min(to_datetime(to_datetime("2021-01-01T00:00:00Z")))',
          []
        );
        testErrorsAndWarnings('row var = mv_min(5.5)', []);
        testErrorsAndWarnings('row mv_min(5.5)', []);
        testErrorsAndWarnings('row var = mv_min(to_double(true))', []);
        testErrorsAndWarnings('row var = mv_min(5)', []);
        testErrorsAndWarnings('row mv_min(5)', []);
        testErrorsAndWarnings('row var = mv_min(to_integer(true))', []);
        testErrorsAndWarnings('row var = mv_min(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row mv_min(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row var = mv_min(to_ip(to_ip("127.0.0.1")))', []);
        testErrorsAndWarnings('row var = mv_min("a")', []);
        testErrorsAndWarnings('row mv_min("a")', []);
        testErrorsAndWarnings('row var = mv_min(to_string(true))', []);
        testErrorsAndWarnings('row var = mv_min(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row mv_min(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row var = mv_min(to_version("a"))', []);

        testErrorsAndWarnings('row var = mv_min(to_cartesianpoint("POINT (30 10)"))', [
          'Argument of [mv_min] must be [boolean], found value [to_cartesianpoint("POINT (30 10)")] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_min(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where mv_min(cartesianPointField) > 0', [
          'Argument of [mv_min] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_min(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_min(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_min(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval mv_min(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(to_boolean(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval mv_min(cartesianPointField)', [
          'Argument of [mv_min] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_min(*)', [
          'Using wildcards (*) in mv_min is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_min(dateField)', []);
        testErrorsAndWarnings('from a_index | eval mv_min(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(to_datetime(dateField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval mv_min(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(to_double(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(integerField)', []);
        testErrorsAndWarnings('from a_index | eval mv_min(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(ipField)', []);
        testErrorsAndWarnings('from a_index | eval mv_min(ipField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(to_ip(ipField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval mv_min(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(longField)', []);
        testErrorsAndWarnings('from a_index | eval mv_min(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(textField)', []);
        testErrorsAndWarnings('from a_index | eval mv_min(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval mv_min(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(versionField)', []);
        testErrorsAndWarnings('from a_index | eval mv_min(versionField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(to_version(keywordField))', []);

        testErrorsAndWarnings('from a_index | eval mv_min(booleanField, extraArg)', [
          'Error: [mv_min] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_min(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval mv_min(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval mv_min(nullVar)', []);
        testErrorsAndWarnings('from a_index | eval mv_min("2022")', []);
        testErrorsAndWarnings('from a_index | eval mv_min(concat("20", "22"))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(dateNanosField)', []);
        testErrorsAndWarnings('from a_index | eval mv_min(dateNanosField)', []);
      });

      describe('mv_slice', () => {
        testErrorsAndWarnings('row var = mv_slice(true, 5, 5)', []);
        testErrorsAndWarnings('row mv_slice(true, 5, 5)', []);

        testErrorsAndWarnings(
          'row var = mv_slice(to_boolean(true), to_integer(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings('row var = mv_slice(cartesianPointField, 5, 5)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row mv_slice(cartesianPointField, 5, 5)', [
          'Unknown column [cartesianPointField]',
        ]);

        testErrorsAndWarnings(
          'row var = mv_slice(to_cartesianpoint(cartesianPointField), to_integer(true), to_integer(true))',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings('row var = mv_slice(to_cartesianshape("POINT (30 10)"), 5, 5)', []);
        testErrorsAndWarnings('row mv_slice(to_cartesianshape("POINT (30 10)"), 5, 5)', []);

        testErrorsAndWarnings(
          'row var = mv_slice(to_cartesianshape(cartesianPointField), to_integer(true), to_integer(true))',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings('row var = mv_slice(to_datetime("2021-01-01T00:00:00Z"), 5, 5)', []);
        testErrorsAndWarnings('row mv_slice(to_datetime("2021-01-01T00:00:00Z"), 5, 5)', []);

        testErrorsAndWarnings(
          'row var = mv_slice(to_datetime(to_datetime("2021-01-01T00:00:00Z")), to_integer(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings('row var = mv_slice(5.5, 5, 5)', []);
        testErrorsAndWarnings('row mv_slice(5.5, 5, 5)', []);

        testErrorsAndWarnings(
          'row var = mv_slice(to_double(true), to_integer(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings('row var = mv_slice(geoPointField, 5, 5)', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row mv_slice(geoPointField, 5, 5)', [
          'Unknown column [geoPointField]',
        ]);

        testErrorsAndWarnings(
          'row var = mv_slice(to_geopoint(geoPointField), to_integer(true), to_integer(true))',
          ['Unknown column [geoPointField]']
        );

        testErrorsAndWarnings('row var = mv_slice(to_geoshape("POINT (30 10)"), 5, 5)', []);
        testErrorsAndWarnings('row mv_slice(to_geoshape("POINT (30 10)"), 5, 5)', []);

        testErrorsAndWarnings(
          'row var = mv_slice(to_geoshape(geoPointField), to_integer(true), to_integer(true))',
          ['Unknown column [geoPointField]']
        );

        testErrorsAndWarnings('row var = mv_slice(5, 5, 5)', []);
        testErrorsAndWarnings('row mv_slice(5, 5, 5)', []);

        testErrorsAndWarnings(
          'row var = mv_slice(to_integer(true), to_integer(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings('row var = mv_slice(to_ip("127.0.0.1"), 5, 5)', []);
        testErrorsAndWarnings('row mv_slice(to_ip("127.0.0.1"), 5, 5)', []);

        testErrorsAndWarnings(
          'row var = mv_slice(to_ip(to_ip("127.0.0.1")), to_integer(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings('row var = mv_slice("a", 5, 5)', []);
        testErrorsAndWarnings('row mv_slice("a", 5, 5)', []);

        testErrorsAndWarnings(
          'row var = mv_slice(to_string(true), to_integer(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings('row var = mv_slice(5, to_integer(true), to_integer(true))', []);
        testErrorsAndWarnings('row var = mv_slice(to_version("1.0.0"), 5, 5)', []);
        testErrorsAndWarnings('row mv_slice(to_version("1.0.0"), 5, 5)', []);

        testErrorsAndWarnings(
          'row var = mv_slice(to_version("a"), to_integer(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings('row var = mv_slice(5.5, true, true)', [
          'Argument of [mv_slice] must be [integer], found value [true] type [boolean]',
          'Argument of [mv_slice] must be [integer], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | where mv_slice(doubleField, integerField, integerField) > 0',
          []
        );

        testErrorsAndWarnings(
          'from a_index | where mv_slice(counterDoubleField, booleanField, booleanField) > 0',
          [
            'Argument of [mv_slice] must be [boolean], found value [counterDoubleField] type [counter_double]',
            'Argument of [mv_slice] must be [integer], found value [booleanField] type [boolean]',
            'Argument of [mv_slice] must be [integer], found value [booleanField] type [boolean]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | where mv_slice(integerField, integerField, integerField) > 0',
          []
        );

        testErrorsAndWarnings(
          'from a_index | where mv_slice(longField, integerField, integerField) > 0',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(booleanField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(booleanField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(to_boolean(booleanField), to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(counterDoubleField, booleanField, booleanField)',
          [
            'Argument of [mv_slice] must be [boolean], found value [counterDoubleField] type [counter_double]',
            'Argument of [mv_slice] must be [integer], found value [booleanField] type [boolean]',
            'Argument of [mv_slice] must be [integer], found value [booleanField] type [boolean]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(cartesianPointField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(cartesianPointField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(to_cartesianpoint(cartesianPointField), to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(cartesianShapeField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(cartesianShapeField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(to_cartesianshape(cartesianPointField), to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(dateField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(dateField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(to_datetime(dateField), to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(doubleField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(doubleField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(to_double(booleanField), to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(geoPointField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(geoPointField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(to_geopoint(geoPointField), to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(geoShapeField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(geoShapeField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(to_geoshape(geoPointField), to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(integerField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(integerField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(to_integer(booleanField), to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(ipField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(ipField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(to_ip(ipField), to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(keywordField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(keywordField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(to_string(booleanField), to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(longField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(longField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(longField, to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(textField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(textField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(versionField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(versionField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(to_version(keywordField), to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(booleanField, integerField, integerField, extraArg)',
          ['Error: [mv_slice] function expects no more than 3 arguments, got 4.']
        );

        testErrorsAndWarnings(
          'from a_index | sort mv_slice(booleanField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval mv_slice(null, null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval mv_slice(nullVar, nullVar, nullVar)', []);
        testErrorsAndWarnings(
          'from a_index | eval mv_slice("2022", integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(concat("20", "22"), integerField, integerField)',
          []
        );
        testErrorsAndWarnings('row var = mv_slice(to_cartesianpoint("POINT (30 10)"), 5, 5)', []);
        testErrorsAndWarnings('row mv_slice(to_cartesianpoint("POINT (30 10)"), 5, 5)', []);

        testErrorsAndWarnings(
          'row var = mv_slice(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")), to_integer(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_slice(to_cartesianshape(to_cartesianpoint("POINT (30 10)")), to_integer(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_slice(to_datetime("2021-01-01T00:00:00Z"), to_integer(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings('row var = mv_slice(to_geopoint("POINT (30 10)"), 5, 5)', []);
        testErrorsAndWarnings('row mv_slice(to_geopoint("POINT (30 10)"), 5, 5)', []);

        testErrorsAndWarnings(
          'row var = mv_slice(to_geopoint(to_geopoint("POINT (30 10)")), to_integer(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings(
          'row var = mv_slice(to_geoshape(to_geopoint("POINT (30 10)")), to_integer(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(dateField, to_integer(booleanField), to_integer(booleanField))',
          []
        );
      });

      describe('mv_sort', () => {
        testErrorsAndWarnings('row var = mv_sort(true, "asc")', []);
        testErrorsAndWarnings('row mv_sort(true, "asc")', []);
        testErrorsAndWarnings('row var = mv_sort(to_datetime("2021-01-01T00:00:00Z"), "asc")', []);
        testErrorsAndWarnings('row mv_sort(to_datetime("2021-01-01T00:00:00Z"), "asc")', []);
        testErrorsAndWarnings('row var = mv_sort(5.5, "asc")', []);
        testErrorsAndWarnings('row mv_sort(5.5, "asc")', []);
        testErrorsAndWarnings('row var = mv_sort(5, "asc")', []);
        testErrorsAndWarnings('row mv_sort(5, "asc")', []);
        testErrorsAndWarnings('row var = mv_sort(to_ip("127.0.0.1"), "asc")', []);
        testErrorsAndWarnings('row mv_sort(to_ip("127.0.0.1"), "asc")', []);
        testErrorsAndWarnings('row var = mv_sort("a", "asc")', []);
        testErrorsAndWarnings('row mv_sort("a", "asc")', []);
        testErrorsAndWarnings('row var = mv_sort(to_version("1.0.0"), "asc")', []);
        testErrorsAndWarnings('row mv_sort(to_version("1.0.0"), "asc")', []);

        testErrorsAndWarnings('row var = mv_sort(to_cartesianpoint("POINT (30 10)"), true)', [
          'Argument of [mv_sort] must be [boolean], found value [to_cartesianpoint("POINT (30 10)")] type [cartesian_point]',
          'Argument of [mv_sort] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_sort(booleanField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(booleanField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sort(dateField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(dateField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sort(doubleField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(doubleField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sort(integerField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(integerField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sort(ipField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(ipField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sort(keywordField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(keywordField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sort(longField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(longField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sort(textField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(textField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sort(versionField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(versionField, "asc")', []);

        testErrorsAndWarnings('from a_index | eval mv_sort(booleanField, "asc", extraArg)', [
          'Error: [mv_sort] function expects no more than 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_sort(booleanField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval mv_sort(nullVar, nullVar)', []);
        testErrorsAndWarnings('from a_index | eval mv_sort("2022", "asc")', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(concat("20", "22"), "asc")', []);
        testErrorsAndWarnings(
          'row var = mv_sort(5, "a")',
          [],
          ['Invalid option ["a"] for mv_sort. Supported options: ["asc", "desc"].']
        );
        testErrorsAndWarnings(
          'row mv_sort(5, "a")',
          [],
          ['Invalid option ["a"] for mv_sort. Supported options: ["asc", "desc"].']
        );
        testErrorsAndWarnings(
          'row var = mv_sort("a", "a")',
          [],
          ['Invalid option ["a"] for mv_sort. Supported options: ["asc", "desc"].']
        );
        testErrorsAndWarnings(
          'row mv_sort("a", "a")',
          [],
          ['Invalid option ["a"] for mv_sort. Supported options: ["asc", "desc"].']
        );
        testErrorsAndWarnings(
          'row var = mv_sort(to_version("1.0.0"), "a")',
          [],
          ['Invalid option ["a"] for mv_sort. Supported options: ["asc", "desc"].']
        );
        testErrorsAndWarnings(
          'row mv_sort(to_version("1.0.0"), "a")',
          [],
          ['Invalid option ["a"] for mv_sort. Supported options: ["asc", "desc"].']
        );
        testErrorsAndWarnings('from a_index | eval var = mv_sort(longField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(longField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sort(textField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(textField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sort(versionField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(versionField, keywordField)', []);
      });

      describe('mv_sum', () => {
        testErrorsAndWarnings('row var = mv_sum(5.5)', []);
        testErrorsAndWarnings('row mv_sum(5.5)', []);
        testErrorsAndWarnings('row var = mv_sum(to_double(true))', []);
        testErrorsAndWarnings('row var = mv_sum(5)', []);
        testErrorsAndWarnings('row mv_sum(5)', []);
        testErrorsAndWarnings('row var = mv_sum(to_integer(true))', []);

        testErrorsAndWarnings('row var = mv_sum(true)', [
          'Argument of [mv_sum] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_sum(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where mv_sum(booleanField) > 0', [
          'Argument of [mv_sum] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_sum(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_sum(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where mv_sum(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sum(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval mv_sum(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sum(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval mv_sum(booleanField)', [
          'Argument of [mv_sum] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_sum(*)', [
          'Using wildcards (*) in mv_sum is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_sum(integerField)', []);
        testErrorsAndWarnings('from a_index | eval mv_sum(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sum(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sum(longField)', []);
        testErrorsAndWarnings('from a_index | eval mv_sum(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sum(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval mv_sum(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval mv_sum(doubleField, extraArg)', [
          'Error: [mv_sum] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_sum(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval mv_sum(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval mv_sum(nullVar)', []);
      });

      describe('mv_zip', () => {
        testErrorsAndWarnings('row var = mv_zip("a", "a")', []);
        testErrorsAndWarnings('row mv_zip("a", "a")', []);
        testErrorsAndWarnings('row var = mv_zip(to_string(true), to_string(true))', []);
        testErrorsAndWarnings('row var = mv_zip("a", "a", "a")', []);
        testErrorsAndWarnings('row mv_zip("a", "a", "a")', []);
        testErrorsAndWarnings(
          'row var = mv_zip(to_string(true), to_string(true), to_string(true))',
          []
        );

        testErrorsAndWarnings('row var = mv_zip(true, true, true)', [
          'Argument of [mv_zip] must be [keyword], found value [true] type [boolean]',
          'Argument of [mv_zip] must be [keyword], found value [true] type [boolean]',
          'Argument of [mv_zip] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_zip(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval mv_zip(keywordField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_zip(to_string(booleanField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval mv_zip(booleanField, booleanField)', [
          'Argument of [mv_zip] must be [keyword], found value [booleanField] type [boolean]',
          'Argument of [mv_zip] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_zip(keywordField, keywordField, keywordField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_zip(keywordField, keywordField, keywordField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_zip(to_string(booleanField), to_string(booleanField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_zip(booleanField, booleanField, booleanField)',
          [
            'Argument of [mv_zip] must be [keyword], found value [booleanField] type [boolean]',
            'Argument of [mv_zip] must be [keyword], found value [booleanField] type [boolean]',
            'Argument of [mv_zip] must be [keyword], found value [booleanField] type [boolean]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_zip(keywordField, keywordField, textField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_zip(keywordField, keywordField, textField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = mv_zip(keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval mv_zip(keywordField, textField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_zip(keywordField, textField, keywordField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_zip(keywordField, textField, keywordField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | eval var = mv_zip(keywordField, textField, textField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval mv_zip(keywordField, textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_zip(textField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval mv_zip(textField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_zip(textField, keywordField, keywordField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_zip(textField, keywordField, keywordField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | eval var = mv_zip(textField, keywordField, textField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval mv_zip(textField, keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_zip(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval mv_zip(textField, textField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = mv_zip(textField, textField, keywordField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval mv_zip(textField, textField, keywordField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = mv_zip(textField, textField, textField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval mv_zip(textField, textField, textField)', []);

        testErrorsAndWarnings(
          'from a_index | eval mv_zip(keywordField, keywordField, keywordField, extraArg)',
          ['Error: [mv_zip] function expects no more than 3 arguments, got 4.']
        );

        testErrorsAndWarnings('from a_index | sort mv_zip(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval mv_zip(null, null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval mv_zip(nullVar, nullVar, nullVar)', []);
      });

      describe('now', () => {
        testErrorsAndWarnings('row var = now()', []);
        testErrorsAndWarnings('row now()', []);
        testErrorsAndWarnings('from a_index | eval var = now()', []);
        testErrorsAndWarnings('from a_index | eval now()', []);

        testErrorsAndWarnings('from a_index | eval now(extraArg)', [
          'Error: [now] function expects exactly 0 arguments, got 1.',
        ]);

        testErrorsAndWarnings('from a_index | sort now()', []);
        testErrorsAndWarnings('row nullVar = null | eval now()', []);
      });

      describe('pi', () => {
        testErrorsAndWarnings('row var = pi()', []);
        testErrorsAndWarnings('row pi()', []);
        testErrorsAndWarnings('from a_index | where pi() > 0', []);
        testErrorsAndWarnings('from a_index | eval var = pi()', []);
        testErrorsAndWarnings('from a_index | eval pi()', []);

        testErrorsAndWarnings('from a_index | eval pi(extraArg)', [
          'Error: [pi] function expects exactly 0 arguments, got 1.',
        ]);

        testErrorsAndWarnings('from a_index | sort pi()', []);
        testErrorsAndWarnings('row nullVar = null | eval pi()', []);
      });

      describe('pow', () => {
        testErrorsAndWarnings('row var = pow(5.5, 5.5)', []);
        testErrorsAndWarnings('row pow(5.5, 5.5)', []);
        testErrorsAndWarnings('row var = pow(to_double(true), to_double(true))', []);
        testErrorsAndWarnings('row var = pow(5.5, 5)', []);
        testErrorsAndWarnings('row pow(5.5, 5)', []);
        testErrorsAndWarnings('row var = pow(to_double(true), to_integer(true))', []);
        testErrorsAndWarnings('row var = pow(to_double(true), 5)', []);
        testErrorsAndWarnings('row var = pow(5, 5.5)', []);
        testErrorsAndWarnings('row pow(5, 5.5)', []);
        testErrorsAndWarnings('row var = pow(to_integer(true), to_double(true))', []);
        testErrorsAndWarnings('row var = pow(5, 5)', []);
        testErrorsAndWarnings('row pow(5, 5)', []);
        testErrorsAndWarnings('row var = pow(to_integer(true), to_integer(true))', []);
        testErrorsAndWarnings('row var = pow(to_integer(true), 5)', []);
        testErrorsAndWarnings('row var = pow(5, to_double(true))', []);
        testErrorsAndWarnings('row var = pow(5, to_integer(true))', []);

        testErrorsAndWarnings('row var = pow(true, true)', [
          'Argument of [pow] must be [double], found value [true] type [boolean]',
          'Argument of [pow] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where pow(doubleField, doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where pow(booleanField, booleanField) > 0', [
          'Argument of [pow] must be [double], found value [booleanField] type [boolean]',
          'Argument of [pow] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where pow(doubleField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where pow(doubleField, longField) > 0', []);
        testErrorsAndWarnings('from a_index | where pow(doubleField, unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | where pow(integerField, doubleField) > 0', []);
        testErrorsAndWarnings('from a_index | where pow(integerField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where pow(integerField, longField) > 0', []);
        testErrorsAndWarnings('from a_index | where pow(integerField, unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | where pow(longField, doubleField) > 0', []);
        testErrorsAndWarnings('from a_index | where pow(longField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where pow(longField, longField) > 0', []);
        testErrorsAndWarnings('from a_index | where pow(longField, unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | where pow(unsignedLongField, doubleField) > 0', []);
        testErrorsAndWarnings('from a_index | where pow(unsignedLongField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where pow(unsignedLongField, longField) > 0', []);
        testErrorsAndWarnings(
          'from a_index | where pow(unsignedLongField, unsignedLongField) > 0',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = pow(doubleField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval pow(doubleField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = pow(to_double(booleanField), to_double(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval pow(booleanField, booleanField)', [
          'Argument of [pow] must be [double], found value [booleanField] type [boolean]',
          'Argument of [pow] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = pow(doubleField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval pow(doubleField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = pow(to_double(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = pow(doubleField, longField)', []);
        testErrorsAndWarnings('from a_index | eval pow(doubleField, longField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = pow(to_double(booleanField), longField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = pow(doubleField, unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval pow(doubleField, unsignedLongField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = pow(to_double(booleanField), unsignedLongField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = pow(integerField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval pow(integerField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = pow(to_integer(booleanField), to_double(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = pow(integerField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval pow(integerField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = pow(to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = pow(integerField, longField)', []);
        testErrorsAndWarnings('from a_index | eval pow(integerField, longField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = pow(to_integer(booleanField), longField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = pow(integerField, unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval pow(integerField, unsignedLongField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = pow(to_integer(booleanField), unsignedLongField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = pow(longField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval pow(longField, doubleField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = pow(longField, to_double(booleanField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = pow(longField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval pow(longField, integerField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = pow(longField, to_integer(booleanField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = pow(longField, longField)', []);
        testErrorsAndWarnings('from a_index | eval pow(longField, longField)', []);
        testErrorsAndWarnings('from a_index | eval var = pow(longField, unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval pow(longField, unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = pow(unsignedLongField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval pow(unsignedLongField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = pow(unsignedLongField, to_double(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = pow(unsignedLongField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval pow(unsignedLongField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = pow(unsignedLongField, to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = pow(unsignedLongField, longField)', []);
        testErrorsAndWarnings('from a_index | eval pow(unsignedLongField, longField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = pow(unsignedLongField, unsignedLongField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval pow(unsignedLongField, unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval pow(doubleField, doubleField, extraArg)', [
          'Error: [pow] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort pow(doubleField, doubleField)', []);
        testErrorsAndWarnings('from a_index | eval pow(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval pow(nullVar, nullVar)', []);
      });

      describe('repeat', () => {
        testErrorsAndWarnings('row var = repeat("a", 5)', []);
        testErrorsAndWarnings('row repeat("a", 5)', []);
        testErrorsAndWarnings('row var = repeat(to_string(true), to_integer(true))', []);

        testErrorsAndWarnings('row var = repeat(true, true)', [
          'Argument of [repeat] must be [keyword], found value [true] type [boolean]',
          'Argument of [repeat] must be [integer], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = repeat(keywordField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval repeat(keywordField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = repeat(to_string(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval repeat(booleanField, booleanField)', [
          'Argument of [repeat] must be [keyword], found value [booleanField] type [boolean]',
          'Argument of [repeat] must be [integer], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = repeat(textField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval repeat(textField, integerField)', []);

        testErrorsAndWarnings('from a_index | eval repeat(keywordField, integerField, extraArg)', [
          'Error: [repeat] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort repeat(keywordField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval repeat(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval repeat(nullVar, nullVar)', []);
      });

      describe('replace', () => {
        testErrorsAndWarnings('row var = replace("a", "a", "a")', []);
        testErrorsAndWarnings('row replace("a", "a", "a")', []);
        testErrorsAndWarnings(
          'row var = replace(to_string(true), to_string(true), to_string(true))',
          []
        );

        testErrorsAndWarnings('row var = replace(true, true, true)', [
          'Argument of [replace] must be [keyword], found value [true] type [boolean]',
          'Argument of [replace] must be [keyword], found value [true] type [boolean]',
          'Argument of [replace] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = replace(keywordField, keywordField, keywordField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval replace(keywordField, keywordField, keywordField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = replace(to_string(booleanField), to_string(booleanField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval replace(booleanField, booleanField, booleanField)',
          [
            'Argument of [replace] must be [keyword], found value [booleanField] type [boolean]',
            'Argument of [replace] must be [keyword], found value [booleanField] type [boolean]',
            'Argument of [replace] must be [keyword], found value [booleanField] type [boolean]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval var = replace(keywordField, keywordField, textField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval replace(keywordField, keywordField, textField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = replace(keywordField, textField, keywordField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval replace(keywordField, textField, keywordField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = replace(keywordField, textField, textField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval replace(keywordField, textField, textField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = replace(textField, keywordField, keywordField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval replace(textField, keywordField, keywordField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = replace(textField, keywordField, textField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval replace(textField, keywordField, textField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = replace(textField, textField, keywordField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval replace(textField, textField, keywordField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | eval var = replace(textField, textField, textField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval replace(textField, textField, textField)', []);

        testErrorsAndWarnings(
          'from a_index | eval replace(keywordField, keywordField, keywordField, extraArg)',
          ['Error: [replace] function expects exactly 3 arguments, got 4.']
        );

        testErrorsAndWarnings(
          'from a_index | sort replace(keywordField, keywordField, keywordField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval replace(null, null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval replace(nullVar, nullVar, nullVar)', []);
      });

      describe('right', () => {
        testErrorsAndWarnings('row var = right("a", 5)', []);
        testErrorsAndWarnings('row right("a", 5)', []);
        testErrorsAndWarnings('row var = right(to_string(true), to_integer(true))', []);

        testErrorsAndWarnings('row var = right(true, true)', [
          'Argument of [right] must be [keyword], found value [true] type [boolean]',
          'Argument of [right] must be [integer], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = right(keywordField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval right(keywordField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = right(to_string(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval right(booleanField, booleanField)', [
          'Argument of [right] must be [keyword], found value [booleanField] type [boolean]',
          'Argument of [right] must be [integer], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = right(textField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval right(textField, integerField)', []);

        testErrorsAndWarnings('from a_index | eval right(keywordField, integerField, extraArg)', [
          'Error: [right] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort right(keywordField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval right(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval right(nullVar, nullVar)', []);
      });

      describe('round', () => {
        testErrorsAndWarnings('row var = round(5.5)', []);
        testErrorsAndWarnings('row round(5.5)', []);
        testErrorsAndWarnings('row var = round(to_double(true))', []);
        testErrorsAndWarnings('row var = round(5.5, 5)', []);
        testErrorsAndWarnings('row round(5.5, 5)', []);
        testErrorsAndWarnings('row var = round(to_double(true), to_integer(true))', []);
        testErrorsAndWarnings('row var = round(5)', []);
        testErrorsAndWarnings('row round(5)', []);
        testErrorsAndWarnings('row var = round(to_integer(true))', []);
        testErrorsAndWarnings('row var = round(5, 5)', []);
        testErrorsAndWarnings('row round(5, 5)', []);
        testErrorsAndWarnings('row var = round(to_integer(true), to_integer(true))', []);
        testErrorsAndWarnings('row var = round(5, to_integer(true))', []);

        testErrorsAndWarnings('row var = round(true, true)', [
          'Argument of [round] must be [double], found value [true] type [boolean]',
          'Argument of [round] must be [integer], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where round(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where round(booleanField) > 0', [
          'Argument of [round] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where round(doubleField, integerField) > 0', []);

        testErrorsAndWarnings('from a_index | where round(booleanField, booleanField) > 0', [
          'Argument of [round] must be [double], found value [booleanField] type [boolean]',
          'Argument of [round] must be [integer], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where round(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where round(integerField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where round(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where round(longField, integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where round(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = round(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval round(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = round(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval round(booleanField)', [
          'Argument of [round] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = round(*)', [
          'Using wildcards (*) in round is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = round(doubleField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval round(doubleField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = round(to_double(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval round(booleanField, booleanField)', [
          'Argument of [round] must be [double], found value [booleanField] type [boolean]',
          'Argument of [round] must be [integer], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = round(integerField)', []);
        testErrorsAndWarnings('from a_index | eval round(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = round(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = round(integerField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval round(integerField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = round(to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = round(longField)', []);
        testErrorsAndWarnings('from a_index | eval round(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = round(longField, integerField)', []);
        testErrorsAndWarnings('from a_index | eval round(longField, integerField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = round(longField, to_integer(booleanField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = round(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval round(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval round(doubleField, integerField, extraArg)', [
          'Error: [round] function expects no more than 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort round(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval round(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval round(nullVar, nullVar)', []);
      });

      describe('rtrim', () => {
        testErrorsAndWarnings('row var = rtrim("a")', []);
        testErrorsAndWarnings('row rtrim("a")', []);
        testErrorsAndWarnings('row var = rtrim(to_string(true))', []);

        testErrorsAndWarnings('row var = rtrim(true)', [
          'Argument of [rtrim] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = rtrim(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval rtrim(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = rtrim(to_string(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval rtrim(booleanField)', [
          'Argument of [rtrim] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = rtrim(*)', [
          'Using wildcards (*) in rtrim is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = rtrim(textField)', []);
        testErrorsAndWarnings('from a_index | eval rtrim(textField)', []);

        testErrorsAndWarnings('from a_index | eval rtrim(keywordField, extraArg)', [
          'Error: [rtrim] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort rtrim(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval rtrim(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval rtrim(nullVar)', []);
      });

      describe('signum', () => {
        testErrorsAndWarnings('row var = signum(5.5)', []);
        testErrorsAndWarnings('row signum(5.5)', []);
        testErrorsAndWarnings('row var = signum(to_double(true))', []);
        testErrorsAndWarnings('row var = signum(5)', []);
        testErrorsAndWarnings('row signum(5)', []);
        testErrorsAndWarnings('row var = signum(to_integer(true))', []);

        testErrorsAndWarnings('row var = signum(true)', [
          'Argument of [signum] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where signum(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where signum(booleanField) > 0', [
          'Argument of [signum] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where signum(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where signum(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where signum(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = signum(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval signum(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = signum(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval signum(booleanField)', [
          'Argument of [signum] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = signum(*)', [
          'Using wildcards (*) in signum is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = signum(integerField)', []);
        testErrorsAndWarnings('from a_index | eval signum(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = signum(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = signum(longField)', []);
        testErrorsAndWarnings('from a_index | eval signum(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = signum(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval signum(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval signum(doubleField, extraArg)', [
          'Error: [signum] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort signum(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval signum(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval signum(nullVar)', []);
      });

      describe('sin', () => {
        testErrorsAndWarnings('row var = sin(5.5)', []);
        testErrorsAndWarnings('row sin(5.5)', []);
        testErrorsAndWarnings('row var = sin(to_double(true))', []);
        testErrorsAndWarnings('row var = sin(5)', []);
        testErrorsAndWarnings('row sin(5)', []);
        testErrorsAndWarnings('row var = sin(to_integer(true))', []);

        testErrorsAndWarnings('row var = sin(true)', [
          'Argument of [sin] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where sin(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where sin(booleanField) > 0', [
          'Argument of [sin] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where sin(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where sin(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where sin(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = sin(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval sin(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = sin(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval sin(booleanField)', [
          'Argument of [sin] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sin(*)', [
          'Using wildcards (*) in sin is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sin(integerField)', []);
        testErrorsAndWarnings('from a_index | eval sin(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = sin(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = sin(longField)', []);
        testErrorsAndWarnings('from a_index | eval sin(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = sin(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval sin(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval sin(doubleField, extraArg)', [
          'Error: [sin] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort sin(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval sin(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval sin(nullVar)', []);
      });

      describe('sinh', () => {
        testErrorsAndWarnings('row var = sinh(5.5)', []);
        testErrorsAndWarnings('row sinh(5.5)', []);
        testErrorsAndWarnings('row var = sinh(to_double(true))', []);
        testErrorsAndWarnings('row var = sinh(5)', []);
        testErrorsAndWarnings('row sinh(5)', []);
        testErrorsAndWarnings('row var = sinh(to_integer(true))', []);

        testErrorsAndWarnings('row var = sinh(true)', [
          'Argument of [sinh] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where sinh(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where sinh(booleanField) > 0', [
          'Argument of [sinh] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where sinh(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where sinh(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where sinh(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = sinh(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval sinh(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = sinh(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval sinh(booleanField)', [
          'Argument of [sinh] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sinh(*)', [
          'Using wildcards (*) in sinh is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sinh(integerField)', []);
        testErrorsAndWarnings('from a_index | eval sinh(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = sinh(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = sinh(longField)', []);
        testErrorsAndWarnings('from a_index | eval sinh(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = sinh(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval sinh(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval sinh(doubleField, extraArg)', [
          'Error: [sinh] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort sinh(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval sinh(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval sinh(nullVar)', []);
      });

      describe('split', () => {
        testErrorsAndWarnings('row var = split("a", "a")', []);
        testErrorsAndWarnings('row split("a", "a")', []);
        testErrorsAndWarnings('row var = split(to_string(true), to_string(true))', []);

        testErrorsAndWarnings('row var = split(true, true)', [
          'Argument of [split] must be [keyword], found value [true] type [boolean]',
          'Argument of [split] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = split(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval split(keywordField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = split(to_string(booleanField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval split(booleanField, booleanField)', [
          'Argument of [split] must be [keyword], found value [booleanField] type [boolean]',
          'Argument of [split] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = split(keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval split(keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval var = split(textField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval split(textField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = split(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval split(textField, textField)', []);

        testErrorsAndWarnings('from a_index | eval split(keywordField, keywordField, extraArg)', [
          'Error: [split] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort split(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval split(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval split(nullVar, nullVar)', []);
      });

      describe('sqrt', () => {
        testErrorsAndWarnings('row var = sqrt(5.5)', []);
        testErrorsAndWarnings('row sqrt(5.5)', []);
        testErrorsAndWarnings('row var = sqrt(to_double(true))', []);
        testErrorsAndWarnings('row var = sqrt(5)', []);
        testErrorsAndWarnings('row sqrt(5)', []);
        testErrorsAndWarnings('row var = sqrt(to_integer(true))', []);

        testErrorsAndWarnings('row var = sqrt(true)', [
          'Argument of [sqrt] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where sqrt(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where sqrt(booleanField) > 0', [
          'Argument of [sqrt] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where sqrt(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where sqrt(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where sqrt(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = sqrt(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval sqrt(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = sqrt(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval sqrt(booleanField)', [
          'Argument of [sqrt] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sqrt(*)', [
          'Using wildcards (*) in sqrt is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sqrt(integerField)', []);
        testErrorsAndWarnings('from a_index | eval sqrt(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = sqrt(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = sqrt(longField)', []);
        testErrorsAndWarnings('from a_index | eval sqrt(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = sqrt(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval sqrt(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval sqrt(doubleField, extraArg)', [
          'Error: [sqrt] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort sqrt(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval sqrt(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval sqrt(nullVar)', []);
      });

      describe('st_contains', () => {
        testErrorsAndWarnings('row var = st_contains(cartesianPointField, cartesianPointField)', [
          'Unknown column [cartesianPointField]',
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row st_contains(cartesianPointField, cartesianPointField)', [
          'Unknown column [cartesianPointField]',
          'Unknown column [cartesianPointField]',
        ]);

        testErrorsAndWarnings(
          'row var = st_contains(to_cartesianpoint(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_contains(cartesianPointField, to_cartesianshape("POINT (30 10)"))',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row st_contains(cartesianPointField, to_cartesianshape("POINT (30 10)"))',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_cartesianpoint(cartesianPointField), to_cartesianshape(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_cartesianshape("POINT (30 10)"), cartesianPointField)',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row st_contains(to_cartesianshape("POINT (30 10)"), cartesianPointField)',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_cartesianshape(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_cartesianshape("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_contains(to_cartesianshape("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_cartesianshape(cartesianPointField), to_cartesianshape(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings('row var = st_contains(geoPointField, geoPointField)', [
          'Unknown column [geoPointField]',
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row st_contains(geoPointField, geoPointField)', [
          'Unknown column [geoPointField]',
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = st_contains(to_geopoint(geoPointField), to_geopoint(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );
        testErrorsAndWarnings(
          'row var = st_contains(geoPointField, to_geoshape("POINT (30 10)"))',
          ['Unknown column [geoPointField]']
        );
        testErrorsAndWarnings('row st_contains(geoPointField, to_geoshape("POINT (30 10)"))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = st_contains(to_geopoint(geoPointField), to_geoshape(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );
        testErrorsAndWarnings(
          'row var = st_contains(to_geoshape("POINT (30 10)"), geoPointField)',
          ['Unknown column [geoPointField]']
        );
        testErrorsAndWarnings('row st_contains(to_geoshape("POINT (30 10)"), geoPointField)', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = st_contains(to_geoshape(geoPointField), to_geopoint(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_geoshape("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_contains(to_geoshape("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_geoshape(geoPointField), to_geoshape(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );

        testErrorsAndWarnings('row var = st_contains(true, true)', [
          'Argument of [st_contains] must be [cartesian_point], found value [true] type [boolean]',
          'Argument of [st_contains] must be [cartesian_point], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_contains(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(to_cartesianpoint(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_contains(booleanField, booleanField)', [
          'Argument of [st_contains] must be [cartesian_point], found value [booleanField] type [boolean]',
          'Argument of [st_contains] must be [cartesian_point], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_contains(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(to_cartesianpoint(cartesianPointField), to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(cartesianShapeField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_contains(cartesianShapeField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(to_cartesianshape(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(cartesianShapeField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_contains(cartesianShapeField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(to_cartesianshape(cartesianPointField), to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(geoPointField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_contains(geoPointField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(to_geopoint(geoPointField), to_geopoint(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(geoPointField, geoShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_contains(geoPointField, geoShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(to_geopoint(geoPointField), to_geoshape(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(geoShapeField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_contains(geoShapeField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(to_geoshape(geoPointField), to_geopoint(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(geoShapeField, geoShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_contains(geoShapeField, geoShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(to_geoshape(geoPointField), to_geoshape(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_contains(cartesianPointField, cartesianPointField, extraArg)',
          ['Error: [st_contains] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | sort st_contains(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_contains(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval st_contains(nullVar, nullVar)', []);

        testErrorsAndWarnings(
          'row var = st_contains(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_contains(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")), to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_cartesianpoint("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_contains(to_cartesianpoint("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")), to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_cartesianshape("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_contains(to_cartesianshape("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_cartesianshape(to_cartesianpoint("POINT (30 10)")), to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_cartesianshape(to_cartesianpoint("POINT (30 10)")), to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_contains(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_geopoint(to_geopoint("POINT (30 10)")), to_geopoint(to_geopoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_contains(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_geopoint(to_geopoint("POINT (30 10)")), to_geoshape(to_geopoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_geoshape("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_contains(to_geoshape("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_geoshape(to_geopoint("POINT (30 10)")), to_geopoint(to_geopoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_geoshape(to_geopoint("POINT (30 10)")), to_geoshape(to_geopoint("POINT (30 10)")))',
          []
        );
      });

      describe('st_disjoint', () => {
        testErrorsAndWarnings('row var = st_disjoint(cartesianPointField, cartesianPointField)', [
          'Unknown column [cartesianPointField]',
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row st_disjoint(cartesianPointField, cartesianPointField)', [
          'Unknown column [cartesianPointField]',
          'Unknown column [cartesianPointField]',
        ]);

        testErrorsAndWarnings(
          'row var = st_disjoint(to_cartesianpoint(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(cartesianPointField, to_cartesianshape("POINT (30 10)"))',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row st_disjoint(cartesianPointField, to_cartesianshape("POINT (30 10)"))',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_cartesianpoint(cartesianPointField), to_cartesianshape(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_cartesianshape("POINT (30 10)"), cartesianPointField)',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row st_disjoint(to_cartesianshape("POINT (30 10)"), cartesianPointField)',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_cartesianshape(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_cartesianshape("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_disjoint(to_cartesianshape("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_cartesianshape(cartesianPointField), to_cartesianshape(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings('row var = st_disjoint(geoPointField, geoPointField)', [
          'Unknown column [geoPointField]',
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row st_disjoint(geoPointField, geoPointField)', [
          'Unknown column [geoPointField]',
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = st_disjoint(to_geopoint(geoPointField), to_geopoint(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );
        testErrorsAndWarnings(
          'row var = st_disjoint(geoPointField, to_geoshape("POINT (30 10)"))',
          ['Unknown column [geoPointField]']
        );
        testErrorsAndWarnings('row st_disjoint(geoPointField, to_geoshape("POINT (30 10)"))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = st_disjoint(to_geopoint(geoPointField), to_geoshape(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );
        testErrorsAndWarnings(
          'row var = st_disjoint(to_geoshape("POINT (30 10)"), geoPointField)',
          ['Unknown column [geoPointField]']
        );
        testErrorsAndWarnings('row st_disjoint(to_geoshape("POINT (30 10)"), geoPointField)', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = st_disjoint(to_geoshape(geoPointField), to_geopoint(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_geoshape("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_disjoint(to_geoshape("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_geoshape(geoPointField), to_geoshape(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );

        testErrorsAndWarnings('row var = st_disjoint(true, true)', [
          'Argument of [st_disjoint] must be [cartesian_point], found value [true] type [boolean]',
          'Argument of [st_disjoint] must be [cartesian_point], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_disjoint(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(to_cartesianpoint(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_disjoint(booleanField, booleanField)', [
          'Argument of [st_disjoint] must be [cartesian_point], found value [booleanField] type [boolean]',
          'Argument of [st_disjoint] must be [cartesian_point], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_disjoint(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(to_cartesianpoint(cartesianPointField), to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(cartesianShapeField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_disjoint(cartesianShapeField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(to_cartesianshape(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(cartesianShapeField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_disjoint(cartesianShapeField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(to_cartesianshape(cartesianPointField), to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(geoPointField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_disjoint(geoPointField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(to_geopoint(geoPointField), to_geopoint(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(geoPointField, geoShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_disjoint(geoPointField, geoShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(to_geopoint(geoPointField), to_geoshape(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(geoShapeField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_disjoint(geoShapeField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(to_geoshape(geoPointField), to_geopoint(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(geoShapeField, geoShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_disjoint(geoShapeField, geoShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(to_geoshape(geoPointField), to_geoshape(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_disjoint(cartesianPointField, cartesianPointField, extraArg)',
          ['Error: [st_disjoint] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | sort st_disjoint(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_disjoint(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval st_disjoint(nullVar, nullVar)', []);

        testErrorsAndWarnings(
          'row var = st_disjoint(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_disjoint(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")), to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_cartesianpoint("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_disjoint(to_cartesianpoint("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")), to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_cartesianshape("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_disjoint(to_cartesianshape("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_cartesianshape(to_cartesianpoint("POINT (30 10)")), to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_cartesianshape(to_cartesianpoint("POINT (30 10)")), to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_disjoint(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_geopoint(to_geopoint("POINT (30 10)")), to_geopoint(to_geopoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_disjoint(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_geopoint(to_geopoint("POINT (30 10)")), to_geoshape(to_geopoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_geoshape("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_disjoint(to_geoshape("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_geoshape(to_geopoint("POINT (30 10)")), to_geopoint(to_geopoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_geoshape(to_geopoint("POINT (30 10)")), to_geoshape(to_geopoint("POINT (30 10)")))',
          []
        );
      });

      describe('st_distance', () => {
        testErrorsAndWarnings('row var = st_distance(cartesianPointField, cartesianPointField)', [
          'Unknown column [cartesianPointField]',
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row st_distance(cartesianPointField, cartesianPointField)', [
          'Unknown column [cartesianPointField]',
          'Unknown column [cartesianPointField]',
        ]);

        testErrorsAndWarnings(
          'row var = st_distance(to_cartesianpoint(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings('row var = st_distance(geoPointField, geoPointField)', [
          'Unknown column [geoPointField]',
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row st_distance(geoPointField, geoPointField)', [
          'Unknown column [geoPointField]',
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = st_distance(to_geopoint(geoPointField), to_geopoint(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );

        testErrorsAndWarnings('row var = st_distance(true, true)', [
          'Argument of [st_distance] must be [cartesian_point], found value [true] type [boolean]',
          'Argument of [st_distance] must be [cartesian_point], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = st_distance(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_distance(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_distance(to_cartesianpoint(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_distance(booleanField, booleanField)', [
          'Argument of [st_distance] must be [cartesian_point], found value [booleanField] type [boolean]',
          'Argument of [st_distance] must be [cartesian_point], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = st_distance(geoPointField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_distance(geoPointField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_distance(to_geopoint(geoPointField), to_geopoint(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_distance(cartesianPointField, cartesianPointField, extraArg)',
          ['Error: [st_distance] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | sort st_distance(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_distance(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval st_distance(nullVar, nullVar)', []);

        testErrorsAndWarnings(
          'row var = st_distance(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_distance(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_distance(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")), to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_distance(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_distance(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_distance(to_geopoint(to_geopoint("POINT (30 10)")), to_geopoint(to_geopoint("POINT (30 10)")))',
          []
        );
      });

      describe('st_intersects', () => {
        testErrorsAndWarnings('row var = st_intersects(cartesianPointField, cartesianPointField)', [
          'Unknown column [cartesianPointField]',
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row st_intersects(cartesianPointField, cartesianPointField)', [
          'Unknown column [cartesianPointField]',
          'Unknown column [cartesianPointField]',
        ]);

        testErrorsAndWarnings(
          'row var = st_intersects(to_cartesianpoint(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_intersects(cartesianPointField, to_cartesianshape("POINT (30 10)"))',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row st_intersects(cartesianPointField, to_cartesianshape("POINT (30 10)"))',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_cartesianpoint(cartesianPointField), to_cartesianshape(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_cartesianshape("POINT (30 10)"), cartesianPointField)',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row st_intersects(to_cartesianshape("POINT (30 10)"), cartesianPointField)',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_cartesianshape(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_cartesianshape("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_intersects(to_cartesianshape("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_cartesianshape(cartesianPointField), to_cartesianshape(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings('row var = st_intersects(geoPointField, geoPointField)', [
          'Unknown column [geoPointField]',
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row st_intersects(geoPointField, geoPointField)', [
          'Unknown column [geoPointField]',
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = st_intersects(to_geopoint(geoPointField), to_geopoint(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );
        testErrorsAndWarnings(
          'row var = st_intersects(geoPointField, to_geoshape("POINT (30 10)"))',
          ['Unknown column [geoPointField]']
        );
        testErrorsAndWarnings('row st_intersects(geoPointField, to_geoshape("POINT (30 10)"))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = st_intersects(to_geopoint(geoPointField), to_geoshape(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );
        testErrorsAndWarnings(
          'row var = st_intersects(to_geoshape("POINT (30 10)"), geoPointField)',
          ['Unknown column [geoPointField]']
        );
        testErrorsAndWarnings('row st_intersects(to_geoshape("POINT (30 10)"), geoPointField)', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = st_intersects(to_geoshape(geoPointField), to_geopoint(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_geoshape("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_intersects(to_geoshape("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_geoshape(geoPointField), to_geoshape(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );

        testErrorsAndWarnings('row var = st_intersects(true, true)', [
          'Argument of [st_intersects] must be [cartesian_point], found value [true] type [boolean]',
          'Argument of [st_intersects] must be [cartesian_point], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(to_cartesianpoint(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_intersects(booleanField, booleanField)', [
          'Argument of [st_intersects] must be [cartesian_point], found value [booleanField] type [boolean]',
          'Argument of [st_intersects] must be [cartesian_point], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(to_cartesianpoint(cartesianPointField), to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(cartesianShapeField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(cartesianShapeField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(to_cartesianshape(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(cartesianShapeField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(cartesianShapeField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(to_cartesianshape(cartesianPointField), to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(geoPointField, geoPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(geoPointField, geoPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(to_geopoint(geoPointField), to_geopoint(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(geoPointField, geoShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(geoPointField, geoShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(to_geopoint(geoPointField), to_geoshape(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(geoShapeField, geoPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(geoShapeField, geoPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(to_geoshape(geoPointField), to_geopoint(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(geoShapeField, geoShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(geoShapeField, geoShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(to_geoshape(geoPointField), to_geoshape(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(cartesianPointField, cartesianPointField, extraArg)',
          ['Error: [st_intersects] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | sort st_intersects(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_intersects(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval st_intersects(nullVar, nullVar)', []);

        testErrorsAndWarnings(
          'row var = st_intersects(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_intersects(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")), to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_cartesianpoint("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_intersects(to_cartesianpoint("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")), to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_cartesianshape("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_intersects(to_cartesianshape("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_cartesianshape(to_cartesianpoint("POINT (30 10)")), to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_cartesianshape(to_cartesianpoint("POINT (30 10)")), to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_intersects(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_geopoint(to_geopoint("POINT (30 10)")), to_geopoint(to_geopoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_intersects(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_geopoint(to_geopoint("POINT (30 10)")), to_geoshape(to_geopoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_geoshape("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_intersects(to_geoshape("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_geoshape(to_geopoint("POINT (30 10)")), to_geopoint(to_geopoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_geoshape(to_geopoint("POINT (30 10)")), to_geoshape(to_geopoint("POINT (30 10)")))',
          []
        );
      });

      describe('st_within', () => {
        testErrorsAndWarnings('row var = st_within(cartesianPointField, cartesianPointField)', [
          'Unknown column [cartesianPointField]',
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row st_within(cartesianPointField, cartesianPointField)', [
          'Unknown column [cartesianPointField]',
          'Unknown column [cartesianPointField]',
        ]);

        testErrorsAndWarnings(
          'row var = st_within(to_cartesianpoint(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_within(cartesianPointField, to_cartesianshape("POINT (30 10)"))',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row st_within(cartesianPointField, to_cartesianshape("POINT (30 10)"))',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_within(to_cartesianpoint(cartesianPointField), to_cartesianshape(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_within(to_cartesianshape("POINT (30 10)"), cartesianPointField)',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row st_within(to_cartesianshape("POINT (30 10)"), cartesianPointField)',
          ['Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_within(to_cartesianshape(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_within(to_cartesianshape("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_within(to_cartesianshape("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_cartesianshape(cartesianPointField), to_cartesianshape(cartesianPointField))',
          ['Unknown column [cartesianPointField]', 'Unknown column [cartesianPointField]']
        );

        testErrorsAndWarnings('row var = st_within(geoPointField, geoPointField)', [
          'Unknown column [geoPointField]',
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row st_within(geoPointField, geoPointField)', [
          'Unknown column [geoPointField]',
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = st_within(to_geopoint(geoPointField), to_geopoint(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );
        testErrorsAndWarnings('row var = st_within(geoPointField, to_geoshape("POINT (30 10)"))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row st_within(geoPointField, to_geoshape("POINT (30 10)"))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = st_within(to_geopoint(geoPointField), to_geoshape(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );
        testErrorsAndWarnings('row var = st_within(to_geoshape("POINT (30 10)"), geoPointField)', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row st_within(to_geoshape("POINT (30 10)"), geoPointField)', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = st_within(to_geoshape(geoPointField), to_geopoint(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );

        testErrorsAndWarnings(
          'row var = st_within(to_geoshape("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_within(to_geoshape("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_geoshape(geoPointField), to_geoshape(geoPointField))',
          ['Unknown column [geoPointField]', 'Unknown column [geoPointField]']
        );

        testErrorsAndWarnings('row var = st_within(true, true)', [
          'Argument of [st_within] must be [cartesian_point], found value [true] type [boolean]',
          'Argument of [st_within] must be [cartesian_point], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_within(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(to_cartesianpoint(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_within(booleanField, booleanField)', [
          'Argument of [st_within] must be [cartesian_point], found value [booleanField] type [boolean]',
          'Argument of [st_within] must be [cartesian_point], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_within(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(to_cartesianpoint(cartesianPointField), to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(cartesianShapeField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_within(cartesianShapeField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(to_cartesianshape(cartesianPointField), to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(cartesianShapeField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_within(cartesianShapeField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(to_cartesianshape(cartesianPointField), to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(geoPointField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_within(geoPointField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(to_geopoint(geoPointField), to_geopoint(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(geoPointField, geoShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_within(geoPointField, geoShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(to_geopoint(geoPointField), to_geoshape(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(geoShapeField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_within(geoShapeField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(to_geoshape(geoPointField), to_geopoint(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(geoShapeField, geoShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_within(geoShapeField, geoShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(to_geoshape(geoPointField), to_geoshape(geoPointField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_within(cartesianPointField, cartesianPointField, extraArg)',
          ['Error: [st_within] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | sort st_within(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_within(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval st_within(nullVar, nullVar)', []);

        testErrorsAndWarnings(
          'row var = st_within(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_within(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")), to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_cartesianpoint("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_within(to_cartesianpoint("POINT (30 10)"), to_cartesianshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")), to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_cartesianshape("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_within(to_cartesianshape("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_cartesianshape(to_cartesianpoint("POINT (30 10)")), to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_cartesianshape(to_cartesianpoint("POINT (30 10)")), to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_within(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_geopoint(to_geopoint("POINT (30 10)")), to_geopoint(to_geopoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_within(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_geopoint(to_geopoint("POINT (30 10)")), to_geoshape(to_geopoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_geoshape("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_within(to_geoshape("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_geoshape(to_geopoint("POINT (30 10)")), to_geopoint(to_geopoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_geoshape(to_geopoint("POINT (30 10)")), to_geoshape(to_geopoint("POINT (30 10)")))',
          []
        );
      });

      describe('st_x', () => {
        testErrorsAndWarnings('row var = st_x(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row st_x(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = st_x(to_cartesianpoint(cartesianPointField))', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = st_x(geoPointField)', ['Unknown column [geoPointField]']);
        testErrorsAndWarnings('row st_x(geoPointField)', ['Unknown column [geoPointField]']);
        testErrorsAndWarnings('row var = st_x(to_geopoint(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);

        testErrorsAndWarnings('row var = st_x(true)', [
          'Argument of [st_x] must be [cartesian_point], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = st_x(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval st_x(cartesianPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_x(to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_x(booleanField)', [
          'Argument of [st_x] must be [cartesian_point], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = st_x(*)', [
          'Using wildcards (*) in st_x is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = st_x(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval st_x(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval var = st_x(to_geopoint(geoPointField))', []);

        testErrorsAndWarnings('from a_index | eval st_x(cartesianPointField, extraArg)', [
          'Error: [st_x] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort st_x(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval st_x(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval st_x(nullVar)', []);
        testErrorsAndWarnings('row var = st_x(to_cartesianpoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row st_x(to_cartesianpoint("POINT (30 10)"))', []);

        testErrorsAndWarnings(
          'row var = st_x(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings('row var = st_x(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row st_x(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = st_x(to_geopoint(to_geopoint("POINT (30 10)")))', []);
      });

      describe('st_y', () => {
        testErrorsAndWarnings('row var = st_y(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row st_y(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = st_y(to_cartesianpoint(cartesianPointField))', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = st_y(geoPointField)', ['Unknown column [geoPointField]']);
        testErrorsAndWarnings('row st_y(geoPointField)', ['Unknown column [geoPointField]']);
        testErrorsAndWarnings('row var = st_y(to_geopoint(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);

        testErrorsAndWarnings('row var = st_y(true)', [
          'Argument of [st_y] must be [cartesian_point], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = st_y(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval st_y(cartesianPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_y(to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_y(booleanField)', [
          'Argument of [st_y] must be [cartesian_point], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = st_y(*)', [
          'Using wildcards (*) in st_y is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = st_y(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval st_y(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval var = st_y(to_geopoint(geoPointField))', []);

        testErrorsAndWarnings('from a_index | eval st_y(cartesianPointField, extraArg)', [
          'Error: [st_y] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort st_y(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval st_y(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval st_y(nullVar)', []);
        testErrorsAndWarnings('row var = st_y(to_cartesianpoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row st_y(to_cartesianpoint("POINT (30 10)"))', []);

        testErrorsAndWarnings(
          'row var = st_y(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings('row var = st_y(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row st_y(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = st_y(to_geopoint(to_geopoint("POINT (30 10)")))', []);
      });

      describe('starts_with', () => {
        testErrorsAndWarnings('row var = starts_with("a", "a")', []);
        testErrorsAndWarnings('row starts_with("a", "a")', []);
        testErrorsAndWarnings('row var = starts_with(to_string(true), to_string(true))', []);

        testErrorsAndWarnings('row var = starts_with(true, true)', [
          'Argument of [starts_with] must be [keyword], found value [true] type [boolean]',
          'Argument of [starts_with] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = starts_with(keywordField, keywordField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval starts_with(keywordField, keywordField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = starts_with(to_string(booleanField), to_string(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval starts_with(booleanField, booleanField)', [
          'Argument of [starts_with] must be [keyword], found value [booleanField] type [boolean]',
          'Argument of [starts_with] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = starts_with(textField, textField)', []);
        testErrorsAndWarnings('from a_index | eval starts_with(textField, textField)', []);

        testErrorsAndWarnings(
          'from a_index | eval starts_with(keywordField, keywordField, extraArg)',
          ['Error: [starts_with] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings('from a_index | sort starts_with(keywordField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval starts_with(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval starts_with(nullVar, nullVar)', []);
        testErrorsAndWarnings('from a_index | eval var = starts_with(keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval starts_with(keywordField, textField)', []);
        testErrorsAndWarnings('from a_index | eval var = starts_with(textField, keywordField)', []);
        testErrorsAndWarnings('from a_index | eval starts_with(textField, keywordField)', []);
      });

      describe('substring', () => {
        testErrorsAndWarnings('row var = substring("a", 5, 5)', []);
        testErrorsAndWarnings('row substring("a", 5, 5)', []);

        testErrorsAndWarnings(
          'row var = substring(to_string(true), to_integer(true), to_integer(true))',
          []
        );

        testErrorsAndWarnings('row var = substring(true, true, true)', [
          'Argument of [substring] must be [keyword], found value [true] type [boolean]',
          'Argument of [substring] must be [integer], found value [true] type [boolean]',
          'Argument of [substring] must be [integer], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = substring(keywordField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval substring(keywordField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = substring(to_string(booleanField), to_integer(booleanField), to_integer(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval substring(booleanField, booleanField, booleanField)',
          [
            'Argument of [substring] must be [keyword], found value [booleanField] type [boolean]',
            'Argument of [substring] must be [integer], found value [booleanField] type [boolean]',
            'Argument of [substring] must be [integer], found value [booleanField] type [boolean]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval var = substring(textField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval substring(textField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval substring(keywordField, integerField, integerField, extraArg)',
          ['Error: [substring] function expects no more than 3 arguments, got 4.']
        );

        testErrorsAndWarnings(
          'from a_index | sort substring(keywordField, integerField, integerField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval substring(null, null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval substring(nullVar, nullVar, nullVar)', []);
      });

      describe('tan', () => {
        testErrorsAndWarnings('row var = tan(5.5)', []);
        testErrorsAndWarnings('row tan(5.5)', []);
        testErrorsAndWarnings('row var = tan(to_double(true))', []);
        testErrorsAndWarnings('row var = tan(5)', []);
        testErrorsAndWarnings('row tan(5)', []);
        testErrorsAndWarnings('row var = tan(to_integer(true))', []);

        testErrorsAndWarnings('row var = tan(true)', [
          'Argument of [tan] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where tan(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where tan(booleanField) > 0', [
          'Argument of [tan] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where tan(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where tan(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where tan(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = tan(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval tan(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = tan(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval tan(booleanField)', [
          'Argument of [tan] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = tan(*)', [
          'Using wildcards (*) in tan is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = tan(integerField)', []);
        testErrorsAndWarnings('from a_index | eval tan(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = tan(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = tan(longField)', []);
        testErrorsAndWarnings('from a_index | eval tan(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = tan(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval tan(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval tan(doubleField, extraArg)', [
          'Error: [tan] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort tan(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval tan(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval tan(nullVar)', []);
      });

      describe('tanh', () => {
        testErrorsAndWarnings('row var = tanh(5.5)', []);
        testErrorsAndWarnings('row tanh(5.5)', []);
        testErrorsAndWarnings('row var = tanh(to_double(true))', []);
        testErrorsAndWarnings('row var = tanh(5)', []);
        testErrorsAndWarnings('row tanh(5)', []);
        testErrorsAndWarnings('row var = tanh(to_integer(true))', []);

        testErrorsAndWarnings('row var = tanh(true)', [
          'Argument of [tanh] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where tanh(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where tanh(booleanField) > 0', [
          'Argument of [tanh] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where tanh(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where tanh(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where tanh(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = tanh(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval tanh(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = tanh(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval tanh(booleanField)', [
          'Argument of [tanh] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = tanh(*)', [
          'Using wildcards (*) in tanh is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = tanh(integerField)', []);
        testErrorsAndWarnings('from a_index | eval tanh(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = tanh(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = tanh(longField)', []);
        testErrorsAndWarnings('from a_index | eval tanh(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = tanh(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval tanh(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval tanh(doubleField, extraArg)', [
          'Error: [tanh] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort tanh(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval tanh(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval tanh(nullVar)', []);
      });

      describe('tau', () => {
        testErrorsAndWarnings('row var = tau()', []);
        testErrorsAndWarnings('row tau()', []);
        testErrorsAndWarnings('from a_index | where tau() > 0', []);
        testErrorsAndWarnings('from a_index | eval var = tau()', []);
        testErrorsAndWarnings('from a_index | eval tau()', []);

        testErrorsAndWarnings('from a_index | eval tau(extraArg)', [
          'Error: [tau] function expects exactly 0 arguments, got 1.',
        ]);

        testErrorsAndWarnings('from a_index | sort tau()', []);
        testErrorsAndWarnings('row nullVar = null | eval tau()', []);
      });

      describe('to_base64', () => {
        testErrorsAndWarnings('row var = to_base64("a")', []);
        testErrorsAndWarnings('row to_base64("a")', []);
        testErrorsAndWarnings('row var = to_base64(to_string(true))', []);

        testErrorsAndWarnings('row var = to_base64(true)', [
          'Argument of [to_base64] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_base64(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_base64(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_base64(to_string(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval to_base64(booleanField)', [
          'Argument of [to_base64] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_base64(*)', [
          'Using wildcards (*) in to_base64 is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_base64(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_base64(textField)', []);

        testErrorsAndWarnings('from a_index | eval to_base64(keywordField, extraArg)', [
          'Error: [to_base64] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_base64(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_base64(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_base64(nullVar)', []);
      });

      describe('to_boolean', () => {
        testErrorsAndWarnings('row var = to_boolean(true)', []);
        testErrorsAndWarnings('row to_boolean(true)', []);
        testErrorsAndWarnings('row var = to_bool(true)', []);
        testErrorsAndWarnings('row var = to_boolean(to_boolean(true))', []);
        testErrorsAndWarnings('row var = to_boolean(5.5)', []);
        testErrorsAndWarnings('row to_boolean(5.5)', []);
        testErrorsAndWarnings('row var = to_bool(5.5)', []);
        testErrorsAndWarnings('row var = to_boolean(to_double(true))', []);
        testErrorsAndWarnings('row var = to_boolean(5)', []);
        testErrorsAndWarnings('row to_boolean(5)', []);
        testErrorsAndWarnings('row var = to_bool(5)', []);
        testErrorsAndWarnings('row var = to_boolean(to_integer(true))', []);
        testErrorsAndWarnings('row var = to_boolean("a")', []);
        testErrorsAndWarnings('row to_boolean("a")', []);
        testErrorsAndWarnings('row var = to_bool("a")', []);
        testErrorsAndWarnings('row var = to_boolean(to_string(true))', []);

        testErrorsAndWarnings('row var = to_boolean(to_cartesianpoint("POINT (30 10)"))', [
          'Argument of [to_boolean] must be [boolean], found value [to_cartesianpoint("POINT (30 10)")] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_boolean(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval to_boolean(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_bool(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_boolean(to_boolean(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval to_boolean(cartesianPointField)', [
          'Argument of [to_boolean] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_boolean(*)', [
          'Using wildcards (*) in to_boolean is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_boolean(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval to_boolean(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_bool(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_boolean(to_double(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_boolean(integerField)', []);
        testErrorsAndWarnings('from a_index | eval to_boolean(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_bool(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_boolean(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_boolean(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_boolean(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_bool(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_boolean(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_boolean(longField)', []);
        testErrorsAndWarnings('from a_index | eval to_boolean(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_bool(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_boolean(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_boolean(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_bool(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_boolean(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval to_boolean(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_bool(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval to_boolean(booleanField, extraArg)', [
          'Error: [to_boolean] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_boolean(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval to_boolean(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_boolean(nullVar)', []);
      });

      describe('to_cartesianpoint', () => {
        testErrorsAndWarnings('row var = to_cartesianpoint(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row to_cartesianpoint(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = to_cartesianpoint(to_cartesianpoint(cartesianPointField))',
          ['Unknown column [cartesianPointField]']
        );
        testErrorsAndWarnings('row var = to_cartesianpoint("a")', []);
        testErrorsAndWarnings('row to_cartesianpoint("a")', []);
        testErrorsAndWarnings('row var = to_cartesianpoint(to_string(true))', []);

        testErrorsAndWarnings('row var = to_cartesianpoint(true)', [
          'Argument of [to_cartesianpoint] must be [cartesian_point], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = to_cartesianpoint(cartesianPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval to_cartesianpoint(cartesianPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = to_cartesianpoint(to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval to_cartesianpoint(booleanField)', [
          'Argument of [to_cartesianpoint] must be [cartesian_point], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_cartesianpoint(*)', [
          'Using wildcards (*) in to_cartesianpoint is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_cartesianpoint(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_cartesianpoint(keywordField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = to_cartesianpoint(to_string(booleanField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = to_cartesianpoint(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_cartesianpoint(textField)', []);

        testErrorsAndWarnings(
          'from a_index | eval to_cartesianpoint(cartesianPointField, extraArg)',
          ['Error: [to_cartesianpoint] function expects exactly one argument, got 2.']
        );

        testErrorsAndWarnings('from a_index | sort to_cartesianpoint(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval to_cartesianpoint(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_cartesianpoint(nullVar)', []);
        testErrorsAndWarnings(
          'row var = to_cartesianpoint(to_cartesianpoint("POINT (30 10)"))',
          []
        );
        testErrorsAndWarnings('row to_cartesianpoint(to_cartesianpoint("POINT (30 10)"))', []);

        testErrorsAndWarnings(
          'row var = to_cartesianpoint(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );
      });

      describe('to_cartesianshape', () => {
        testErrorsAndWarnings('row var = to_cartesianshape(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row to_cartesianshape(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings(
          'row var = to_cartesianshape(to_cartesianpoint(cartesianPointField))',
          ['Unknown column [cartesianPointField]']
        );
        testErrorsAndWarnings(
          'row var = to_cartesianshape(to_cartesianshape("POINT (30 10)"))',
          []
        );
        testErrorsAndWarnings('row to_cartesianshape(to_cartesianshape("POINT (30 10)"))', []);
        testErrorsAndWarnings(
          'row var = to_cartesianshape(to_cartesianshape(cartesianPointField))',
          ['Unknown column [cartesianPointField]']
        );
        testErrorsAndWarnings('row var = to_cartesianshape("a")', []);
        testErrorsAndWarnings('row to_cartesianshape("a")', []);
        testErrorsAndWarnings('row var = to_cartesianshape(to_string(true))', []);

        testErrorsAndWarnings('row var = to_cartesianshape(true)', [
          'Argument of [to_cartesianshape] must be [cartesian_point], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = to_cartesianshape(cartesianPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval to_cartesianshape(cartesianPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = to_cartesianshape(to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval to_cartesianshape(booleanField)', [
          'Argument of [to_cartesianshape] must be [cartesian_point], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_cartesianshape(*)', [
          'Using wildcards (*) in to_cartesianshape is not allowed',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = to_cartesianshape(cartesianShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval to_cartesianshape(cartesianShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = to_cartesianshape(to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = to_cartesianshape(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_cartesianshape(keywordField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = to_cartesianshape(to_string(booleanField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = to_cartesianshape(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_cartesianshape(textField)', []);

        testErrorsAndWarnings(
          'from a_index | eval to_cartesianshape(cartesianPointField, extraArg)',
          ['Error: [to_cartesianshape] function expects exactly one argument, got 2.']
        );

        testErrorsAndWarnings('from a_index | sort to_cartesianshape(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval to_cartesianshape(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_cartesianshape(nullVar)', []);
        testErrorsAndWarnings(
          'row var = to_cartesianshape(to_cartesianpoint("POINT (30 10)"))',
          []
        );
        testErrorsAndWarnings('row to_cartesianshape(to_cartesianpoint("POINT (30 10)"))', []);

        testErrorsAndWarnings(
          'row var = to_cartesianshape(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = to_cartesianshape(to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );
      });

      describe('to_datetime', () => {
        testErrorsAndWarnings('row var = to_datetime(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row to_datetime(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row var = to_dt(to_datetime("2021-01-01T00:00:00Z"))', []);

        testErrorsAndWarnings(
          'row var = to_datetime(to_datetime(to_datetime("2021-01-01T00:00:00Z")))',
          []
        );

        testErrorsAndWarnings('row var = to_datetime(5.5)', []);
        testErrorsAndWarnings('row to_datetime(5.5)', []);
        testErrorsAndWarnings('row var = to_dt(5.5)', []);
        testErrorsAndWarnings('row var = to_datetime(to_double(true))', []);
        testErrorsAndWarnings('row var = to_datetime(5)', []);
        testErrorsAndWarnings('row to_datetime(5)', []);
        testErrorsAndWarnings('row var = to_dt(5)', []);
        testErrorsAndWarnings('row var = to_datetime(to_integer(true))', []);
        testErrorsAndWarnings('row var = to_datetime("a")', []);
        testErrorsAndWarnings('row to_datetime("a")', []);
        testErrorsAndWarnings('row var = to_dt("a")', []);
        testErrorsAndWarnings('row var = to_datetime(to_string(true))', []);

        testErrorsAndWarnings('row var = to_datetime(true)', [
          'Argument of [to_datetime] must be [date], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_datetime(dateField)', []);
        testErrorsAndWarnings('from a_index | eval to_datetime(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dt(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_datetime(to_datetime(dateField))', []);

        testErrorsAndWarnings('from a_index | eval to_datetime(booleanField)', [
          'Argument of [to_datetime] must be [date], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_datetime(*)', [
          'Using wildcards (*) in to_datetime is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_datetime(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval to_datetime(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dt(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_datetime(to_double(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_datetime(integerField)', []);
        testErrorsAndWarnings('from a_index | eval to_datetime(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dt(integerField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = to_datetime(to_integer(booleanField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = to_datetime(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_datetime(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dt(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_datetime(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_datetime(longField)', []);
        testErrorsAndWarnings('from a_index | eval to_datetime(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dt(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_datetime(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_datetime(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dt(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_datetime(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval to_datetime(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dt(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval to_datetime(dateField, extraArg)', [
          'Error: [to_datetime] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_datetime(dateField)', []);
        testErrorsAndWarnings('from a_index | eval to_datetime(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_datetime(nullVar)', []);
        testErrorsAndWarnings('from a_index | eval to_datetime("2022")', []);
        testErrorsAndWarnings('from a_index | eval to_datetime(concat("20", "22"))', []);
      });

      describe('to_degrees', () => {
        testErrorsAndWarnings('row var = to_degrees(5.5)', []);
        testErrorsAndWarnings('row to_degrees(5.5)', []);
        testErrorsAndWarnings('row var = to_degrees(to_double(true))', []);
        testErrorsAndWarnings('row var = to_degrees(5)', []);
        testErrorsAndWarnings('row to_degrees(5)', []);
        testErrorsAndWarnings('row var = to_degrees(to_integer(true))', []);

        testErrorsAndWarnings('row var = to_degrees(true)', [
          'Argument of [to_degrees] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where to_degrees(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where to_degrees(booleanField) > 0', [
          'Argument of [to_degrees] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where to_degrees(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_degrees(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_degrees(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = to_degrees(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval to_degrees(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_degrees(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval to_degrees(booleanField)', [
          'Argument of [to_degrees] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_degrees(*)', [
          'Using wildcards (*) in to_degrees is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_degrees(integerField)', []);
        testErrorsAndWarnings('from a_index | eval to_degrees(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_degrees(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_degrees(longField)', []);
        testErrorsAndWarnings('from a_index | eval to_degrees(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_degrees(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval to_degrees(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval to_degrees(doubleField, extraArg)', [
          'Error: [to_degrees] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_degrees(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval to_degrees(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_degrees(nullVar)', []);
      });

      describe('to_double', () => {
        testErrorsAndWarnings('row var = to_double(true)', []);
        testErrorsAndWarnings('row to_double(true)', []);
        testErrorsAndWarnings('row var = to_dbl(true)', []);
        testErrorsAndWarnings('row var = to_double(to_boolean(true))', []);
        testErrorsAndWarnings('row var = to_double(5.5)', []);
        testErrorsAndWarnings('row to_double(5.5)', []);
        testErrorsAndWarnings('row var = to_dbl(5.5)', []);
        testErrorsAndWarnings('row var = to_double(5)', []);
        testErrorsAndWarnings('row to_double(5)', []);
        testErrorsAndWarnings('row var = to_dbl(5)', []);
        testErrorsAndWarnings('row var = to_double(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row to_double(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row var = to_dbl(to_datetime("2021-01-01T00:00:00Z"))', []);

        testErrorsAndWarnings(
          'row var = to_double(to_datetime(to_datetime("2021-01-01T00:00:00Z")))',
          []
        );

        testErrorsAndWarnings('row var = to_double(to_double(true))', []);
        testErrorsAndWarnings('row var = to_double(to_integer(true))', []);
        testErrorsAndWarnings('row var = to_double("a")', []);
        testErrorsAndWarnings('row to_double("a")', []);
        testErrorsAndWarnings('row var = to_dbl("a")', []);
        testErrorsAndWarnings('row var = to_double(to_string(true))', []);

        testErrorsAndWarnings('row var = to_double(to_cartesianpoint("POINT (30 10)"))', [
          'Argument of [to_double] must be [boolean], found value [to_cartesianpoint("POINT (30 10)")] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | where to_double(booleanField) > 0', []);

        testErrorsAndWarnings('from a_index | where to_double(cartesianPointField) > 0', [
          'Argument of [to_double] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | where to_double(counterDoubleField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_double(counterIntegerField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_double(counterLongField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_double(dateField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_double(doubleField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_double(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_double(keywordField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_double(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_double(textField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_double(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval to_double(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dbl(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(to_boolean(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval to_double(cartesianPointField)', [
          'Argument of [to_double] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_double(*)', [
          'Using wildcards (*) in to_double is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_double(counterDoubleField)', []);
        testErrorsAndWarnings('from a_index | eval to_double(counterDoubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dbl(counterDoubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(counterIntegerField)', []);
        testErrorsAndWarnings('from a_index | eval to_double(counterIntegerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dbl(counterIntegerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(counterLongField)', []);
        testErrorsAndWarnings('from a_index | eval to_double(counterLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dbl(counterLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(dateField)', []);
        testErrorsAndWarnings('from a_index | eval to_double(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dbl(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(to_datetime(dateField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval to_double(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dbl(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(to_double(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(integerField)', []);
        testErrorsAndWarnings('from a_index | eval to_double(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dbl(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_double(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dbl(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(longField)', []);
        testErrorsAndWarnings('from a_index | eval to_double(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dbl(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_double(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dbl(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval to_double(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dbl(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval to_double(booleanField, extraArg)', [
          'Error: [to_double] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_double(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval to_double(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_double(nullVar)', []);
        testErrorsAndWarnings('from a_index | eval to_double("2022")', []);
        testErrorsAndWarnings('from a_index | eval to_double(concat("20", "22"))', []);
      });

      describe('to_geopoint', () => {
        testErrorsAndWarnings('row var = to_geopoint(geoPointField)', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row to_geopoint(geoPointField)', ['Unknown column [geoPointField]']);
        testErrorsAndWarnings('row var = to_geopoint(to_geopoint(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row var = to_geopoint("a")', []);
        testErrorsAndWarnings('row to_geopoint("a")', []);
        testErrorsAndWarnings('row var = to_geopoint(to_string(true))', []);

        testErrorsAndWarnings('row var = to_geopoint(true)', [
          'Argument of [to_geopoint] must be [geo_point], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_geopoint(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval to_geopoint(geoPointField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = to_geopoint(to_geopoint(geoPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval to_geopoint(booleanField)', [
          'Argument of [to_geopoint] must be [geo_point], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_geopoint(*)', [
          'Using wildcards (*) in to_geopoint is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_geopoint(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_geopoint(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_geopoint(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_geopoint(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_geopoint(textField)', []);

        testErrorsAndWarnings('from a_index | eval to_geopoint(geoPointField, extraArg)', [
          'Error: [to_geopoint] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_geopoint(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval to_geopoint(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_geopoint(nullVar)', []);
        testErrorsAndWarnings('row var = to_geopoint(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row to_geopoint(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings(
          'row var = to_geopoint(to_geopoint(to_geopoint("POINT (30 10)")))',
          []
        );
      });

      describe('to_geoshape', () => {
        testErrorsAndWarnings('row var = to_geoshape(geoPointField)', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row to_geoshape(geoPointField)', ['Unknown column [geoPointField]']);
        testErrorsAndWarnings('row var = to_geoshape(to_geopoint(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row var = to_geoshape(to_geoshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row to_geoshape(to_geoshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = to_geoshape(to_geoshape(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row var = to_geoshape("a")', []);
        testErrorsAndWarnings('row to_geoshape("a")', []);
        testErrorsAndWarnings('row var = to_geoshape(to_string(true))', []);

        testErrorsAndWarnings('row var = to_geoshape(true)', [
          'Argument of [to_geoshape] must be [geo_point], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_geoshape(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval to_geoshape(geoPointField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = to_geoshape(to_geopoint(geoPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval to_geoshape(booleanField)', [
          'Argument of [to_geoshape] must be [geo_point], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_geoshape(*)', [
          'Using wildcards (*) in to_geoshape is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_geoshape(geoShapeField)', []);
        testErrorsAndWarnings('from a_index | eval to_geoshape(geoShapeField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = to_geoshape(to_geoshape(geoPointField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = to_geoshape(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_geoshape(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_geoshape(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_geoshape(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_geoshape(textField)', []);

        testErrorsAndWarnings('from a_index | eval to_geoshape(geoPointField, extraArg)', [
          'Error: [to_geoshape] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_geoshape(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval to_geoshape(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_geoshape(nullVar)', []);
        testErrorsAndWarnings('row var = to_geoshape(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row to_geoshape(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings(
          'row var = to_geoshape(to_geopoint(to_geopoint("POINT (30 10)")))',
          []
        );
        testErrorsAndWarnings(
          'row var = to_geoshape(to_geoshape(to_geopoint("POINT (30 10)")))',
          []
        );
      });

      describe('to_integer', () => {
        testErrorsAndWarnings('row var = to_integer(true)', []);
        testErrorsAndWarnings('row to_integer(true)', []);
        testErrorsAndWarnings('row var = to_int(true)', []);
        testErrorsAndWarnings('row var = to_integer(to_boolean(true))', []);
        testErrorsAndWarnings('row var = to_integer(5)', []);
        testErrorsAndWarnings('row to_integer(5)', []);
        testErrorsAndWarnings('row var = to_int(5)', []);
        testErrorsAndWarnings('row var = to_integer(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row to_integer(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row var = to_int(to_datetime("2021-01-01T00:00:00Z"))', []);

        testErrorsAndWarnings(
          'row var = to_integer(to_datetime(to_datetime("2021-01-01T00:00:00Z")))',
          []
        );

        testErrorsAndWarnings('row var = to_integer(5.5)', []);
        testErrorsAndWarnings('row to_integer(5.5)', []);
        testErrorsAndWarnings('row var = to_int(5.5)', []);
        testErrorsAndWarnings('row var = to_integer(to_double(true))', []);
        testErrorsAndWarnings('row var = to_integer(to_integer(true))', []);
        testErrorsAndWarnings('row var = to_integer("a")', []);
        testErrorsAndWarnings('row to_integer("a")', []);
        testErrorsAndWarnings('row var = to_int("a")', []);
        testErrorsAndWarnings('row var = to_integer(to_string(true))', []);

        testErrorsAndWarnings('row var = to_integer(to_cartesianpoint("POINT (30 10)"))', [
          'Argument of [to_integer] must be [boolean], found value [to_cartesianpoint("POINT (30 10)")] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | where to_integer(booleanField) > 0', []);

        testErrorsAndWarnings('from a_index | where to_integer(cartesianPointField) > 0', [
          'Argument of [to_integer] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | where to_integer(counterIntegerField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_integer(dateField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_integer(doubleField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_integer(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_integer(keywordField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_integer(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_integer(textField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_integer(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = to_integer(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval to_integer(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_int(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_integer(to_boolean(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval to_integer(cartesianPointField)', [
          'Argument of [to_integer] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_integer(*)', [
          'Using wildcards (*) in to_integer is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_integer(counterIntegerField)', []);
        testErrorsAndWarnings('from a_index | eval to_integer(counterIntegerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_int(counterIntegerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_integer(dateField)', []);
        testErrorsAndWarnings('from a_index | eval to_integer(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_int(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_integer(to_datetime(dateField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_integer(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval to_integer(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_int(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_integer(to_double(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_integer(integerField)', []);
        testErrorsAndWarnings('from a_index | eval to_integer(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_int(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_integer(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_integer(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_integer(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_int(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_integer(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_integer(longField)', []);
        testErrorsAndWarnings('from a_index | eval to_integer(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_int(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_integer(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_integer(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_int(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_integer(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval to_integer(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_int(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval to_integer(booleanField, extraArg)', [
          'Error: [to_integer] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_integer(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval to_integer(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_integer(nullVar)', []);
        testErrorsAndWarnings('from a_index | eval to_integer("2022")', []);
        testErrorsAndWarnings('from a_index | eval to_integer(concat("20", "22"))', []);
      });

      describe('to_ip', () => {
        testErrorsAndWarnings('row var = to_ip(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row to_ip(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row var = to_ip(to_ip(to_ip("127.0.0.1")))', []);
        testErrorsAndWarnings('row var = to_ip("a")', []);
        testErrorsAndWarnings('row to_ip("a")', []);
        testErrorsAndWarnings('row var = to_ip(to_string(true))', []);

        testErrorsAndWarnings('row var = to_ip(true)', [
          'Argument of [to_ip] must be [ip], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_ip(ipField)', []);
        testErrorsAndWarnings('from a_index | eval to_ip(ipField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ip(to_ip(ipField))', []);

        testErrorsAndWarnings('from a_index | eval to_ip(booleanField)', [
          'Argument of [to_ip] must be [ip], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_ip(*)', [
          'Using wildcards (*) in to_ip is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_ip(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_ip(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ip(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_ip(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_ip(textField)', []);

        testErrorsAndWarnings('from a_index | eval to_ip(ipField, extraArg)', [
          'Error: [to_ip] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_ip(ipField)', []);
        testErrorsAndWarnings('from a_index | eval to_ip(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_ip(nullVar)', []);
      });

      describe('to_long', () => {
        testErrorsAndWarnings('row var = to_long(true)', []);
        testErrorsAndWarnings('row to_long(true)', []);
        testErrorsAndWarnings('row var = to_long(to_boolean(true))', []);
        testErrorsAndWarnings('row var = to_long(5)', []);
        testErrorsAndWarnings('row to_long(5)', []);
        testErrorsAndWarnings('row var = to_long(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row to_long(to_datetime("2021-01-01T00:00:00Z"))', []);

        testErrorsAndWarnings(
          'row var = to_long(to_datetime(to_datetime("2021-01-01T00:00:00Z")))',
          []
        );

        testErrorsAndWarnings('row var = to_long(5.5)', []);
        testErrorsAndWarnings('row to_long(5.5)', []);
        testErrorsAndWarnings('row var = to_long(to_double(true))', []);
        testErrorsAndWarnings('row var = to_long(to_integer(true))', []);
        testErrorsAndWarnings('row var = to_long("a")', []);
        testErrorsAndWarnings('row to_long("a")', []);
        testErrorsAndWarnings('row var = to_long(to_string(true))', []);

        testErrorsAndWarnings('row var = to_long(to_cartesianpoint("POINT (30 10)"))', [
          'Argument of [to_long] must be [boolean], found value [to_cartesianpoint("POINT (30 10)")] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | where to_long(booleanField) > 0', []);

        testErrorsAndWarnings('from a_index | where to_long(cartesianPointField) > 0', [
          'Argument of [to_long] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | where to_long(counterIntegerField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_long(counterLongField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_long(dateField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_long(doubleField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_long(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_long(keywordField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_long(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_long(textField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_long(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval to_long(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(to_boolean(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval to_long(cartesianPointField)', [
          'Argument of [to_long] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_long(*)', [
          'Using wildcards (*) in to_long is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_long(counterIntegerField)', []);
        testErrorsAndWarnings('from a_index | eval to_long(counterIntegerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(counterLongField)', []);
        testErrorsAndWarnings('from a_index | eval to_long(counterLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(dateField)', []);
        testErrorsAndWarnings('from a_index | eval to_long(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(to_datetime(dateField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval to_long(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(to_double(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(integerField)', []);
        testErrorsAndWarnings('from a_index | eval to_long(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_long(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(longField)', []);
        testErrorsAndWarnings('from a_index | eval to_long(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_long(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval to_long(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval to_long(booleanField, extraArg)', [
          'Error: [to_long] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_long(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval to_long(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_long(nullVar)', []);
        testErrorsAndWarnings('from a_index | eval to_long("2022")', []);
        testErrorsAndWarnings('from a_index | eval to_long(concat("20", "22"))', []);
      });

      describe('to_lower', () => {
        testErrorsAndWarnings('row var = to_lower("a")', []);
        testErrorsAndWarnings('row to_lower("a")', []);
        testErrorsAndWarnings('row var = to_lower(to_string(true))', []);

        testErrorsAndWarnings('row var = to_lower(true)', [
          'Argument of [to_lower] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_lower(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_lower(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_lower(to_string(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval to_lower(booleanField)', [
          'Argument of [to_lower] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_lower(*)', [
          'Using wildcards (*) in to_lower is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_lower(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_lower(textField)', []);

        testErrorsAndWarnings('from a_index | eval to_lower(keywordField, extraArg)', [
          'Error: [to_lower] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_lower(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_lower(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_lower(nullVar)', []);
      });

      describe('to_radians', () => {
        testErrorsAndWarnings('row var = to_radians(5.5)', []);
        testErrorsAndWarnings('row to_radians(5.5)', []);
        testErrorsAndWarnings('row var = to_radians(to_double(true))', []);
        testErrorsAndWarnings('row var = to_radians(5)', []);
        testErrorsAndWarnings('row to_radians(5)', []);
        testErrorsAndWarnings('row var = to_radians(to_integer(true))', []);

        testErrorsAndWarnings('row var = to_radians(true)', [
          'Argument of [to_radians] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where to_radians(doubleField) > 0', []);

        testErrorsAndWarnings('from a_index | where to_radians(booleanField) > 0', [
          'Argument of [to_radians] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | where to_radians(integerField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_radians(longField) > 0', []);
        testErrorsAndWarnings('from a_index | where to_radians(unsignedLongField) > 0', []);
        testErrorsAndWarnings('from a_index | eval var = to_radians(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval to_radians(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_radians(to_double(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval to_radians(booleanField)', [
          'Argument of [to_radians] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_radians(*)', [
          'Using wildcards (*) in to_radians is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_radians(integerField)', []);
        testErrorsAndWarnings('from a_index | eval to_radians(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_radians(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_radians(longField)', []);
        testErrorsAndWarnings('from a_index | eval to_radians(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_radians(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval to_radians(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval to_radians(doubleField, extraArg)', [
          'Error: [to_radians] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_radians(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval to_radians(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_radians(nullVar)', []);
      });

      describe('to_unsigned_long', () => {
        testErrorsAndWarnings('row var = to_unsigned_long(true)', []);
        testErrorsAndWarnings('row to_unsigned_long(true)', []);
        testErrorsAndWarnings('row var = to_ul(true)', []);
        testErrorsAndWarnings('row var = to_ulong(true)', []);
        testErrorsAndWarnings('row var = to_unsigned_long(to_boolean(true))', []);
        testErrorsAndWarnings(
          'row var = to_unsigned_long(to_datetime("2021-01-01T00:00:00Z"))',
          []
        );
        testErrorsAndWarnings('row to_unsigned_long(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row var = to_ul(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row var = to_ulong(to_datetime("2021-01-01T00:00:00Z"))', []);

        testErrorsAndWarnings(
          'row var = to_unsigned_long(to_datetime(to_datetime("2021-01-01T00:00:00Z")))',
          []
        );

        testErrorsAndWarnings('row var = to_unsigned_long(5.5)', []);
        testErrorsAndWarnings('row to_unsigned_long(5.5)', []);
        testErrorsAndWarnings('row var = to_ul(5.5)', []);
        testErrorsAndWarnings('row var = to_ulong(5.5)', []);
        testErrorsAndWarnings('row var = to_unsigned_long(to_double(true))', []);
        testErrorsAndWarnings('row var = to_unsigned_long(5)', []);
        testErrorsAndWarnings('row to_unsigned_long(5)', []);
        testErrorsAndWarnings('row var = to_ul(5)', []);
        testErrorsAndWarnings('row var = to_ulong(5)', []);
        testErrorsAndWarnings('row var = to_unsigned_long(to_integer(true))', []);
        testErrorsAndWarnings('row var = to_unsigned_long("a")', []);
        testErrorsAndWarnings('row to_unsigned_long("a")', []);
        testErrorsAndWarnings('row var = to_ul("a")', []);
        testErrorsAndWarnings('row var = to_ulong("a")', []);
        testErrorsAndWarnings('row var = to_unsigned_long(to_string(true))', []);

        testErrorsAndWarnings('row var = to_unsigned_long(to_cartesianpoint("POINT (30 10)"))', [
          'Argument of [to_unsigned_long] must be [boolean], found value [to_cartesianpoint("POINT (30 10)")] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | where to_unsigned_long(booleanField) > 0', [
          'Argument of [>] must be [double], found value [to_unsigned_long(booleanField)] type [unsigned_long]',
        ]);

        testErrorsAndWarnings('from a_index | where to_unsigned_long(cartesianPointField) > 0', [
          'Argument of [to_unsigned_long] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
          'Argument of [>] must be [double], found value [to_unsigned_long(cartesianPointField)] type [unsigned_long]',
        ]);

        testErrorsAndWarnings('from a_index | where to_unsigned_long(dateField) > 0', [
          'Argument of [>] must be [double], found value [to_unsigned_long(dateField)] type [unsigned_long]',
        ]);
        testErrorsAndWarnings('from a_index | where to_unsigned_long(doubleField) > 0', [
          'Argument of [>] must be [double], found value [to_unsigned_long(doubleField)] type [unsigned_long]',
        ]);
        testErrorsAndWarnings('from a_index | where to_unsigned_long(integerField) > 0', [
          'Argument of [>] must be [double], found value [to_unsigned_long(integerField)] type [unsigned_long]',
        ]);
        testErrorsAndWarnings('from a_index | where to_unsigned_long(keywordField) > 0', [
          'Argument of [>] must be [double], found value [to_unsigned_long(keywordField)] type [unsigned_long]',
        ]);
        testErrorsAndWarnings('from a_index | where to_unsigned_long(longField) > 0', [
          'Argument of [>] must be [double], found value [to_unsigned_long(longField)] type [unsigned_long]',
        ]);
        testErrorsAndWarnings('from a_index | where to_unsigned_long(textField) > 0', [
          'Argument of [>] must be [double], found value [to_unsigned_long(textField)] type [unsigned_long]',
        ]);
        testErrorsAndWarnings('from a_index | where to_unsigned_long(unsignedLongField) > 0', [
          'Argument of [>] must be [double], found value [to_unsigned_long(unsignedLongField)] type [unsigned_long]',
        ]);
        testErrorsAndWarnings('from a_index | eval var = to_unsigned_long(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval to_unsigned_long(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ul(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ulong(booleanField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = to_unsigned_long(to_boolean(booleanField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval to_unsigned_long(cartesianPointField)', [
          'Argument of [to_unsigned_long] must be [boolean], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_unsigned_long(*)', [
          'Using wildcards (*) in to_unsigned_long is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_unsigned_long(dateField)', []);
        testErrorsAndWarnings('from a_index | eval to_unsigned_long(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ul(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ulong(dateField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = to_unsigned_long(to_datetime(dateField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = to_unsigned_long(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval to_unsigned_long(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ul(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ulong(doubleField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = to_unsigned_long(to_double(booleanField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = to_unsigned_long(integerField)', []);
        testErrorsAndWarnings('from a_index | eval to_unsigned_long(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ul(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ulong(integerField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = to_unsigned_long(to_integer(booleanField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = to_unsigned_long(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_unsigned_long(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ul(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ulong(keywordField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = to_unsigned_long(to_string(booleanField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = to_unsigned_long(longField)', []);
        testErrorsAndWarnings('from a_index | eval to_unsigned_long(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ul(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ulong(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_unsigned_long(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_unsigned_long(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ul(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ulong(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_unsigned_long(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval to_unsigned_long(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ul(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ulong(unsignedLongField)', []);

        testErrorsAndWarnings('from a_index | eval to_unsigned_long(booleanField, extraArg)', [
          'Error: [to_unsigned_long] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_unsigned_long(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval to_unsigned_long(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_unsigned_long(nullVar)', []);
        testErrorsAndWarnings('from a_index | eval to_unsigned_long("2022")', []);
        testErrorsAndWarnings('from a_index | eval to_unsigned_long(concat("20", "22"))', []);
      });

      describe('to_upper', () => {
        testErrorsAndWarnings('row var = to_upper("a")', []);
        testErrorsAndWarnings('row to_upper("a")', []);
        testErrorsAndWarnings('row var = to_upper(to_string(true))', []);

        testErrorsAndWarnings('row var = to_upper(true)', [
          'Argument of [to_upper] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_upper(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_upper(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_upper(to_string(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval to_upper(booleanField)', [
          'Argument of [to_upper] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_upper(*)', [
          'Using wildcards (*) in to_upper is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_upper(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_upper(textField)', []);

        testErrorsAndWarnings('from a_index | eval to_upper(keywordField, extraArg)', [
          'Error: [to_upper] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_upper(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_upper(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_upper(nullVar)', []);
      });

      describe('to_version', () => {
        testErrorsAndWarnings('row var = to_version("a")', []);
        testErrorsAndWarnings('row to_version("a")', []);
        testErrorsAndWarnings('row var = to_ver("a")', []);
        testErrorsAndWarnings('row var = to_version(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row to_version(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row var = to_ver(to_version("1.0.0"))', []);

        testErrorsAndWarnings('row var = to_version(true)', [
          'Argument of [to_version] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_version(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_version(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ver(keywordField)', []);

        testErrorsAndWarnings('from a_index | eval var = to_version(*)', [
          'Using wildcards (*) in to_version is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_version(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_version(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ver(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_version(versionField)', []);
        testErrorsAndWarnings('from a_index | eval to_version(versionField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ver(versionField)', []);

        testErrorsAndWarnings('from a_index | eval to_version(keywordField, extraArg)', [
          'Error: [to_version] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_version(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_version(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_version(nullVar)', []);
      });

      describe('trim', () => {
        testErrorsAndWarnings('row var = trim("a")', []);
        testErrorsAndWarnings('row trim("a")', []);
        testErrorsAndWarnings('row var = trim(to_string(true))', []);

        testErrorsAndWarnings('row var = trim(true)', [
          'Argument of [trim] must be [keyword], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = trim(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval trim(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = trim(to_string(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval trim(booleanField)', [
          'Argument of [trim] must be [keyword], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = trim(*)', [
          'Using wildcards (*) in trim is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = trim(textField)', []);
        testErrorsAndWarnings('from a_index | eval trim(textField)', []);

        testErrorsAndWarnings('from a_index | eval trim(keywordField, extraArg)', [
          'Error: [trim] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort trim(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval trim(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval trim(nullVar)', []);
      });

      describe('case', () => {
        testErrorsAndWarnings('row var = case(true, "a")', []);
        testErrorsAndWarnings('row case(true, "a")', []);

        testErrorsAndWarnings('row var = case(to_cartesianpoint("POINT (30 10)"), true)', [
          'Argument of [case] must be [boolean], found value [to_cartesianpoint("POINT (30 10)")] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = case(booleanField, textField)', []);
        testErrorsAndWarnings('from a_index | eval case(booleanField, textField)', []);
        testErrorsAndWarnings('from a_index | sort case(booleanField, textField)', []);
        testErrorsAndWarnings('from a_index | eval case(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | eval case(nullVar, nullVar)', []);
      });

      describe('avg', () => {
        testErrorsAndWarnings('from a_index | stats var = avg(integerField)', []);
        testErrorsAndWarnings('from a_index | stats avg(integerField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(avg(integerField))', []);
        testErrorsAndWarnings('from a_index | stats round(avg(integerField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(avg(integerField)) + avg(integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(avg(integerField)) + avg(integerField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats avg(doubleField / 2)', []);
        testErrorsAndWarnings('from a_index | stats var0 = avg(doubleField / 2)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), avg(doubleField / 2)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(doubleField / 2)',
          []
        );
        testErrorsAndWarnings('from a_index | stats var0 = avg(integerField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), avg(integerField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(integerField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | stats avg(integerField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = avg(integerField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(integerField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(integerField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(integerField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(integerField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = avg(avg(integerField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
        ]);

        testErrorsAndWarnings('from a_index | stats avg(avg(integerField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
        ]);

        testErrorsAndWarnings('from a_index | stats avg(booleanField)', [
          'Argument of [avg] must be [integer], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | stats var = avg(*)', [
          'Using wildcards (*) in avg is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | stats var = avg(counterIntegerField)', []);
        testErrorsAndWarnings('from a_index | stats avg(counterIntegerField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(avg(counterIntegerField))', []);
        testErrorsAndWarnings('from a_index | stats round(avg(counterIntegerField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(avg(counterIntegerField)) + avg(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(avg(counterIntegerField)) + avg(counterIntegerField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = avg(counterIntegerField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(counterIntegerField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = avg(counterIntegerField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(counterIntegerField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(counterIntegerField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(counterIntegerField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(counterIntegerField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = avg(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(avg(doubleField))', []);
        testErrorsAndWarnings('from a_index | stats round(avg(doubleField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(avg(doubleField)) + avg(doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(avg(doubleField)) + avg(doubleField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats var0 = avg(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), avg(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), var0 = avg(doubleField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = avg(doubleField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(doubleField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(doubleField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(doubleField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(doubleField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = avg(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | stats avg(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(avg(unsignedLongField))', []);
        testErrorsAndWarnings('from a_index | stats round(avg(unsignedLongField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(avg(unsignedLongField)) + avg(unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(avg(unsignedLongField)) + avg(unsignedLongField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = avg(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), avg(unsignedLongField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(unsignedLongField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = avg(unsignedLongField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(unsignedLongField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(unsignedLongField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(unsignedLongField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(unsignedLongField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = avg(longField)', []);
        testErrorsAndWarnings('from a_index | stats avg(longField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(avg(longField))', []);
        testErrorsAndWarnings('from a_index | stats round(avg(longField))', []);
        testErrorsAndWarnings(
          'from a_index | stats var = round(avg(longField)) + avg(longField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats round(avg(longField)) + avg(longField)', []);
        testErrorsAndWarnings('from a_index | stats var0 = avg(longField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), avg(longField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), var0 = avg(longField)', []);
        testErrorsAndWarnings('from a_index | stats avg(longField) by round(doubleField / 2)', []);

        testErrorsAndWarnings(
          'from a_index | stats var0 = avg(longField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(longField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(longField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(longField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(longField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = avg(counterLongField)', []);
        testErrorsAndWarnings('from a_index | stats avg(counterLongField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(avg(counterLongField))', []);
        testErrorsAndWarnings('from a_index | stats round(avg(counterLongField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(avg(counterLongField)) + avg(counterLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(avg(counterLongField)) + avg(counterLongField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = avg(counterLongField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), avg(counterLongField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(counterLongField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | stats avg(counterLongField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = avg(counterLongField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(counterLongField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(counterLongField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(counterLongField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(counterLongField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = avg(counterDoubleField)', []);
        testErrorsAndWarnings('from a_index | stats avg(counterDoubleField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(avg(counterDoubleField))', []);
        testErrorsAndWarnings('from a_index | stats round(avg(counterDoubleField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(avg(counterDoubleField)) + avg(counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(avg(counterDoubleField)) + avg(counterDoubleField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = avg(counterDoubleField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), avg(counterDoubleField)', []);

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(counterDoubleField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = avg(counterDoubleField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(counterDoubleField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(counterDoubleField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), avg(counterDoubleField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = avg(counterDoubleField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | sort avg(integerField)', [
          'SORT does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(integerField)', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(integerField) > 0', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(counterIntegerField)', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(counterIntegerField) > 0', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(doubleField)', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(doubleField) > 0', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(unsignedLongField)', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(unsignedLongField) > 0', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(longField)', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(longField) > 0', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(counterLongField)', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(counterLongField) > 0', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(counterDoubleField)', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(counterDoubleField) > 0', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(integerField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(integerField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(integerField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(integerField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(counterIntegerField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(counterIntegerField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(counterIntegerField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(counterIntegerField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(doubleField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(doubleField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(doubleField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(doubleField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(unsignedLongField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(unsignedLongField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(unsignedLongField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(unsignedLongField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(longField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(longField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(longField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(longField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(counterLongField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(counterLongField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(counterLongField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(counterLongField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(counterDoubleField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(counterDoubleField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(counterDoubleField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(counterDoubleField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | stats avg(null)', []);
        testErrorsAndWarnings('row nullVar = null | stats avg(nullVar)', []);
      });

      describe('sum', () => {
        testErrorsAndWarnings('from a_index | stats var = sum(integerField)', []);
        testErrorsAndWarnings('from a_index | stats sum(integerField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(sum(integerField))', []);
        testErrorsAndWarnings('from a_index | stats round(sum(integerField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(sum(integerField)) + sum(integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(sum(integerField)) + sum(integerField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats sum(doubleField / 2)', []);
        testErrorsAndWarnings('from a_index | stats var0 = sum(doubleField / 2)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), sum(doubleField / 2)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(doubleField / 2)',
          []
        );
        testErrorsAndWarnings('from a_index | stats var0 = sum(integerField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), sum(integerField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(integerField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | stats sum(integerField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = sum(integerField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(integerField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(integerField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(integerField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(integerField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = sum(avg(integerField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
        ]);

        testErrorsAndWarnings('from a_index | stats sum(avg(integerField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
        ]);

        testErrorsAndWarnings('from a_index | stats sum(booleanField)', [
          'Argument of [sum] must be [integer], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | stats var = sum(*)', [
          'Using wildcards (*) in sum is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | stats var = sum(counterIntegerField)', []);
        testErrorsAndWarnings('from a_index | stats sum(counterIntegerField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(sum(counterIntegerField))', []);
        testErrorsAndWarnings('from a_index | stats round(sum(counterIntegerField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(sum(counterIntegerField)) + sum(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(sum(counterIntegerField)) + sum(counterIntegerField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = sum(counterIntegerField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats sum(counterIntegerField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = sum(counterIntegerField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(counterIntegerField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(counterIntegerField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(counterIntegerField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(counterIntegerField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = sum(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats sum(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(sum(doubleField))', []);
        testErrorsAndWarnings('from a_index | stats round(sum(doubleField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(sum(doubleField)) + sum(doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(sum(doubleField)) + sum(doubleField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats var0 = sum(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), sum(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), var0 = sum(doubleField)', []);
        testErrorsAndWarnings(
          'from a_index | stats sum(doubleField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = sum(doubleField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(doubleField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(doubleField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(doubleField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(doubleField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = sum(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | stats sum(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(sum(unsignedLongField))', []);
        testErrorsAndWarnings('from a_index | stats round(sum(unsignedLongField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(sum(unsignedLongField)) + sum(unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(sum(unsignedLongField)) + sum(unsignedLongField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = sum(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), sum(unsignedLongField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats sum(unsignedLongField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = sum(unsignedLongField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(unsignedLongField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(unsignedLongField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(unsignedLongField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(unsignedLongField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = sum(longField)', []);
        testErrorsAndWarnings('from a_index | stats sum(longField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(sum(longField))', []);
        testErrorsAndWarnings('from a_index | stats round(sum(longField))', []);
        testErrorsAndWarnings(
          'from a_index | stats var = round(sum(longField)) + sum(longField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats round(sum(longField)) + sum(longField)', []);
        testErrorsAndWarnings('from a_index | stats var0 = sum(longField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), sum(longField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), var0 = sum(longField)', []);
        testErrorsAndWarnings('from a_index | stats sum(longField) by round(doubleField / 2)', []);

        testErrorsAndWarnings(
          'from a_index | stats var0 = sum(longField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(longField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(longField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(longField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(longField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = sum(counterLongField)', []);
        testErrorsAndWarnings('from a_index | stats sum(counterLongField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(sum(counterLongField))', []);
        testErrorsAndWarnings('from a_index | stats round(sum(counterLongField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(sum(counterLongField)) + sum(counterLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(sum(counterLongField)) + sum(counterLongField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = sum(counterLongField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), sum(counterLongField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(counterLongField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | stats sum(counterLongField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = sum(counterLongField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(counterLongField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(counterLongField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(counterLongField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(counterLongField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = sum(counterDoubleField)', []);
        testErrorsAndWarnings('from a_index | stats sum(counterDoubleField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(sum(counterDoubleField))', []);
        testErrorsAndWarnings('from a_index | stats round(sum(counterDoubleField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(sum(counterDoubleField)) + sum(counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(sum(counterDoubleField)) + sum(counterDoubleField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = sum(counterDoubleField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), sum(counterDoubleField)', []);

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats sum(counterDoubleField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = sum(counterDoubleField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(counterDoubleField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(counterDoubleField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), sum(counterDoubleField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = sum(counterDoubleField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | sort sum(integerField)', [
          'SORT does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(integerField)', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(integerField) > 0', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(counterIntegerField)', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(counterIntegerField) > 0', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(doubleField)', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(doubleField) > 0', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(unsignedLongField)', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(unsignedLongField) > 0', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(longField)', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(longField) > 0', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(counterLongField)', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(counterLongField) > 0', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(counterDoubleField)', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(counterDoubleField) > 0', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(integerField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(integerField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(integerField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(integerField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(counterIntegerField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(counterIntegerField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(counterIntegerField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(counterIntegerField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(doubleField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(doubleField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(doubleField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(doubleField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(unsignedLongField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(unsignedLongField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(unsignedLongField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(unsignedLongField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(longField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(longField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(longField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(longField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(counterLongField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(counterLongField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(counterLongField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(counterLongField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(counterDoubleField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(counterDoubleField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(counterDoubleField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(counterDoubleField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | stats sum(null)', []);
        testErrorsAndWarnings('row nullVar = null | stats sum(nullVar)', []);
      });

      describe('median', () => {
        testErrorsAndWarnings('from a_index | stats var = median(integerField)', []);
        testErrorsAndWarnings('from a_index | stats median(integerField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(median(integerField))', []);
        testErrorsAndWarnings('from a_index | stats round(median(integerField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(median(integerField)) + median(integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median(integerField)) + median(integerField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats median(doubleField / 2)', []);
        testErrorsAndWarnings('from a_index | stats var0 = median(doubleField / 2)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), median(doubleField / 2)', []);

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(doubleField / 2)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = median(integerField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), median(integerField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(integerField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | stats median(integerField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median(integerField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(integerField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(integerField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(integerField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(integerField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = median(avg(integerField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
        ]);

        testErrorsAndWarnings('from a_index | stats median(avg(integerField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
        ]);

        testErrorsAndWarnings('from a_index | stats median(booleanField)', [
          'Argument of [median] must be [integer], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | stats var = median(*)', [
          'Using wildcards (*) in median is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | stats var = median(counterIntegerField)', []);
        testErrorsAndWarnings('from a_index | stats median(counterIntegerField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(median(counterIntegerField))', []);
        testErrorsAndWarnings('from a_index | stats round(median(counterIntegerField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(median(counterIntegerField)) + median(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median(counterIntegerField)) + median(counterIntegerField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = median(counterIntegerField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median(counterIntegerField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median(counterIntegerField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(counterIntegerField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(counterIntegerField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(counterIntegerField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(counterIntegerField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = median(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats median(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(median(doubleField))', []);
        testErrorsAndWarnings('from a_index | stats round(median(doubleField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(median(doubleField)) + median(doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median(doubleField)) + median(doubleField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = median(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), median(doubleField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(doubleField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | stats median(doubleField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median(doubleField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(doubleField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(doubleField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(doubleField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(doubleField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = median(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | stats median(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(median(unsignedLongField))', []);
        testErrorsAndWarnings('from a_index | stats round(median(unsignedLongField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(median(unsignedLongField)) + median(unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median(unsignedLongField)) + median(unsignedLongField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = median(unsignedLongField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median(unsignedLongField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median(unsignedLongField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(unsignedLongField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(unsignedLongField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(unsignedLongField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(unsignedLongField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = median(longField)', []);
        testErrorsAndWarnings('from a_index | stats median(longField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(median(longField))', []);
        testErrorsAndWarnings('from a_index | stats round(median(longField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(median(longField)) + median(longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median(longField)) + median(longField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats var0 = median(longField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), median(longField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(longField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | stats median(longField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median(longField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(longField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(longField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(longField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(longField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = median(counterLongField)', []);
        testErrorsAndWarnings('from a_index | stats median(counterLongField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(median(counterLongField))', []);
        testErrorsAndWarnings('from a_index | stats round(median(counterLongField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(median(counterLongField)) + median(counterLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median(counterLongField)) + median(counterLongField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = median(counterLongField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(counterLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(counterLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median(counterLongField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median(counterLongField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(counterLongField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(counterLongField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(counterLongField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(counterLongField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = median(counterDoubleField)', []);
        testErrorsAndWarnings('from a_index | stats median(counterDoubleField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(median(counterDoubleField))', []);
        testErrorsAndWarnings('from a_index | stats round(median(counterDoubleField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(median(counterDoubleField)) + median(counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median(counterDoubleField)) + median(counterDoubleField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = median(counterDoubleField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median(counterDoubleField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median(counterDoubleField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(counterDoubleField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(counterDoubleField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median(counterDoubleField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median(counterDoubleField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | sort median(integerField)', [
          'SORT does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(integerField)', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(integerField) > 0', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(counterIntegerField)', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(counterIntegerField) > 0', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(doubleField)', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(doubleField) > 0', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(unsignedLongField)', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(unsignedLongField) > 0', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(longField)', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(longField) > 0', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(counterLongField)', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(counterLongField) > 0', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(counterDoubleField)', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(counterDoubleField) > 0', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(integerField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(integerField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(integerField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(integerField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(counterIntegerField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(counterIntegerField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(counterIntegerField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(counterIntegerField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(doubleField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(doubleField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(doubleField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(doubleField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(unsignedLongField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(unsignedLongField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(unsignedLongField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(unsignedLongField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(longField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(longField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(longField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(longField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(counterLongField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(counterLongField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(counterLongField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(counterLongField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(counterDoubleField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(counterDoubleField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(counterDoubleField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(counterDoubleField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | stats median(null)', []);
        testErrorsAndWarnings('row nullVar = null | stats median(nullVar)', []);
      });

      describe('median_absolute_deviation', () => {
        testErrorsAndWarnings(
          'from a_index | stats var = median_absolute_deviation(integerField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats median_absolute_deviation(integerField)', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(integerField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(integerField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(integerField)) + median_absolute_deviation(integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(integerField)) + median_absolute_deviation(integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median_absolute_deviation(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median_absolute_deviation(integerField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(integerField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(integerField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(integerField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(integerField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(integerField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = median_absolute_deviation(avg(integerField))',
          [
            "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
          ]
        );

        testErrorsAndWarnings('from a_index | stats median_absolute_deviation(avg(integerField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
        ]);

        testErrorsAndWarnings('from a_index | stats median_absolute_deviation(booleanField)', [
          'Argument of [median_absolute_deviation] must be [integer], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | stats var = median_absolute_deviation(*)', [
          'Using wildcards (*) in median_absolute_deviation is not allowed',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = median_absolute_deviation(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median_absolute_deviation(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(counterIntegerField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(counterIntegerField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(counterIntegerField)) + median_absolute_deviation(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(counterIntegerField)) + median_absolute_deviation(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(counterIntegerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median_absolute_deviation(counterIntegerField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(counterIntegerField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(counterIntegerField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(counterIntegerField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(counterIntegerField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(counterIntegerField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = median_absolute_deviation(doubleField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats median_absolute_deviation(doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(doubleField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(doubleField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(doubleField)) + median_absolute_deviation(doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(doubleField)) + median_absolute_deviation(doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median_absolute_deviation(doubleField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(doubleField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(doubleField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(doubleField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(doubleField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(doubleField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = median_absolute_deviation(unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median_absolute_deviation(unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(unsignedLongField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(unsignedLongField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(unsignedLongField)) + median_absolute_deviation(unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(unsignedLongField)) + median_absolute_deviation(unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(unsignedLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median_absolute_deviation(unsignedLongField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(unsignedLongField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(unsignedLongField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(unsignedLongField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(unsignedLongField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(unsignedLongField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = median_absolute_deviation(longField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats median_absolute_deviation(longField)', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(longField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(longField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(longField)) + median_absolute_deviation(longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(longField)) + median_absolute_deviation(longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median_absolute_deviation(longField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(longField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(longField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(longField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(longField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(longField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = median_absolute_deviation(counterLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median_absolute_deviation(counterLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(counterLongField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(counterLongField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(counterLongField)) + median_absolute_deviation(counterLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(counterLongField)) + median_absolute_deviation(counterLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(counterLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(counterLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(counterLongField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median_absolute_deviation(counterLongField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(counterLongField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(counterLongField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(counterLongField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(counterLongField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(counterLongField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = median_absolute_deviation(counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median_absolute_deviation(counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(counterDoubleField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(counterDoubleField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(counterDoubleField)) + median_absolute_deviation(counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(counterDoubleField)) + median_absolute_deviation(counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median_absolute_deviation(counterDoubleField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(counterDoubleField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(counterDoubleField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(counterDoubleField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), median_absolute_deviation(counterDoubleField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = median_absolute_deviation(counterDoubleField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | sort median_absolute_deviation(integerField)', [
          'SORT does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings('from a_index | where median_absolute_deviation(integerField)', [
          'WHERE does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings('from a_index | where median_absolute_deviation(integerField) > 0', [
          'WHERE does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings(
          'from a_index | where median_absolute_deviation(counterIntegerField)',
          ['WHERE does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings(
          'from a_index | where median_absolute_deviation(counterIntegerField) > 0',
          ['WHERE does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings('from a_index | where median_absolute_deviation(doubleField)', [
          'WHERE does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings('from a_index | where median_absolute_deviation(doubleField) > 0', [
          'WHERE does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings('from a_index | where median_absolute_deviation(unsignedLongField)', [
          'WHERE does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings(
          'from a_index | where median_absolute_deviation(unsignedLongField) > 0',
          ['WHERE does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings('from a_index | where median_absolute_deviation(longField)', [
          'WHERE does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings('from a_index | where median_absolute_deviation(longField) > 0', [
          'WHERE does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings('from a_index | where median_absolute_deviation(counterLongField)', [
          'WHERE does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings(
          'from a_index | where median_absolute_deviation(counterLongField) > 0',
          ['WHERE does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings(
          'from a_index | where median_absolute_deviation(counterDoubleField)',
          ['WHERE does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings(
          'from a_index | where median_absolute_deviation(counterDoubleField) > 0',
          ['WHERE does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings('from a_index | eval var = median_absolute_deviation(integerField)', [
          'EVAL does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = median_absolute_deviation(integerField) > 0',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings('from a_index | eval median_absolute_deviation(integerField)', [
          'EVAL does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings('from a_index | eval median_absolute_deviation(integerField) > 0', [
          'EVAL does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = median_absolute_deviation(counterIntegerField)',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = median_absolute_deviation(counterIntegerField) > 0',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings(
          'from a_index | eval median_absolute_deviation(counterIntegerField)',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings(
          'from a_index | eval median_absolute_deviation(counterIntegerField) > 0',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings('from a_index | eval var = median_absolute_deviation(doubleField)', [
          'EVAL does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = median_absolute_deviation(doubleField) > 0',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings('from a_index | eval median_absolute_deviation(doubleField)', [
          'EVAL does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings('from a_index | eval median_absolute_deviation(doubleField) > 0', [
          'EVAL does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = median_absolute_deviation(unsignedLongField)',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = median_absolute_deviation(unsignedLongField) > 0',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings('from a_index | eval median_absolute_deviation(unsignedLongField)', [
          'EVAL does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval median_absolute_deviation(unsignedLongField) > 0',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings('from a_index | eval var = median_absolute_deviation(longField)', [
          'EVAL does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = median_absolute_deviation(longField) > 0',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings('from a_index | eval median_absolute_deviation(longField)', [
          'EVAL does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings('from a_index | eval median_absolute_deviation(longField) > 0', [
          'EVAL does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = median_absolute_deviation(counterLongField)',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = median_absolute_deviation(counterLongField) > 0',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings('from a_index | eval median_absolute_deviation(counterLongField)', [
          'EVAL does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval median_absolute_deviation(counterLongField) > 0',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = median_absolute_deviation(counterDoubleField)',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = median_absolute_deviation(counterDoubleField) > 0',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings('from a_index | eval median_absolute_deviation(counterDoubleField)', [
          'EVAL does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval median_absolute_deviation(counterDoubleField) > 0',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings('from a_index | stats median_absolute_deviation(null)', []);
        testErrorsAndWarnings('row nullVar = null | stats median_absolute_deviation(nullVar)', []);
      });
      describe('max', () => {
        testErrorsAndWarnings('from a_index | stats var = max(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats max(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(max(doubleField))', []);
        testErrorsAndWarnings('from a_index | stats round(max(doubleField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(max(doubleField)) + max(doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(max(doubleField)) + max(doubleField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats max(doubleField / 2)', []);
        testErrorsAndWarnings('from a_index | stats var0 = max(doubleField / 2)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), max(doubleField / 2)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = max(doubleField / 2)',
          []
        );
        testErrorsAndWarnings('from a_index | stats var0 = max(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), max(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), var0 = max(doubleField)', []);
        testErrorsAndWarnings(
          'from a_index | stats max(doubleField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = max(doubleField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), max(doubleField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = max(doubleField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), max(doubleField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = max(doubleField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = max(avg(integerField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
        ]);

        testErrorsAndWarnings('from a_index | stats max(avg(integerField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
        ]);

        testErrorsAndWarnings('from a_index | stats max(cartesianPointField)', [
          'Argument of [max] must be [double], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | stats var = max(*)', [
          'Using wildcards (*) in max is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | stats var = max(longField)', []);
        testErrorsAndWarnings('from a_index | stats max(longField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(max(longField))', []);
        testErrorsAndWarnings('from a_index | stats round(max(longField))', []);
        testErrorsAndWarnings(
          'from a_index | stats var = round(max(longField)) + max(longField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats round(max(longField)) + max(longField)', []);
        testErrorsAndWarnings('from a_index | stats var0 = max(longField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), max(longField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), var0 = max(longField)', []);
        testErrorsAndWarnings('from a_index | stats max(longField) by round(doubleField / 2)', []);

        testErrorsAndWarnings(
          'from a_index | stats var0 = max(longField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), max(longField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = max(longField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), max(longField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = max(longField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = max(integerField)', []);
        testErrorsAndWarnings('from a_index | stats max(integerField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(max(integerField))', []);
        testErrorsAndWarnings('from a_index | stats round(max(integerField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(max(integerField)) + max(integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(max(integerField)) + max(integerField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats var0 = max(integerField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), max(integerField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = max(integerField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | stats max(integerField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = max(integerField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), max(integerField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = max(integerField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), max(integerField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = max(integerField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = max(dateField)', []);
        testErrorsAndWarnings('from a_index | stats max(dateField)', []);
        testErrorsAndWarnings('from a_index | stats var = max(booleanField)', []);
        testErrorsAndWarnings('from a_index | stats max(booleanField)', []);
        testErrorsAndWarnings('from a_index | stats var = max(ipField)', []);
        testErrorsAndWarnings('from a_index | stats max(ipField)', []);

        testErrorsAndWarnings('from a_index | sort max(doubleField)', [
          'SORT does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(doubleField)', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(doubleField) > 0', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(longField)', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(longField) > 0', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(integerField)', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(integerField) > 0', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(dateField)', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(dateField) > 0', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(booleanField)', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(booleanField) > 0', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(ipField)', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(ipField) > 0', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval var = max(doubleField)', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval var = max(doubleField) > 0', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval max(doubleField)', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval max(doubleField) > 0', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval var = max(longField)', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval var = max(longField) > 0', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval max(longField)', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval max(longField) > 0', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval var = max(integerField)', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval var = max(integerField) > 0', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval max(integerField)', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval max(integerField) > 0', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval var = max(dateField)', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval var = max(dateField) > 0', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval max(dateField)', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval max(dateField) > 0', [
          'EVAL does not support function max',
        ]);
        testErrorsAndWarnings('from a_index | eval var = max(booleanField)', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval var = max(booleanField) > 0', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval max(booleanField)', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval max(booleanField) > 0', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval var = max(ipField)', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval var = max(ipField) > 0', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval max(ipField)', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval max(ipField) > 0', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | stats max(null)', []);
        testErrorsAndWarnings('row nullVar = null | stats max(nullVar)', []);
        testErrorsAndWarnings('from a_index | stats max("2022")', []);
        testErrorsAndWarnings('from a_index | stats max(concat("20", "22"))', [
          'Argument of [max] must be [double], found value [concat("20","22")] type [keyword]',
        ]);
      });

      describe('min', () => {
        testErrorsAndWarnings('from a_index | stats var = min(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats min(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(min(doubleField))', []);
        testErrorsAndWarnings('from a_index | stats round(min(doubleField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(min(doubleField)) + min(doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(min(doubleField)) + min(doubleField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats min(doubleField / 2)', []);
        testErrorsAndWarnings('from a_index | stats var0 = min(doubleField / 2)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), min(doubleField / 2)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = min(doubleField / 2)',
          []
        );
        testErrorsAndWarnings('from a_index | stats var0 = min(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), min(doubleField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), var0 = min(doubleField)', []);
        testErrorsAndWarnings(
          'from a_index | stats min(doubleField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = min(doubleField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), min(doubleField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = min(doubleField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), min(doubleField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = min(doubleField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = min(avg(integerField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
        ]);

        testErrorsAndWarnings('from a_index | stats min(avg(integerField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
        ]);

        testErrorsAndWarnings('from a_index | stats min(cartesianPointField)', [
          'Argument of [min] must be [double], found value [cartesianPointField] type [cartesian_point]',
        ]);

        testErrorsAndWarnings('from a_index | stats var = min(*)', [
          'Using wildcards (*) in min is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | stats var = min(longField)', []);
        testErrorsAndWarnings('from a_index | stats min(longField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(min(longField))', []);
        testErrorsAndWarnings('from a_index | stats round(min(longField))', []);
        testErrorsAndWarnings(
          'from a_index | stats var = round(min(longField)) + min(longField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats round(min(longField)) + min(longField)', []);
        testErrorsAndWarnings('from a_index | stats var0 = min(longField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), min(longField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), var0 = min(longField)', []);
        testErrorsAndWarnings('from a_index | stats min(longField) by round(doubleField / 2)', []);

        testErrorsAndWarnings(
          'from a_index | stats var0 = min(longField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), min(longField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = min(longField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), min(longField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = min(longField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = min(integerField)', []);
        testErrorsAndWarnings('from a_index | stats min(integerField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(min(integerField))', []);
        testErrorsAndWarnings('from a_index | stats round(min(integerField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(min(integerField)) + min(integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(min(integerField)) + min(integerField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats var0 = min(integerField)', []);
        testErrorsAndWarnings('from a_index | stats avg(doubleField), min(integerField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = min(integerField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | stats min(integerField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = min(integerField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), min(integerField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = min(integerField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), min(integerField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = min(integerField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = min(dateField)', []);
        testErrorsAndWarnings('from a_index | stats min(dateField)', []);
        testErrorsAndWarnings('from a_index | stats var = min(booleanField)', []);
        testErrorsAndWarnings('from a_index | stats min(booleanField)', []);
        testErrorsAndWarnings('from a_index | stats var = min(ipField)', []);
        testErrorsAndWarnings('from a_index | stats min(ipField)', []);

        testErrorsAndWarnings('from a_index | sort min(doubleField)', [
          'SORT does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(doubleField)', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(doubleField) > 0', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(longField)', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(longField) > 0', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(integerField)', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(integerField) > 0', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(dateField)', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(dateField) > 0', [
          'WHERE does not support function min',
        ]);
        testErrorsAndWarnings('from a_index | where min(booleanField)', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(booleanField) > 0', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(ipField)', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(ipField) > 0', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval var = min(doubleField)', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval var = min(doubleField) > 0', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval min(doubleField)', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval min(doubleField) > 0', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval var = min(longField)', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval var = min(longField) > 0', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval min(longField)', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval min(longField) > 0', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval var = min(integerField)', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval var = min(integerField) > 0', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval min(integerField)', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval min(integerField) > 0', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval var = min(dateField)', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval var = min(dateField) > 0', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval min(dateField)', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval min(dateField) > 0', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval var = min(booleanField)', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval var = min(booleanField) > 0', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval min(booleanField)', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval min(booleanField) > 0', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval var = min(ipField)', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval var = min(ipField) > 0', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval min(ipField)', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval min(ipField) > 0', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | stats min(null)', []);
        testErrorsAndWarnings('row nullVar = null | stats min(nullVar)', []);
        testErrorsAndWarnings('from a_index | stats min("2022")', []);
        testErrorsAndWarnings('from a_index | stats min(concat("20", "22"))', [
          'Argument of [min] must be [double], found value [concat("20","22")] type [keyword]',
        ]);
      });

      describe('count', () => {
        testErrorsAndWarnings('from a_index | stats var = count(textField)', []);
        testErrorsAndWarnings('from a_index | stats count(textField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(count(textField))', []);
        testErrorsAndWarnings('from a_index | stats round(count(textField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(count(textField)) + count(textField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(count(textField)) + count(textField)',
          []
        );

        testErrorsAndWarnings('from a_index | sort count(textField)', [
          'SORT does not support function count',
        ]);

        testErrorsAndWarnings('from a_index | where count(textField)', [
          'WHERE does not support function count',
        ]);

        testErrorsAndWarnings('from a_index | where count(textField) > 0', [
          'WHERE does not support function count',
        ]);

        testErrorsAndWarnings('from a_index | eval var = count(textField)', [
          'EVAL does not support function count',
        ]);

        testErrorsAndWarnings('from a_index | eval var = count(textField) > 0', [
          'EVAL does not support function count',
        ]);

        testErrorsAndWarnings('from a_index | eval count(textField)', [
          'EVAL does not support function count',
        ]);

        testErrorsAndWarnings('from a_index | eval count(textField) > 0', [
          'EVAL does not support function count',
        ]);

        testErrorsAndWarnings('from a_index | stats count(null)', []);
        testErrorsAndWarnings('row nullVar = null | stats count(nullVar)', []);
      });

      describe('count_distinct', () => {
        testErrorsAndWarnings(
          'from a_index | stats count_distinct(null, null, null, null, null, null, null, null)',
          []
        );

        testErrorsAndWarnings(
          'row nullVar = null | stats count_distinct(nullVar, nullVar, nullVar, nullVar, nullVar, nullVar, nullVar, nullVar)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField)) + count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField)) + count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | sort count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField)',
          ['SORT does not support function count_distinct']
        );

        testErrorsAndWarnings(
          'from a_index | where count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField)',
          ['WHERE does not support function count_distinct']
        );

        testErrorsAndWarnings(
          'from a_index | where count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField) > 0',
          ['WHERE does not support function count_distinct']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField)',
          ['EVAL does not support function count_distinct']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField) > 0',
          ['EVAL does not support function count_distinct']
        );

        testErrorsAndWarnings(
          'from a_index | eval count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField)',
          ['EVAL does not support function count_distinct']
        );

        testErrorsAndWarnings(
          'from a_index | eval count_distinct(textField, integerField, counterIntegerField, doubleField, unsignedLongField, longField, counterLongField, counterDoubleField) > 0',
          ['EVAL does not support function count_distinct']
        );
      });

      describe('st_centroid_agg', () => {
        testErrorsAndWarnings(
          'from a_index | stats var = st_centroid_agg(cartesianPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats st_centroid_agg(cartesianPointField)', []);

        testErrorsAndWarnings('from a_index | stats var = st_centroid_agg(avg(integerField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
        ]);

        testErrorsAndWarnings('from a_index | stats st_centroid_agg(avg(integerField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
        ]);

        testErrorsAndWarnings('from a_index | stats st_centroid_agg(booleanField)', [
          'Argument of [st_centroid_agg] must be [cartesian_point], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | stats var = st_centroid_agg(*)', [
          'Using wildcards (*) in st_centroid_agg is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | stats var = st_centroid_agg(geoPointField)', []);
        testErrorsAndWarnings('from a_index | stats st_centroid_agg(geoPointField)', []);

        testErrorsAndWarnings('from a_index | sort st_centroid_agg(cartesianPointField)', [
          'SORT does not support function st_centroid_agg',
        ]);

        testErrorsAndWarnings('from a_index | where st_centroid_agg(cartesianPointField)', [
          'WHERE does not support function st_centroid_agg',
        ]);

        testErrorsAndWarnings('from a_index | where st_centroid_agg(cartesianPointField) > 0', [
          'WHERE does not support function st_centroid_agg',
        ]);

        testErrorsAndWarnings('from a_index | where st_centroid_agg(geoPointField)', [
          'WHERE does not support function st_centroid_agg',
        ]);

        testErrorsAndWarnings('from a_index | where st_centroid_agg(geoPointField) > 0', [
          'WHERE does not support function st_centroid_agg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = st_centroid_agg(cartesianPointField)', [
          'EVAL does not support function st_centroid_agg',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = st_centroid_agg(cartesianPointField) > 0',
          ['EVAL does not support function st_centroid_agg']
        );

        testErrorsAndWarnings('from a_index | eval st_centroid_agg(cartesianPointField)', [
          'EVAL does not support function st_centroid_agg',
        ]);

        testErrorsAndWarnings('from a_index | eval st_centroid_agg(cartesianPointField) > 0', [
          'EVAL does not support function st_centroid_agg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = st_centroid_agg(geoPointField)', [
          'EVAL does not support function st_centroid_agg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = st_centroid_agg(geoPointField) > 0', [
          'EVAL does not support function st_centroid_agg',
        ]);

        testErrorsAndWarnings('from a_index | eval st_centroid_agg(geoPointField)', [
          'EVAL does not support function st_centroid_agg',
        ]);

        testErrorsAndWarnings('from a_index | eval st_centroid_agg(geoPointField) > 0', [
          'EVAL does not support function st_centroid_agg',
        ]);

        testErrorsAndWarnings('from a_index | stats st_centroid_agg(null)', []);
        testErrorsAndWarnings('row nullVar = null | stats st_centroid_agg(nullVar)', []);
      });

      describe('values', () => {
        testErrorsAndWarnings('from a_index | stats var = values(textField)', []);
        testErrorsAndWarnings('from a_index | stats values(textField)', []);

        testErrorsAndWarnings('from a_index | sort values(textField)', [
          'SORT does not support function values',
        ]);

        testErrorsAndWarnings('from a_index | where values(textField)', [
          'WHERE does not support function values',
        ]);

        testErrorsAndWarnings('from a_index | where values(textField) > 0', [
          'WHERE does not support function values',
        ]);

        testErrorsAndWarnings('from a_index | eval var = values(textField)', [
          'EVAL does not support function values',
        ]);

        testErrorsAndWarnings('from a_index | eval var = values(textField) > 0', [
          'EVAL does not support function values',
        ]);

        testErrorsAndWarnings('from a_index | eval values(textField)', [
          'EVAL does not support function values',
        ]);

        testErrorsAndWarnings('from a_index | eval values(textField) > 0', [
          'EVAL does not support function values',
        ]);

        testErrorsAndWarnings('from a_index | stats values(null)', []);
        testErrorsAndWarnings('row nullVar = null | stats values(nullVar)', []);
      });

      describe('top', () => {
        testErrorsAndWarnings(
          'from a_index | stats var = top(textField, integerField, textField)',
          ['Argument of [=] must be a constant, received [top(textField,integerField,textField)]']
        );

        testErrorsAndWarnings('from a_index | stats top(textField, integerField, textField)', [
          'Argument of [top] must be a constant, received [integerField]',
          'Argument of [top] must be a constant, received [textField]',
        ]);

        testErrorsAndWarnings('from a_index | sort top(textField, integerField, textField)', [
          'SORT does not support function top',
        ]);

        testErrorsAndWarnings('from a_index | where top(textField, integerField, textField)', [
          'WHERE does not support function top',
        ]);

        testErrorsAndWarnings('from a_index | where top(textField, integerField, textField) > 0', [
          'WHERE does not support function top',
        ]);

        testErrorsAndWarnings('from a_index | eval var = top(textField, integerField, textField)', [
          'EVAL does not support function top',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = top(textField, integerField, textField) > 0',
          ['EVAL does not support function top']
        );

        testErrorsAndWarnings('from a_index | eval top(textField, integerField, textField)', [
          'EVAL does not support function top',
        ]);

        testErrorsAndWarnings('from a_index | eval top(textField, integerField, textField) > 0', [
          'EVAL does not support function top',
        ]);

        testErrorsAndWarnings('from a_index | stats top(null, null, null)', []);
        testErrorsAndWarnings('row nullVar = null | stats top(nullVar, nullVar, nullVar)', [
          'Argument of [top] must be a constant, received [nullVar]',
          'Argument of [top] must be a constant, received [nullVar]',
        ]);
        testErrorsAndWarnings('from a_index | stats var = top(textField, integerField, "asc")', [
          'Argument of [=] must be a constant, received [top(textField,integerField,"asc")]',
        ]);

        testErrorsAndWarnings('from a_index | stats top(textField, integerField, "asc")', [
          'Argument of [top] must be a constant, received [integerField]',
        ]);

        testErrorsAndWarnings('from a_index | sort top(textField, integerField, "asc")', [
          'SORT does not support function top',
        ]);

        testErrorsAndWarnings('from a_index | where top(textField, integerField, "asc")', [
          'WHERE does not support function top',
        ]);

        testErrorsAndWarnings('from a_index | where top(textField, integerField, "asc") > 0', [
          'WHERE does not support function top',
        ]);

        testErrorsAndWarnings('from a_index | eval var = top(textField, integerField, "asc")', [
          'EVAL does not support function top',
        ]);

        testErrorsAndWarnings('from a_index | eval var = top(textField, integerField, "asc") > 0', [
          'EVAL does not support function top',
        ]);

        testErrorsAndWarnings('from a_index | eval top(textField, integerField, "asc")', [
          'EVAL does not support function top',
        ]);

        testErrorsAndWarnings('from a_index | eval top(textField, integerField, "asc") > 0', [
          'EVAL does not support function top',
        ]);
      });

      describe('weighted_avg', () => {
        testErrorsAndWarnings(
          'from a_index | stats var = weighted_avg(doubleField, doubleField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats weighted_avg(doubleField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(doubleField, doubleField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(doubleField, doubleField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(doubleField, doubleField)) + weighted_avg(doubleField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(doubleField, doubleField)) + weighted_avg(doubleField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats weighted_avg(doubleField / 2, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(doubleField / 2, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(doubleField / 2, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(doubleField / 2, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(doubleField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(doubleField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(doubleField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats weighted_avg(doubleField, doubleField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(doubleField, doubleField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(doubleField, doubleField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(doubleField, doubleField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(doubleField, doubleField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(doubleField, doubleField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = weighted_avg(avg(integerField), avg(integerField))',
          [
            "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
            "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats weighted_avg(avg(integerField), avg(integerField))',
          [
            "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
            "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
          ]
        );

        testErrorsAndWarnings('from a_index | stats weighted_avg(booleanField, booleanField)', [
          'Argument of [weighted_avg] must be [double], found value [booleanField] type [boolean]',
          'Argument of [weighted_avg] must be [double], found value [booleanField] type [boolean]',
        ]);

        testErrorsAndWarnings('from a_index | sort weighted_avg(doubleField, doubleField)', [
          'SORT does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(doubleField, doubleField)', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(doubleField, doubleField) > 0', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = weighted_avg(doubleField, doubleField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = weighted_avg(doubleField, doubleField) > 0',
          ['EVAL does not support function weighted_avg']
        );

        testErrorsAndWarnings('from a_index | eval weighted_avg(doubleField, doubleField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval weighted_avg(doubleField, doubleField) > 0', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | stats weighted_avg(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | stats weighted_avg(nullVar, nullVar)', []);
        testErrorsAndWarnings(
          'from a_index | stats var = weighted_avg(doubleField, longField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats weighted_avg(doubleField, longField)', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(doubleField, longField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(doubleField, longField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(doubleField, longField)) + weighted_avg(doubleField, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(doubleField, longField)) + weighted_avg(doubleField, longField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats weighted_avg(doubleField / 2, longField)', []);
        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(doubleField / 2, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(doubleField / 2, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(doubleField / 2, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(doubleField, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(doubleField, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(doubleField, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats weighted_avg(doubleField, longField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(doubleField, longField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(doubleField, longField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(doubleField, longField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(doubleField, longField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(doubleField, longField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = weighted_avg(doubleField, integerField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats weighted_avg(doubleField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(doubleField, integerField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(doubleField, integerField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(doubleField, integerField)) + weighted_avg(doubleField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(doubleField, integerField)) + weighted_avg(doubleField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats weighted_avg(doubleField / 2, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(doubleField / 2, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(doubleField / 2, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(doubleField / 2, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(doubleField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(doubleField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(doubleField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats weighted_avg(doubleField, integerField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(doubleField, integerField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(doubleField, integerField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(doubleField, integerField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(doubleField, integerField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(doubleField, integerField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = weighted_avg(longField, doubleField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats weighted_avg(longField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(longField, doubleField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(longField, doubleField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(longField, doubleField)) + weighted_avg(longField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(longField, doubleField)) + weighted_avg(longField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(longField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(longField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(longField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats weighted_avg(longField, doubleField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(longField, doubleField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(longField, doubleField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(longField, doubleField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(longField, doubleField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(longField, doubleField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = weighted_avg(longField, longField)', []);
        testErrorsAndWarnings('from a_index | stats weighted_avg(longField, longField)', []);
        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(longField, longField))',
          []
        );
        testErrorsAndWarnings('from a_index | stats round(weighted_avg(longField, longField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(longField, longField)) + weighted_avg(longField, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(longField, longField)) + weighted_avg(longField, longField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = weighted_avg(longField, longField)', []);

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(longField, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(longField, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats weighted_avg(longField, longField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(longField, longField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(longField, longField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(longField, longField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(longField, longField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(longField, longField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = weighted_avg(longField, integerField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats weighted_avg(longField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(longField, integerField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(longField, integerField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(longField, integerField)) + weighted_avg(longField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(longField, integerField)) + weighted_avg(longField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(longField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(longField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(longField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats weighted_avg(longField, integerField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(longField, integerField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(longField, integerField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(longField, integerField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(longField, integerField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(longField, integerField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = weighted_avg(integerField, doubleField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats weighted_avg(integerField, doubleField)', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(integerField, doubleField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(integerField, doubleField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(integerField, doubleField)) + weighted_avg(integerField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(integerField, doubleField)) + weighted_avg(integerField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(integerField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(integerField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(integerField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats weighted_avg(integerField, doubleField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(integerField, doubleField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(integerField, doubleField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(integerField, doubleField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(integerField, doubleField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(integerField, doubleField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = weighted_avg(integerField, longField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats weighted_avg(integerField, longField)', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(integerField, longField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(integerField, longField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(integerField, longField)) + weighted_avg(integerField, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(integerField, longField)) + weighted_avg(integerField, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(integerField, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(integerField, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(integerField, longField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats weighted_avg(integerField, longField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(integerField, longField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(integerField, longField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(integerField, longField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(integerField, longField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(integerField, longField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = weighted_avg(integerField, integerField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats weighted_avg(integerField, integerField)', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(integerField, integerField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(integerField, integerField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(weighted_avg(integerField, integerField)) + weighted_avg(integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(weighted_avg(integerField, integerField)) + weighted_avg(integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(integerField, integerField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats weighted_avg(integerField, integerField) by round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = weighted_avg(integerField, integerField) by var1 = round(doubleField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(integerField, integerField) by round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(integerField, integerField) by var1 = round(doubleField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), weighted_avg(integerField, integerField) by round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = weighted_avg(integerField, integerField) by var1 = round(doubleField / 2), doubleField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | where weighted_avg(doubleField, longField)', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(doubleField, longField) > 0', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(doubleField, integerField)', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(doubleField, integerField) > 0', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(longField, doubleField)', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(longField, doubleField) > 0', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(longField, longField)', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(longField, longField) > 0', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(longField, integerField)', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(longField, integerField) > 0', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(integerField, doubleField)', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(integerField, doubleField) > 0', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(integerField, longField)', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(integerField, longField) > 0', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(integerField, integerField)', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | where weighted_avg(integerField, integerField) > 0', [
          'WHERE does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = weighted_avg(doubleField, longField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = weighted_avg(doubleField, longField) > 0',
          ['EVAL does not support function weighted_avg']
        );

        testErrorsAndWarnings('from a_index | eval weighted_avg(doubleField, longField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval weighted_avg(doubleField, longField) > 0', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = weighted_avg(doubleField, integerField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = weighted_avg(doubleField, integerField) > 0',
          ['EVAL does not support function weighted_avg']
        );

        testErrorsAndWarnings('from a_index | eval weighted_avg(doubleField, integerField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval weighted_avg(doubleField, integerField) > 0', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = weighted_avg(longField, doubleField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = weighted_avg(longField, doubleField) > 0',
          ['EVAL does not support function weighted_avg']
        );

        testErrorsAndWarnings('from a_index | eval weighted_avg(longField, doubleField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval weighted_avg(longField, doubleField) > 0', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = weighted_avg(longField, longField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = weighted_avg(longField, longField) > 0', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval weighted_avg(longField, longField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval weighted_avg(longField, longField) > 0', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = weighted_avg(longField, integerField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = weighted_avg(longField, integerField) > 0',
          ['EVAL does not support function weighted_avg']
        );

        testErrorsAndWarnings('from a_index | eval weighted_avg(longField, integerField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval weighted_avg(longField, integerField) > 0', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = weighted_avg(integerField, doubleField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = weighted_avg(integerField, doubleField) > 0',
          ['EVAL does not support function weighted_avg']
        );

        testErrorsAndWarnings('from a_index | eval weighted_avg(integerField, doubleField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval weighted_avg(integerField, doubleField) > 0', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = weighted_avg(integerField, longField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = weighted_avg(integerField, longField) > 0',
          ['EVAL does not support function weighted_avg']
        );

        testErrorsAndWarnings('from a_index | eval weighted_avg(integerField, longField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval weighted_avg(integerField, longField) > 0', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = weighted_avg(integerField, integerField)',
          ['EVAL does not support function weighted_avg']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = weighted_avg(integerField, integerField) > 0',
          ['EVAL does not support function weighted_avg']
        );

        testErrorsAndWarnings('from a_index | eval weighted_avg(integerField, integerField)', [
          'EVAL does not support function weighted_avg',
        ]);

        testErrorsAndWarnings('from a_index | eval weighted_avg(integerField, integerField) > 0', [
          'EVAL does not support function weighted_avg',
        ]);
      });

      describe('bucket', () => {
        testErrorsAndWarnings('from a_index | stats by bucket(dateField, 1 year)', []);
        testErrorsAndWarnings('from a_index | stats by bin(dateField, 1 year)', []);

        testErrorsAndWarnings('from a_index | stats by bucket(integerField, integerField)', [
          'Argument of [bucket] must be a constant, received [integerField]',
        ]);

        testErrorsAndWarnings('from a_index | stats by bin(integerField, integerField)', [
          'Argument of [bin] must be a constant, received [integerField]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats by bucket(dateField, integerField, textField, textField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [textField]',
            'Argument of [bucket] must be a constant, received [textField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(dateField, integerField, textField, textField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [textField]',
            'Argument of [bin] must be a constant, received [textField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(dateField, integerField, dateField, dateField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [dateField]',
            'Argument of [bucket] must be a constant, received [dateField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(dateField, integerField, dateField, dateField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [dateField]',
            'Argument of [bin] must be a constant, received [dateField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(dateField, integerField, textField, dateField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [textField]',
            'Argument of [bucket] must be a constant, received [dateField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(dateField, integerField, textField, dateField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [textField]',
            'Argument of [bin] must be a constant, received [dateField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(dateField, integerField, dateField, textField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [dateField]',
            'Argument of [bucket] must be a constant, received [textField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(dateField, integerField, dateField, textField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [dateField]',
            'Argument of [bin] must be a constant, received [textField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(integerField, integerField, integerField, integerField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(integerField, integerField, integerField, integerField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings('from a_index | sort bucket(dateField, 1 year)', [
          'SORT does not support function bucket',
        ]);

        testErrorsAndWarnings('from a_index | stats bucket(null, null, null, null)', []);

        testErrorsAndWarnings(
          'row nullVar = null | stats bucket(nullVar, nullVar, nullVar, nullVar)',
          [
            'Argument of [bucket] must be a constant, received [nullVar]',
            'Argument of [bucket] must be a constant, received [nullVar]',
            'Argument of [bucket] must be a constant, received [nullVar]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats bucket("2022", 1 year)', []);
        testErrorsAndWarnings('from a_index | stats bucket(concat("20", "22"), 1 year)', [
          'Argument of [bucket] must be [date], found value [concat("20","22")] type [keyword]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats bucket("2022", integerField, textField, textField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [textField]',
            'Argument of [bucket] must be a constant, received [textField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats bucket(concat("20", "22"), integerField, textField, textField)',
          [
            'Argument of [bucket] must be [date], found value [concat("20","22")] type [keyword]',
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [textField]',
            'Argument of [bucket] must be a constant, received [textField]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats bucket("2022", integerField, "2022", "2022")', [
          'Argument of [bucket] must be a constant, received [integerField]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats bucket(concat("20", "22"), integerField, concat("20", "22"), concat("20", "22"))',
          [
            'Argument of [bucket] must be [date], found value [concat("20","22")] type [keyword]',
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be [date], found value [concat("20","22")] type [keyword]',
            'Argument of [bucket] must be [date], found value [concat("20","22")] type [keyword]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats bucket("2022", integerField, textField, "2022")',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [textField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats bucket(concat("20", "22"), integerField, textField, concat("20", "22"))',
          [
            'Argument of [bucket] must be [date], found value [concat("20","22")] type [keyword]',
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [textField]',
            'Argument of [bucket] must be [date], found value [concat("20","22")] type [keyword]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats bucket("2022", integerField, "2022", textField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [textField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats bucket(concat("20", "22"), integerField, concat("20", "22"), textField)',
          [
            'Argument of [bucket] must be [date], found value [concat("20","22")] type [keyword]',
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be [date], found value [concat("20","22")] type [keyword]',
            'Argument of [bucket] must be a constant, received [textField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(dateField, integerField, now(), now())',
          ['Argument of [bucket] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(dateField, integerField, now(), now())',
          ['Argument of [bin] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings('from a_index | stats by bucket(doubleField, doubleField)', [
          'Argument of [bucket] must be a constant, received [doubleField]',
        ]);

        testErrorsAndWarnings('from a_index | stats by bin(doubleField, doubleField)', [
          'Argument of [bin] must be a constant, received [doubleField]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats by bucket(doubleField, integerField, doubleField, doubleField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(doubleField, integerField, doubleField, doubleField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [doubleField]',
            'Argument of [bin] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(doubleField, integerField, doubleField, integerField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
            'Argument of [bucket] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(doubleField, integerField, doubleField, integerField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [doubleField]',
            'Argument of [bin] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(doubleField, integerField, doubleField, longField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
            'Argument of [bucket] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(doubleField, integerField, doubleField, longField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [doubleField]',
            'Argument of [bin] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(doubleField, integerField, integerField, doubleField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(doubleField, integerField, integerField, doubleField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(doubleField, integerField, integerField, integerField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(doubleField, integerField, integerField, integerField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(doubleField, integerField, integerField, longField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(doubleField, integerField, integerField, longField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(doubleField, integerField, longField, doubleField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [longField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(doubleField, integerField, longField, doubleField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [longField]',
            'Argument of [bin] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(doubleField, integerField, longField, integerField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [longField]',
            'Argument of [bucket] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(doubleField, integerField, longField, integerField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [longField]',
            'Argument of [bin] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(doubleField, integerField, longField, longField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [longField]',
            'Argument of [bucket] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(doubleField, integerField, longField, longField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [longField]',
            'Argument of [bin] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats by bucket(integerField, doubleField)', [
          'Argument of [bucket] must be a constant, received [doubleField]',
        ]);

        testErrorsAndWarnings('from a_index | stats by bin(integerField, doubleField)', [
          'Argument of [bin] must be a constant, received [doubleField]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats by bucket(integerField, integerField, doubleField, doubleField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(integerField, integerField, doubleField, doubleField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [doubleField]',
            'Argument of [bin] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(integerField, integerField, doubleField, integerField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
            'Argument of [bucket] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(integerField, integerField, doubleField, integerField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [doubleField]',
            'Argument of [bin] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(integerField, integerField, doubleField, longField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
            'Argument of [bucket] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(integerField, integerField, doubleField, longField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [doubleField]',
            'Argument of [bin] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(integerField, integerField, integerField, doubleField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(integerField, integerField, integerField, doubleField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(integerField, integerField, integerField, longField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(integerField, integerField, integerField, longField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(integerField, integerField, longField, doubleField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [longField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(integerField, integerField, longField, doubleField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [longField]',
            'Argument of [bin] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(integerField, integerField, longField, integerField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [longField]',
            'Argument of [bucket] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(integerField, integerField, longField, integerField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [longField]',
            'Argument of [bin] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(integerField, integerField, longField, longField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [longField]',
            'Argument of [bucket] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(integerField, integerField, longField, longField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [longField]',
            'Argument of [bin] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats by bucket(longField, doubleField)', [
          'Argument of [bucket] must be a constant, received [doubleField]',
        ]);

        testErrorsAndWarnings('from a_index | stats by bin(longField, doubleField)', [
          'Argument of [bin] must be a constant, received [doubleField]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats by bucket(longField, integerField, doubleField, doubleField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(longField, integerField, doubleField, doubleField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [doubleField]',
            'Argument of [bin] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(longField, integerField, doubleField, integerField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
            'Argument of [bucket] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(longField, integerField, doubleField, integerField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [doubleField]',
            'Argument of [bin] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(longField, integerField, doubleField, longField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
            'Argument of [bucket] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(longField, integerField, doubleField, longField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [doubleField]',
            'Argument of [bin] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(longField, integerField, integerField, doubleField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(longField, integerField, integerField, doubleField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(longField, integerField, integerField, integerField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(longField, integerField, integerField, integerField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(longField, integerField, integerField, longField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(longField, integerField, integerField, longField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(longField, integerField, longField, doubleField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [longField]',
            'Argument of [bucket] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(longField, integerField, longField, doubleField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [longField]',
            'Argument of [bin] must be a constant, received [doubleField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(longField, integerField, longField, integerField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [longField]',
            'Argument of [bucket] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(longField, integerField, longField, integerField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [longField]',
            'Argument of [bin] must be a constant, received [integerField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bucket(longField, integerField, longField, longField)',
          [
            'Argument of [bucket] must be a constant, received [integerField]',
            'Argument of [bucket] must be a constant, received [longField]',
            'Argument of [bucket] must be a constant, received [longField]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats by bin(longField, integerField, longField, longField)',
          [
            'Argument of [bin] must be a constant, received [integerField]',
            'Argument of [bin] must be a constant, received [longField]',
            'Argument of [bin] must be a constant, received [longField]',
          ]
        );
      });

      describe('percentile', () => {
        testErrorsAndWarnings('from a_index | stats var = percentile(doubleField, doubleField)', [
          'Argument of [=] must be a constant, received [percentile(doubleField,doubleField)]',
        ]);
        testErrorsAndWarnings('from a_index | stats percentile(doubleField, doubleField)', [
          'Argument of [percentile] must be a constant, received [doubleField]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(doubleField, doubleField))',
          [
            'Argument of [=] must be a constant, received [round(percentile(doubleField,doubleField))]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats round(percentile(doubleField, doubleField))', [
          'Argument of [round] must be a constant, received [percentile(doubleField,doubleField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(doubleField, doubleField)) + percentile(doubleField, doubleField)',
          [
            'Argument of [=] must be a constant, received [round(percentile(doubleField,doubleField))+percentile(doubleField,doubleField)]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats round(percentile(doubleField, doubleField)) + percentile(doubleField, doubleField)',
          [
            'Argument of [+] must be a constant, received [round(percentile(doubleField,doubleField))]',
            'Argument of [+] must be a constant, received [percentile(doubleField,doubleField)]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats percentile(doubleField / 2, doubleField)', [
          'Argument of [percentile] must be a constant, received [doubleField]',
        ]);
        testErrorsAndWarnings(
          'from a_index | stats var0 = percentile(doubleField / 2, doubleField)',
          ['Argument of [=] must be a constant, received [percentile(doubleField/2,doubleField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(doubleField / 2, doubleField)',
          ['Argument of [percentile] must be a constant, received [doubleField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(doubleField / 2, doubleField)',
          ['Argument of [=] must be a constant, received [percentile(doubleField/2,doubleField)]']
        );

        testErrorsAndWarnings('from a_index | stats var0 = percentile(doubleField, doubleField)', [
          'Argument of [=] must be a constant, received [percentile(doubleField,doubleField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(doubleField, doubleField)',
          ['Argument of [percentile] must be a constant, received [doubleField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(doubleField, doubleField)',
          ['Argument of [=] must be a constant, received [percentile(doubleField,doubleField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats percentile(doubleField, doubleField) by round(doubleField / 2)',
          ['Argument of [percentile] must be a constant, received [doubleField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = percentile(doubleField, doubleField) by var1 = round(doubleField / 2)',
          ['Argument of [=] must be a constant, received [percentile(doubleField,doubleField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(doubleField, doubleField) by round(doubleField / 2), ipField',
          ['Argument of [percentile] must be a constant, received [doubleField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(doubleField, doubleField) by var1 = round(doubleField / 2), ipField',
          ['Argument of [=] must be a constant, received [percentile(doubleField,doubleField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(doubleField, doubleField) by round(doubleField / 2), doubleField / 2',
          ['Argument of [percentile] must be a constant, received [doubleField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(doubleField, doubleField) by var1 = round(doubleField / 2), doubleField / 2',
          ['Argument of [=] must be a constant, received [percentile(doubleField,doubleField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats var = percentile(avg(integerField), avg(integerField))',
          [
            'Argument of [=] must be a constant, received [percentile(avg(integerField),avg(integerField))]',
            "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats percentile(avg(integerField), avg(integerField))',
          [
            'Argument of [percentile] must be a constant, received [avg(integerField)]',
            "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(integerField)] of type [double]",
          ]
        );

        testErrorsAndWarnings('from a_index | stats percentile(booleanField, )', [
          "SyntaxError: no viable alternative at input 'percentile(booleanField, )'",
          "SyntaxError: mismatched input ')' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
          'At least one aggregation or grouping expression required in [STATS]',
        ]);

        testErrorsAndWarnings('from a_index | stats var = percentile(doubleField, longField)', [
          'Argument of [=] must be a constant, received [percentile(doubleField,longField)]',
        ]);
        testErrorsAndWarnings('from a_index | stats percentile(doubleField, longField)', [
          'Argument of [percentile] must be a constant, received [longField]',
        ]);
        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(doubleField, longField))',
          [
            'Argument of [=] must be a constant, received [round(percentile(doubleField,longField))]',
          ]
        );
        testErrorsAndWarnings('from a_index | stats round(percentile(doubleField, longField))', [
          'Argument of [round] must be a constant, received [percentile(doubleField,longField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(doubleField, longField)) + percentile(doubleField, longField)',
          [
            'Argument of [=] must be a constant, received [round(percentile(doubleField,longField))+percentile(doubleField,longField)]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats round(percentile(doubleField, longField)) + percentile(doubleField, longField)',
          [
            'Argument of [+] must be a constant, received [round(percentile(doubleField,longField))]',
            'Argument of [+] must be a constant, received [percentile(doubleField,longField)]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats percentile(doubleField / 2, longField)', [
          'Argument of [percentile] must be a constant, received [longField]',
        ]);
        testErrorsAndWarnings(
          'from a_index | stats var0 = percentile(doubleField / 2, longField)',
          ['Argument of [=] must be a constant, received [percentile(doubleField/2,longField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(doubleField / 2, longField)',
          ['Argument of [percentile] must be a constant, received [longField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(doubleField / 2, longField)',
          ['Argument of [=] must be a constant, received [percentile(doubleField/2,longField)]']
        );

        testErrorsAndWarnings('from a_index | stats var0 = percentile(doubleField, longField)', [
          'Argument of [=] must be a constant, received [percentile(doubleField,longField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(doubleField, longField)',
          ['Argument of [percentile] must be a constant, received [longField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(doubleField, longField)',
          ['Argument of [=] must be a constant, received [percentile(doubleField,longField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats percentile(doubleField, longField) by round(doubleField / 2)',
          ['Argument of [percentile] must be a constant, received [longField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = percentile(doubleField, longField) by var1 = round(doubleField / 2)',
          ['Argument of [=] must be a constant, received [percentile(doubleField,longField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(doubleField, longField) by round(doubleField / 2), ipField',
          ['Argument of [percentile] must be a constant, received [longField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(doubleField, longField) by var1 = round(doubleField / 2), ipField',
          ['Argument of [=] must be a constant, received [percentile(doubleField,longField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(doubleField, longField) by round(doubleField / 2), doubleField / 2',
          ['Argument of [percentile] must be a constant, received [longField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(doubleField, longField) by var1 = round(doubleField / 2), doubleField / 2',
          ['Argument of [=] must be a constant, received [percentile(doubleField,longField)]']
        );

        testErrorsAndWarnings('from a_index | stats var = percentile(doubleField, integerField)', [
          'Argument of [=] must be a constant, received [percentile(doubleField,integerField)]',
        ]);
        testErrorsAndWarnings('from a_index | stats percentile(doubleField, integerField)', [
          'Argument of [percentile] must be a constant, received [integerField]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(doubleField, integerField))',
          [
            'Argument of [=] must be a constant, received [round(percentile(doubleField,integerField))]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats round(percentile(doubleField, integerField))', [
          'Argument of [round] must be a constant, received [percentile(doubleField,integerField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(doubleField, integerField)) + percentile(doubleField, integerField)',
          [
            'Argument of [=] must be a constant, received [round(percentile(doubleField,integerField))+percentile(doubleField,integerField)]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats round(percentile(doubleField, integerField)) + percentile(doubleField, integerField)',
          [
            'Argument of [+] must be a constant, received [round(percentile(doubleField,integerField))]',
            'Argument of [+] must be a constant, received [percentile(doubleField,integerField)]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats percentile(doubleField / 2, integerField)', [
          'Argument of [percentile] must be a constant, received [integerField]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var0 = percentile(doubleField / 2, integerField)',
          ['Argument of [=] must be a constant, received [percentile(doubleField/2,integerField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(doubleField / 2, integerField)',
          ['Argument of [percentile] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(doubleField / 2, integerField)',
          ['Argument of [=] must be a constant, received [percentile(doubleField/2,integerField)]']
        );

        testErrorsAndWarnings('from a_index | stats var0 = percentile(doubleField, integerField)', [
          'Argument of [=] must be a constant, received [percentile(doubleField,integerField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(doubleField, integerField)',
          ['Argument of [percentile] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(doubleField, integerField)',
          ['Argument of [=] must be a constant, received [percentile(doubleField,integerField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats percentile(doubleField, integerField) by round(doubleField / 2)',
          ['Argument of [percentile] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = percentile(doubleField, integerField) by var1 = round(doubleField / 2)',
          ['Argument of [=] must be a constant, received [percentile(doubleField,integerField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(doubleField, integerField) by round(doubleField / 2), ipField',
          ['Argument of [percentile] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(doubleField, integerField) by var1 = round(doubleField / 2), ipField',
          ['Argument of [=] must be a constant, received [percentile(doubleField,integerField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(doubleField, integerField) by round(doubleField / 2), doubleField / 2',
          ['Argument of [percentile] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(doubleField, integerField) by var1 = round(doubleField / 2), doubleField / 2',
          ['Argument of [=] must be a constant, received [percentile(doubleField,integerField)]']
        );

        testErrorsAndWarnings('from a_index | stats var = percentile(longField, doubleField)', [
          'Argument of [=] must be a constant, received [percentile(longField,doubleField)]',
        ]);
        testErrorsAndWarnings('from a_index | stats percentile(longField, doubleField)', [
          'Argument of [percentile] must be a constant, received [doubleField]',
        ]);
        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(longField, doubleField))',
          [
            'Argument of [=] must be a constant, received [round(percentile(longField,doubleField))]',
          ]
        );
        testErrorsAndWarnings('from a_index | stats round(percentile(longField, doubleField))', [
          'Argument of [round] must be a constant, received [percentile(longField,doubleField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(longField, doubleField)) + percentile(longField, doubleField)',
          [
            'Argument of [=] must be a constant, received [round(percentile(longField,doubleField))+percentile(longField,doubleField)]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats round(percentile(longField, doubleField)) + percentile(longField, doubleField)',
          [
            'Argument of [+] must be a constant, received [round(percentile(longField,doubleField))]',
            'Argument of [+] must be a constant, received [percentile(longField,doubleField)]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats var0 = percentile(longField, doubleField)', [
          'Argument of [=] must be a constant, received [percentile(longField,doubleField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(longField, doubleField)',
          ['Argument of [percentile] must be a constant, received [doubleField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(longField, doubleField)',
          ['Argument of [=] must be a constant, received [percentile(longField,doubleField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats percentile(longField, doubleField) by round(doubleField / 2)',
          ['Argument of [percentile] must be a constant, received [doubleField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = percentile(longField, doubleField) by var1 = round(doubleField / 2)',
          ['Argument of [=] must be a constant, received [percentile(longField,doubleField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(longField, doubleField) by round(doubleField / 2), ipField',
          ['Argument of [percentile] must be a constant, received [doubleField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(longField, doubleField) by var1 = round(doubleField / 2), ipField',
          ['Argument of [=] must be a constant, received [percentile(longField,doubleField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(longField, doubleField) by round(doubleField / 2), doubleField / 2',
          ['Argument of [percentile] must be a constant, received [doubleField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(longField, doubleField) by var1 = round(doubleField / 2), doubleField / 2',
          ['Argument of [=] must be a constant, received [percentile(longField,doubleField)]']
        );

        testErrorsAndWarnings('from a_index | stats var = percentile(longField, longField)', [
          'Argument of [=] must be a constant, received [percentile(longField,longField)]',
        ]);
        testErrorsAndWarnings('from a_index | stats percentile(longField, longField)', [
          'Argument of [percentile] must be a constant, received [longField]',
        ]);
        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(longField, longField))',
          ['Argument of [=] must be a constant, received [round(percentile(longField,longField))]']
        );
        testErrorsAndWarnings('from a_index | stats round(percentile(longField, longField))', [
          'Argument of [round] must be a constant, received [percentile(longField,longField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(longField, longField)) + percentile(longField, longField)',
          [
            'Argument of [=] must be a constant, received [round(percentile(longField,longField))+percentile(longField,longField)]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats round(percentile(longField, longField)) + percentile(longField, longField)',
          [
            'Argument of [+] must be a constant, received [round(percentile(longField,longField))]',
            'Argument of [+] must be a constant, received [percentile(longField,longField)]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats var0 = percentile(longField, longField)', [
          'Argument of [=] must be a constant, received [percentile(longField,longField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(longField, longField)',
          ['Argument of [percentile] must be a constant, received [longField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(longField, longField)',
          ['Argument of [=] must be a constant, received [percentile(longField,longField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats percentile(longField, longField) by round(doubleField / 2)',
          ['Argument of [percentile] must be a constant, received [longField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = percentile(longField, longField) by var1 = round(doubleField / 2)',
          ['Argument of [=] must be a constant, received [percentile(longField,longField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(longField, longField) by round(doubleField / 2), ipField',
          ['Argument of [percentile] must be a constant, received [longField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(longField, longField) by var1 = round(doubleField / 2), ipField',
          ['Argument of [=] must be a constant, received [percentile(longField,longField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(longField, longField) by round(doubleField / 2), doubleField / 2',
          ['Argument of [percentile] must be a constant, received [longField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(longField, longField) by var1 = round(doubleField / 2), doubleField / 2',
          ['Argument of [=] must be a constant, received [percentile(longField,longField)]']
        );

        testErrorsAndWarnings('from a_index | stats var = percentile(longField, integerField)', [
          'Argument of [=] must be a constant, received [percentile(longField,integerField)]',
        ]);
        testErrorsAndWarnings('from a_index | stats percentile(longField, integerField)', [
          'Argument of [percentile] must be a constant, received [integerField]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(longField, integerField))',
          [
            'Argument of [=] must be a constant, received [round(percentile(longField,integerField))]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats round(percentile(longField, integerField))', [
          'Argument of [round] must be a constant, received [percentile(longField,integerField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(longField, integerField)) + percentile(longField, integerField)',
          [
            'Argument of [=] must be a constant, received [round(percentile(longField,integerField))+percentile(longField,integerField)]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats round(percentile(longField, integerField)) + percentile(longField, integerField)',
          [
            'Argument of [+] must be a constant, received [round(percentile(longField,integerField))]',
            'Argument of [+] must be a constant, received [percentile(longField,integerField)]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats var0 = percentile(longField, integerField)', [
          'Argument of [=] must be a constant, received [percentile(longField,integerField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(longField, integerField)',
          ['Argument of [percentile] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(longField, integerField)',
          ['Argument of [=] must be a constant, received [percentile(longField,integerField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats percentile(longField, integerField) by round(doubleField / 2)',
          ['Argument of [percentile] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = percentile(longField, integerField) by var1 = round(doubleField / 2)',
          ['Argument of [=] must be a constant, received [percentile(longField,integerField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(longField, integerField) by round(doubleField / 2), ipField',
          ['Argument of [percentile] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(longField, integerField) by var1 = round(doubleField / 2), ipField',
          ['Argument of [=] must be a constant, received [percentile(longField,integerField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(longField, integerField) by round(doubleField / 2), doubleField / 2',
          ['Argument of [percentile] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(longField, integerField) by var1 = round(doubleField / 2), doubleField / 2',
          ['Argument of [=] must be a constant, received [percentile(longField,integerField)]']
        );

        testErrorsAndWarnings('from a_index | stats var = percentile(integerField, doubleField)', [
          'Argument of [=] must be a constant, received [percentile(integerField,doubleField)]',
        ]);
        testErrorsAndWarnings('from a_index | stats percentile(integerField, doubleField)', [
          'Argument of [percentile] must be a constant, received [doubleField]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(integerField, doubleField))',
          [
            'Argument of [=] must be a constant, received [round(percentile(integerField,doubleField))]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats round(percentile(integerField, doubleField))', [
          'Argument of [round] must be a constant, received [percentile(integerField,doubleField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(integerField, doubleField)) + percentile(integerField, doubleField)',
          [
            'Argument of [=] must be a constant, received [round(percentile(integerField,doubleField))+percentile(integerField,doubleField)]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats round(percentile(integerField, doubleField)) + percentile(integerField, doubleField)',
          [
            'Argument of [+] must be a constant, received [round(percentile(integerField,doubleField))]',
            'Argument of [+] must be a constant, received [percentile(integerField,doubleField)]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats var0 = percentile(integerField, doubleField)', [
          'Argument of [=] must be a constant, received [percentile(integerField,doubleField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(integerField, doubleField)',
          ['Argument of [percentile] must be a constant, received [doubleField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(integerField, doubleField)',
          ['Argument of [=] must be a constant, received [percentile(integerField,doubleField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats percentile(integerField, doubleField) by round(doubleField / 2)',
          ['Argument of [percentile] must be a constant, received [doubleField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = percentile(integerField, doubleField) by var1 = round(doubleField / 2)',
          ['Argument of [=] must be a constant, received [percentile(integerField,doubleField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(integerField, doubleField) by round(doubleField / 2), ipField',
          ['Argument of [percentile] must be a constant, received [doubleField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(integerField, doubleField) by var1 = round(doubleField / 2), ipField',
          ['Argument of [=] must be a constant, received [percentile(integerField,doubleField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(integerField, doubleField) by round(doubleField / 2), doubleField / 2',
          ['Argument of [percentile] must be a constant, received [doubleField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(integerField, doubleField) by var1 = round(doubleField / 2), doubleField / 2',
          ['Argument of [=] must be a constant, received [percentile(integerField,doubleField)]']
        );

        testErrorsAndWarnings('from a_index | stats var = percentile(integerField, longField)', [
          'Argument of [=] must be a constant, received [percentile(integerField,longField)]',
        ]);
        testErrorsAndWarnings('from a_index | stats percentile(integerField, longField)', [
          'Argument of [percentile] must be a constant, received [longField]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(integerField, longField))',
          [
            'Argument of [=] must be a constant, received [round(percentile(integerField,longField))]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats round(percentile(integerField, longField))', [
          'Argument of [round] must be a constant, received [percentile(integerField,longField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(integerField, longField)) + percentile(integerField, longField)',
          [
            'Argument of [=] must be a constant, received [round(percentile(integerField,longField))+percentile(integerField,longField)]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats round(percentile(integerField, longField)) + percentile(integerField, longField)',
          [
            'Argument of [+] must be a constant, received [round(percentile(integerField,longField))]',
            'Argument of [+] must be a constant, received [percentile(integerField,longField)]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats var0 = percentile(integerField, longField)', [
          'Argument of [=] must be a constant, received [percentile(integerField,longField)]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(integerField, longField)',
          ['Argument of [percentile] must be a constant, received [longField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(integerField, longField)',
          ['Argument of [=] must be a constant, received [percentile(integerField,longField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats percentile(integerField, longField) by round(doubleField / 2)',
          ['Argument of [percentile] must be a constant, received [longField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = percentile(integerField, longField) by var1 = round(doubleField / 2)',
          ['Argument of [=] must be a constant, received [percentile(integerField,longField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(integerField, longField) by round(doubleField / 2), ipField',
          ['Argument of [percentile] must be a constant, received [longField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(integerField, longField) by var1 = round(doubleField / 2), ipField',
          ['Argument of [=] must be a constant, received [percentile(integerField,longField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(integerField, longField) by round(doubleField / 2), doubleField / 2',
          ['Argument of [percentile] must be a constant, received [longField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(integerField, longField) by var1 = round(doubleField / 2), doubleField / 2',
          ['Argument of [=] must be a constant, received [percentile(integerField,longField)]']
        );

        testErrorsAndWarnings('from a_index | stats var = percentile(integerField, integerField)', [
          'Argument of [=] must be a constant, received [percentile(integerField,integerField)]',
        ]);
        testErrorsAndWarnings('from a_index | stats percentile(integerField, integerField)', [
          'Argument of [percentile] must be a constant, received [integerField]',
        ]);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(integerField, integerField))',
          [
            'Argument of [=] must be a constant, received [round(percentile(integerField,integerField))]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats round(percentile(integerField, integerField))',
          [
            'Argument of [round] must be a constant, received [percentile(integerField,integerField)]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(integerField, integerField)) + percentile(integerField, integerField)',
          [
            'Argument of [=] must be a constant, received [round(percentile(integerField,integerField))+percentile(integerField,integerField)]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats round(percentile(integerField, integerField)) + percentile(integerField, integerField)',
          [
            'Argument of [+] must be a constant, received [round(percentile(integerField,integerField))]',
            'Argument of [+] must be a constant, received [percentile(integerField,integerField)]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = percentile(integerField, integerField)',
          ['Argument of [=] must be a constant, received [percentile(integerField,integerField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(integerField, integerField)',
          ['Argument of [percentile] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(integerField, integerField)',
          ['Argument of [=] must be a constant, received [percentile(integerField,integerField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats percentile(integerField, integerField) by round(doubleField / 2)',
          ['Argument of [percentile] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = percentile(integerField, integerField) by var1 = round(doubleField / 2)',
          ['Argument of [=] must be a constant, received [percentile(integerField,integerField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(integerField, integerField) by round(doubleField / 2), ipField',
          ['Argument of [percentile] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(integerField, integerField) by var1 = round(doubleField / 2), ipField',
          ['Argument of [=] must be a constant, received [percentile(integerField,integerField)]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), percentile(integerField, integerField) by round(doubleField / 2), doubleField / 2',
          ['Argument of [percentile] must be a constant, received [integerField]']
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(doubleField), var0 = percentile(integerField, integerField) by var1 = round(doubleField / 2), doubleField / 2',
          ['Argument of [=] must be a constant, received [percentile(integerField,integerField)]']
        );

        testErrorsAndWarnings('from a_index | sort percentile(doubleField, doubleField)', [
          'SORT does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(doubleField, doubleField)', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(doubleField, doubleField) > 0', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(doubleField, longField)', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(doubleField, longField) > 0', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(doubleField, integerField)', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(doubleField, integerField) > 0', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(longField, doubleField)', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(longField, doubleField) > 0', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(longField, longField)', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(longField, longField) > 0', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(longField, integerField)', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(longField, integerField) > 0', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(integerField, doubleField)', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(integerField, doubleField) > 0', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(integerField, longField)', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(integerField, longField) > 0', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(integerField, integerField)', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(integerField, integerField) > 0', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(doubleField, doubleField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = percentile(doubleField, doubleField) > 0',
          ['EVAL does not support function percentile']
        );

        testErrorsAndWarnings('from a_index | eval percentile(doubleField, doubleField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(doubleField, doubleField) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(doubleField, longField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(doubleField, longField) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(doubleField, longField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(doubleField, longField) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(doubleField, integerField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = percentile(doubleField, integerField) > 0',
          ['EVAL does not support function percentile']
        );

        testErrorsAndWarnings('from a_index | eval percentile(doubleField, integerField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(doubleField, integerField) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(longField, doubleField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(longField, doubleField) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(longField, doubleField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(longField, doubleField) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(longField, longField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(longField, longField) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(longField, longField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(longField, longField) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(longField, integerField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(longField, integerField) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(longField, integerField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(longField, integerField) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(integerField, doubleField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = percentile(integerField, doubleField) > 0',
          ['EVAL does not support function percentile']
        );

        testErrorsAndWarnings('from a_index | eval percentile(integerField, doubleField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(integerField, doubleField) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(integerField, longField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(integerField, longField) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(integerField, longField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(integerField, longField) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(integerField, integerField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = percentile(integerField, integerField) > 0',
          ['EVAL does not support function percentile']
        );

        testErrorsAndWarnings('from a_index | eval percentile(integerField, integerField)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(integerField, integerField) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | stats percentile(null, null)', []);
        testErrorsAndWarnings('row nullVar = null | stats percentile(nullVar, nullVar)', [
          'Argument of [percentile] must be a constant, received [nullVar]',
        ]);
      });

      describe('to_string', () => {
        testErrorsAndWarnings('row var = to_string(true)', []);
        testErrorsAndWarnings('row to_string(true)', []);
        testErrorsAndWarnings('row var = to_str(true)', []);
        testErrorsAndWarnings('row var = to_string(to_boolean(true))', []);
        testErrorsAndWarnings('row var = to_string(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row to_string(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = to_str(cartesianPointField)', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = to_string(to_cartesianpoint(cartesianPointField))', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = to_string(to_cartesianshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row to_string(to_cartesianshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = to_str(to_cartesianshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = to_string(to_cartesianshape(cartesianPointField))', [
          'Unknown column [cartesianPointField]',
        ]);
        testErrorsAndWarnings('row var = to_string(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row to_string(to_datetime("2021-01-01T00:00:00Z"))', []);
        testErrorsAndWarnings('row var = to_str(to_datetime("2021-01-01T00:00:00Z"))', []);

        testErrorsAndWarnings(
          'row var = to_string(to_datetime(to_datetime("2021-01-01T00:00:00Z")))',
          []
        );

        testErrorsAndWarnings('row var = to_string(5.5)', []);

        testErrorsAndWarnings('row to_string(5.5)', []);
        testErrorsAndWarnings('row var = to_str(5.5)', []);
        testErrorsAndWarnings('row var = to_string(to_double(true))', []);
        testErrorsAndWarnings('row var = to_string(geoPointField)', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row to_string(geoPointField)', ['Unknown column [geoPointField]']);
        testErrorsAndWarnings('row var = to_str(geoPointField)', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row var = to_string(to_geopoint(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row var = to_string(to_geoshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row to_string(to_geoshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = to_str(to_geoshape("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = to_string(to_geoshape(geoPointField))', [
          'Unknown column [geoPointField]',
        ]);
        testErrorsAndWarnings('row var = to_string(5)', []);
        testErrorsAndWarnings('row to_string(5)', []);
        testErrorsAndWarnings('row var = to_str(5)', []);
        testErrorsAndWarnings('row var = to_string(to_integer(true))', []);
        testErrorsAndWarnings('row var = to_string(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row to_string(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row var = to_str(to_ip("127.0.0.1"))', []);
        testErrorsAndWarnings('row var = to_string(to_ip(to_ip("127.0.0.1")))', []);
        testErrorsAndWarnings('row var = to_string("a")', []);
        testErrorsAndWarnings('row to_string("a")', []);
        testErrorsAndWarnings('row var = to_str("a")', []);
        testErrorsAndWarnings('row var = to_string(to_string(true))', []);
        testErrorsAndWarnings('row var = to_string(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row to_string(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row var = to_str(to_version("1.0.0"))', []);
        testErrorsAndWarnings('row var = to_string(to_version("a"))', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(to_boolean(booleanField))', []);

        testErrorsAndWarnings('from a_index | eval to_string(counterDoubleField)', [
          'Argument of [to_string] must be [boolean], found value [counterDoubleField] type [counter_double]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_string(*)', [
          'Using wildcards (*) in to_string is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_string(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(cartesianPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = to_string(to_cartesianpoint(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = to_string(cartesianShapeField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(cartesianShapeField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(cartesianShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = to_string(to_cartesianshape(cartesianPointField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval var = to_string(dateField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(dateField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(to_datetime(dateField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(doubleField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(to_double(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(geoPointField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = to_string(to_geopoint(geoPointField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = to_string(geoShapeField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(geoShapeField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(geoShapeField)', []);
        testErrorsAndWarnings(
          'from a_index | eval var = to_string(to_geoshape(geoPointField))',
          []
        );
        testErrorsAndWarnings('from a_index | eval var = to_string(integerField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(integerField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(to_integer(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(ipField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(ipField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(ipField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(to_ip(ipField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(keywordField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(to_string(booleanField))', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(longField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(longField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(textField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(textField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(unsignedLongField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(versionField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(versionField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(versionField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(to_version(keywordField))', []);

        testErrorsAndWarnings('from a_index | eval to_string(booleanField, extraArg)', [
          'Error: [to_string] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort to_string(booleanField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(null)', []);
        testErrorsAndWarnings('row nullVar = null | eval to_string(nullVar)', []);
        testErrorsAndWarnings('from a_index | eval to_string("2022")', []);
        testErrorsAndWarnings('from a_index | eval to_string(concat("20", "22"))', []);
        testErrorsAndWarnings('row var = to_string(to_cartesianpoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row to_string(to_cartesianpoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = to_str(to_cartesianpoint("POINT (30 10)"))', []);

        testErrorsAndWarnings(
          'row var = to_string(to_cartesianpoint(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings(
          'row var = to_string(to_cartesianshape(to_cartesianpoint("POINT (30 10)")))',
          []
        );

        testErrorsAndWarnings('row var = to_string(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row to_string(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = to_str(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = to_string(to_geopoint(to_geopoint("POINT (30 10)")))', []);
        testErrorsAndWarnings('row var = to_string(to_geoshape(to_geopoint("POINT (30 10)")))', []);
      });

      describe('mv_pseries_weighted_sum', () => {
        testErrorsAndWarnings('row var = mv_pseries_weighted_sum(5.5, 5.5)', []);
        testErrorsAndWarnings('row mv_pseries_weighted_sum(5.5, 5.5)', []);
        testErrorsAndWarnings(
          'row var = mv_pseries_weighted_sum(to_double(true), to_double(true))',
          []
        );

        testErrorsAndWarnings('row var = mv_pseries_weighted_sum(true, true)', [
          'Argument of [mv_pseries_weighted_sum] must be [double], found value [true] type [boolean]',
          'Argument of [mv_pseries_weighted_sum] must be [double], found value [true] type [boolean]',
        ]);

        testErrorsAndWarnings(
          'from a_index | where mv_pseries_weighted_sum(doubleField, doubleField) > 0',
          []
        );

        testErrorsAndWarnings(
          'from a_index | where mv_pseries_weighted_sum(booleanField, booleanField) > 0',
          [
            'Argument of [mv_pseries_weighted_sum] must be [double], found value [booleanField] type [boolean]',
            'Argument of [mv_pseries_weighted_sum] must be [double], found value [booleanField] type [boolean]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_pseries_weighted_sum(doubleField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_pseries_weighted_sum(doubleField, doubleField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_pseries_weighted_sum(to_double(booleanField), to_double(booleanField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_pseries_weighted_sum(booleanField, booleanField)',
          [
            'Argument of [mv_pseries_weighted_sum] must be [double], found value [booleanField] type [boolean]',
            'Argument of [mv_pseries_weighted_sum] must be [double], found value [booleanField] type [boolean]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_pseries_weighted_sum(doubleField, doubleField, extraArg)',
          ['Error: [mv_pseries_weighted_sum] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | sort mv_pseries_weighted_sum(doubleField, doubleField)',
          []
        );

        testErrorsAndWarnings('from a_index | eval mv_pseries_weighted_sum(null, null)', []);
        testErrorsAndWarnings(
          'row nullVar = null | eval mv_pseries_weighted_sum(nullVar, nullVar)',
          []
        );
      });
    });
  });

  describe('Ignoring errors based on callbacks', () => {
    interface Fixtures {
      testCases: Array<{ query: string; error: string[] }>;
    }

    async function loadFixtures() {
      // early exit if the testCases are already defined locally
      if (testCases.length) {
        return { testCases };
      }
      const json = await readFile(join(__dirname, 'esql_validation_meta_tests.json'), 'utf8');
      const esqlPackage = JSON.parse(json);
      return esqlPackage as Fixtures;
    }

    function excludeErrorsByContent(excludedCallback: Array<keyof typeof ignoreErrorsMap>) {
      const contentByCallback = {
        getSources: /Unknown index/,
        getPolicies: /Unknown policy/,
        getFieldsFor: /Unknown column|Argument of|it is unsupported or not indexed/,
      };
      return excludedCallback.map((callback) => contentByCallback[callback]) || [];
    }

    function getPartialCallbackMocks(exclude?: string) {
      return {
        ...getCallbackMocks(),
        ...(exclude ? { [exclude]: undefined } : {}),
      };
    }

    let fixtures: Fixtures;

    beforeAll(async () => {
      fixtures = await loadFixtures();
    });

    it('should basically work when all callbacks are passed', async () => {
      const allErrors = await Promise.all(
        fixtures.testCases
          .filter(({ query }) => query === 'from index [METADATA _id, _source2]')
          .map(({ query }) =>
            validateQuery(
              query,
              getAstAndSyntaxErrors,
              { ignoreOnMissingCallbacks: true },
              getCallbackMocks()
            )
          )
      );
      for (const [index, { errors }] of Object.entries(allErrors)) {
        expect(errors.map((e) => ('severity' in e ? e.message : e.text))).toEqual(
          fixtures.testCases.filter(({ query }) => query === 'from index [METADATA _id, _source2]')[
            Number(index)
          ].error
        );
      }
    });

    // test excluding one callback at the time
    it.each(['getSources', 'getFieldsFor', 'getPolicies'] as Array<keyof typeof ignoreErrorsMap>)(
      `should not error if %s is missing`,
      async (excludedCallback) => {
        const filteredTestCases = fixtures.testCases.filter((t) =>
          t.error.some((message) =>
            excludeErrorsByContent([excludedCallback]).every((regexp) => regexp?.test(message))
          )
        );
        const allErrors = await Promise.all(
          filteredTestCases.map(({ query }) =>
            validateQuery(
              query,
              getAstAndSyntaxErrors,
              { ignoreOnMissingCallbacks: true },
              getPartialCallbackMocks(excludedCallback)
            )
          )
        );
        for (const { errors } of allErrors) {
          expect(
            errors.every(({ code }) =>
              ignoreErrorsMap[excludedCallback].every((ignoredCode) => ignoredCode !== code)
            )
          ).toBe(true);
        }
      }
    );

    it('should work if no callback passed', async () => {
      const excludedCallbacks = ['getSources', 'getPolicies', 'getFieldsFor'] as Array<
        keyof typeof ignoreErrorsMap
      >;
      for (const testCase of fixtures.testCases.filter((t) =>
        t.error.some((message) =>
          excludeErrorsByContent(excludedCallbacks).every((regexp) => regexp?.test(message))
        )
      )) {
        const { errors } = await validateQuery(testCase.query, getAstAndSyntaxErrors, {
          ignoreOnMissingCallbacks: true,
        });
        expect(
          errors.every(({ code }) =>
            Object.values(ignoreErrorsMap)
              .filter(nonNullable)
              .every((ignoredCode) => ignoredCode.every((i) => i !== code))
          )
        ).toBe(true);
      }
    });
  });
});
