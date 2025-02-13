/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { writeFile, readFile } from 'fs/promises';
import { ignoreErrorsMap, validateQuery } from './validation';
import { scalarFunctionDefinitions } from '../definitions/generated/scalar_functions';
import { getFunctionSignatures } from '../definitions/helpers';
import {
  FieldType,
  FunctionDefinition,
  SupportedDataType,
  dataTypes,
  fieldTypes as _fieldTypes,
} from '../definitions/types';
import { timeUnits, timeUnitsToSuggest } from '../definitions/literals';
import { aggregationFunctionDefinitions } from '../definitions/generated/aggregation_functions';
import capitalize from 'lodash/capitalize';
import { camelCase } from 'lodash';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { nonNullable } from '../shared/helpers';
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

const toAvgSignature = aggregationFunctionDefinitions.find(({ name }) => name === 'avg')!;
const toInteger = scalarFunctionDefinitions.find(({ name }) => name === 'to_integer')!;
const toDoubleSignature = scalarFunctionDefinitions.find(({ name }) => name === 'to_double')!;
const toStringSignature = scalarFunctionDefinitions.find(({ name }) => name === 'to_string')!;
const toDateSignature = scalarFunctionDefinitions.find(({ name }) => name === 'to_datetime')!;
const toBooleanSignature = scalarFunctionDefinitions.find(({ name }) => name === 'to_boolean')!;
const toIpSignature = scalarFunctionDefinitions.find(({ name }) => name === 'to_ip')!;
const toGeoPointSignature = scalarFunctionDefinitions.find(({ name }) => name === 'to_geopoint')!;
const toGeoShapeSignature = scalarFunctionDefinitions.find(({ name }) => name === 'to_geoshape')!;
const toCartesianPointSignature = scalarFunctionDefinitions.find(
  ({ name }) => name === 'to_cartesianpoint'
)!;
const toCartesianShapeSignature = scalarFunctionDefinitions.find(
  ({ name }) => name === 'to_cartesianshape'
)!;
const toVersionSignature = scalarFunctionDefinitions.find(({ name }) => name === 'to_version')!;

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
  return params.map(
    ({ name: _name, type, constantOnly, acceptedValues: literalOptions, ...rest }) => {
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
    }
  );
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
    // by suppressing the parser error in src/platform/packages/shared/kbn-esql-ast/src/ast_parser.ts
    describe('ESQL query can be empty', () => {
      testErrorsAndWarnings('', []);
      testErrorsAndWarnings(' ', []);
      testErrorsAndWarnings('     ', []);
    });

    describe('ESQL query should start with a source command', () => {
      ['eval', 'stats', 'rename', 'limit', 'keep', 'drop', 'mv_expand', 'dissect', 'grok'].map(
        (command) =>
          testErrorsAndWarnings(command, [
            `SyntaxError: mismatched input '${command}' expecting {'explain', 'from', 'row', 'show'}`,
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
        'Error: [in] function expects at least 2 arguments, got 1.',
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
        'Argument of [in] must be [integer[]], found value [("a", "b", "c")] type [(keyword, keyword, keyword)]',
      ]);
      testErrorsAndWarnings('row var = 5 in ("a", "b", "c")', [
        'Argument of [in] must be [integer[]], found value [("a", "b", "c")] type [(keyword, keyword, keyword)]',
      ]);
      testErrorsAndWarnings('row var = 5 not in ("a", "b", "c")', [
        'Argument of [not_in] must be [integer[]], found value [("a", "b", "c")] type [(keyword, keyword, keyword)]',
      ]);
      testErrorsAndWarnings('row var = 5 not in (1, 2, 3, "a")', [
        'Argument of [not_in] must be [integer[]], found value [(1, 2, 3, "a")] type [(integer, integer, integer, keyword)]',
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
          `Argument of [${op}] must be [keyword], found value [5] type [integer]`,
        ]);
        testErrorsAndWarnings(`row var = 5 NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [keyword], found value [5] type [integer]`,
        ]);
        testErrorsAndWarnings(`row var = NOT 5 ${op} "?a"`, [
          `Argument of [${op}] must be [keyword], found value [5] type [integer]`,
        ]);
        testErrorsAndWarnings(`row var = NOT 5 NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [keyword], found value [5] type [integer]`,
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
            `Argument of [+] must be [date], found value [1 year] type [duration]`,
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

    describe('join', () => {
      testErrorsAndWarnings('ROW a=1::LONG | LOOKUP JOIN t ON a', [
        '[t] index is not a valid JOIN index. Please use a "lookup" mode index JOIN commands.',
      ]);
    });

    describe('keep', () => {
      testErrorsAndWarnings('from index | keep ', [
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
      ]);
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
        "SyntaxError: mismatched input '.' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
        'Unknown column [.]',
      ]);
      testErrorsAndWarnings('from index | keep `4.5`', ['Unknown column [4.5]']);
      testErrorsAndWarnings('from index | keep missingField, doubleField, dateField', [
        'Unknown column [missingField]',
      ]);
      testErrorsAndWarnings('from index | keep `any#Char$Field`', []);
      testErrorsAndWarnings('from index | project ', [
        "SyntaxError: mismatched input 'project' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'keep', 'limit', 'mv_expand', 'rename', 'sort', 'stats', 'where', 'lookup'}",
      ]);
      testErrorsAndWarnings('from index | project textField, doubleField, dateField', [
        "SyntaxError: mismatched input 'project' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'keep', 'limit', 'mv_expand', 'rename', 'sort', 'stats', 'where', 'lookup'}",
      ]);
      testErrorsAndWarnings('from index | PROJECT textField, doubleField, dateField', [
        "SyntaxError: mismatched input 'PROJECT' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'keep', 'limit', 'mv_expand', 'rename', 'sort', 'stats', 'where', 'lookup'}",
      ]);
      testErrorsAndWarnings('from index | project missingField, doubleField, dateField', [
        "SyntaxError: mismatched input 'project' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'keep', 'limit', 'mv_expand', 'rename', 'sort', 'stats', 'where', 'lookup'}",
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
      testErrorsAndWarnings('from index | drop ', [
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
      ]);
      testErrorsAndWarnings('from index | drop textField, doubleField, dateField', []);
      testErrorsAndWarnings('from index | drop 4.5', [
        "SyntaxError: token recognition error at: '4'",
        "SyntaxError: token recognition error at: '5'",
        "SyntaxError: mismatched input '.' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
        'Unknown column [.]',
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
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
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
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
      ]);
      testErrorsAndWarnings('from a_index | rename textField', [
        "SyntaxError: mismatched input '<EOF>' expecting 'as'",
      ]);
      testErrorsAndWarnings('from a_index | rename a', [
        "SyntaxError: mismatched input '<EOF>' expecting 'as'",
        'Unknown column [a]',
      ]);
      testErrorsAndWarnings('from a_index | rename textField as', [
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
      ]);
      testErrorsAndWarnings('from a_index | rename missingField as', [
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
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
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
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
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | dissect textField %a', [
        "SyntaxError: mismatched input '%' expecting QUOTED_STRING",
        "SyntaxError: mismatched input '<EOF>' expecting '='",
      ]);
      // Do not try to validate the dissect pattern string
      testErrorsAndWarnings('from a_index | dissect textField "%{firstWord}"', []);
      testErrorsAndWarnings('from a_index | dissect doubleField "%{firstWord}"', [
        'DISSECT only supports keyword, text types values, found [doubleField] of type [double]',
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
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | grok textField %a', [
        "SyntaxError: mismatched input '%' expecting QUOTED_STRING",
      ]);
      // Do not try to validate the grok pattern string
      testErrorsAndWarnings('from a_index | grok textField "%{firstWord}"', []);
      testErrorsAndWarnings('from a_index | grok doubleField "%{firstWord}"', [
        'GROK only supports keyword, text types values, found [doubleField] of type [double]',
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
          `Argument of [${op}] must be [keyword], found value [doubleField] type [double]`,
        ]);
        testErrorsAndWarnings(`from a_index | where doubleField NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [keyword], found value [doubleField] type [double]`,
        ]);
        testErrorsAndWarnings(`from a_index | where NOT doubleField ${op} "?a"`, [
          `Argument of [${op}] must be [keyword], found value [doubleField] type [double]`,
        ]);
        testErrorsAndWarnings(`from a_index | where NOT doubleField NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [keyword], found value [doubleField] type [double]`,
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
          op === '==' || op === '!='
            ? `Argument of [${op}] must be [boolean], found value [doubleField] type [double]`
            : `Argument of [${op}] must be [date], found value [doubleField] type [double]`,
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
            ? [`Argument of [${op}] must be [date], found value [1] type [integer]`]
            : [`Argument of [${op}] must be [double], found value [\"1\"] type [keyword]`]
        );
        testErrorsAndWarnings(
          `from a_index | eval "1" ${op} 1`,
          ['+', '-'].includes(op)
            ? [`Argument of [${op}] must be [date_period], found value [1] type [integer]`]
            : [`Argument of [${op}] must be [double], found value [\"1\"] type [keyword]`]
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
          `Argument of [${op}] must be [keyword], found value [doubleField] type [double]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval doubleField NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [keyword], found value [doubleField] type [double]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval NOT doubleField ${op} "?a"`, [
          `Argument of [${op}] must be [keyword], found value [doubleField] type [double]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval NOT doubleField NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [keyword], found value [doubleField] type [double]`,
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
        'Argument of [in] must be [integer[]], found value [("a", "b", "c")] type [(keyword, keyword, keyword)]',
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
        'Error: [in] function expects at least 2 arguments, got 1.',
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
            `Argument of [+] must be [date], found value [1 year] type [duration]`,
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
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
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
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
      ]);
      testErrorsAndWarnings(`from a_index | enrich policy on textField with var0 `, [
        'Unknown column [var0]',
      ]);
      testErrorsAndWarnings(`from a_index |enrich policy on doubleField with var0 = `, [
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
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
        "SyntaxError: mismatched input ',' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
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
        [
          "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
          'Unknown column [var1]',
        ]
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
        "SyntaxError: mismatched input '<EOF>' expecting {'?', NAMED_OR_POSITIONAL_PARAM, ID_PATTERN}",
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
        ['Column [doubleField] of type double has been overwritten as new type: keyword']
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
        expect(callbackMocks.getColumnsFor).not.toHaveBeenCalled();
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
        expect(callbackMocks.getColumnsFor).not.toHaveBeenCalled();
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
        expect(callbackMocks.getColumnsFor).toHaveBeenCalledTimes(1);
        expect(callbackMocks.getColumnsFor).toHaveBeenLastCalledWith({
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
        expect(callbackMocks.getColumnsFor).toHaveBeenCalledTimes(1);
        expect(callbackMocks.getColumnsFor).toHaveBeenLastCalledWith({
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
        expect(callbackMocks.getColumnsFor).toHaveBeenCalledTimes(2);
        expect(callbackMocks.getColumnsFor).toHaveBeenLastCalledWith({
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
              getColumnsFor: undefined,
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

      testErrorsAndWarnings('from a_index | where 1::string=="keyword"', []);

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
        'Argument of [+] must be [date], found value [1] type [integer]',
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

      testErrorsAndWarnings('from a_index | eval true AND 0::boolean', []);
      testErrorsAndWarnings('from a_index | eval true AND 0::bool', []);
      testErrorsAndWarnings('from a_index | eval true AND 0', [
        // just a counter-case to make sure the previous tests are meaningful
        'Argument of [and] must be [boolean], found value [0] type [integer]',
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

    describe('unsupported fields', () => {
      testErrorsAndWarnings(
        `from a_index | keep unsupportedField`,
        [],
        [
          'Field [unsupportedField] cannot be retrieved, it is unsupported or not indexed; returning null',
        ]
      );
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
        getColumnsFor: /Unknown column|Argument of|it is unsupported or not indexed/,
        getPreferences: /Unknown/,
        getFieldsMetadata: /Unknown/,
        getVariablesByType: /Unknown/,
        canSuggestVariables: /Unknown/,
      };
      return excludedCallback.map((callback) => (contentByCallback as any)[callback]) || [];
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
          .filter(({ query }) => query === 'from index METADATA _id, _source2')
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
          fixtures.testCases.filter(({ query }) => query === 'from index METADATA _id, _source2')[
            Number(index)
          ].error
        );
      }
    });

    // test excluding one callback at the time
    it.each(['getSources', 'getColumnsFor', 'getPolicies'] as Array<keyof typeof ignoreErrorsMap>)(
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
      const excludedCallbacks = ['getSources', 'getPolicies', 'getColumnsFor'] as Array<
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
