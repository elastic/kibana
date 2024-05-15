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
import { evalFunctionsDefinitions } from '../definitions/functions';
import { getFunctionSignatures } from '../definitions/helpers';
import { FunctionDefinition } from '../definitions/types';
import { chronoLiterals, timeLiterals } from '../definitions/literals';
import { statsAggregationFunctionDefinitions } from '../definitions/aggs';
import capitalize from 'lodash/capitalize';
import { camelCase } from 'lodash';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { nonNullable } from '../shared/helpers';
import { FUNCTION_DESCRIBE_BLOCK_NAME } from './function_describe_block_name';

const fieldTypes = [
  'number',
  'date',
  'boolean',
  'version',
  'ip',
  'string',
  'cartesian_point',
  'cartesian_shape',
  'geo_point',
  'geo_shape',
];
const fields = [
  ...fieldTypes.map((type) => ({ name: `${camelCase(type)}Field`, type })),
  { name: 'any#Char$Field', type: 'number' },
  { name: 'kubernetes.something.something', type: 'number' },
  { name: '@timestamp', type: 'date' },
];
const enrichFields = [
  { name: 'otherField', type: 'string' },
  { name: 'yetAnotherField', type: 'number' },
];
// eslint-disable-next-line @typescript-eslint/naming-convention
const unsupported_field = [{ name: 'unsupported_field', type: 'unsupported' }];
const indexes = [
  'a_index',
  'index',
  'other_index',
  '.secret_index',
  'my-index',
  'unsupported_index',
];
const policies = [
  {
    name: 'policy',
    sourceIndices: ['enrich_index'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField'],
  },
  {
    name: 'policy$',
    sourceIndices: ['enrich_index'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField'],
  },
];

const NESTING_LEVELS = 4;
const NESTED_DEPTHS = Array(NESTING_LEVELS)
  .fill(0)
  .map((_, i) => i + 1);

function getCallbackMocks() {
  return {
    getFieldsFor: jest.fn(async ({ query }) => {
      if (/enrich/.test(query)) {
        return enrichFields;
      }
      if (/unsupported_index/.test(query)) {
        return unsupported_field;
      }
      if (/dissect|grok/.test(query)) {
        return [{ name: 'firstWord', type: 'string' }];
      }
      return fields;
    }),
    getSources: jest.fn(async () =>
      indexes.map((name) => ({
        name,
        hidden: name.startsWith('.'),
      }))
    ),
    getPolicies: jest.fn(async () => policies),
    getMetaFields: jest.fn(async () => ['_id', '_source']),
  };
}

const toInteger = evalFunctionsDefinitions.find(({ name }) => name === 'to_integer')!;
const toStringSignature = evalFunctionsDefinitions.find(({ name }) => name === 'to_string')!;
const toDateSignature = evalFunctionsDefinitions.find(({ name }) => name === 'to_datetime')!;
const toBooleanSignature = evalFunctionsDefinitions.find(({ name }) => name === 'to_boolean')!;
const toIpSignature = evalFunctionsDefinitions.find(({ name }) => name === 'to_ip')!;
const toGeoPointSignature = evalFunctionsDefinitions.find(({ name }) => name === 'to_geopoint')!;
const toCartesianPointSignature = evalFunctionsDefinitions.find(
  ({ name }) => name === 'to_cartesianpoint'
)!;

const toAvgSignature = statsAggregationFunctionDefinitions.find(({ name }) => name === 'avg')!;

const nestedFunctions = {
  number: prepareNestedFunction(toInteger),
  string: prepareNestedFunction(toStringSignature),
  date: prepareNestedFunction(toDateSignature),
  boolean: prepareNestedFunction(toBooleanSignature),
  ip: prepareNestedFunction(toIpSignature),
  geo_point: prepareNestedFunction(toGeoPointSignature),
  cartesian_point: prepareNestedFunction(toCartesianPointSignature),
};

const literals = {
  chrono_literal: chronoLiterals[0].name,
  time_literal: timeLiterals[0].name,
};
function getLiteralType(typeString: 'chrono_literal' | 'time_literal') {
  if (typeString === 'chrono_literal') {
    return literals[typeString];
  }
  return `1 ${literals[typeString]}`;
}
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
    { withTypes: false }
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
    const typeString: string = type;
    if (fieldTypes.includes(typeString)) {
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
        name: getLiteralType(typeString as 'chrono_literal' | 'time_literal'),
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
    return { name: 'stringField', type, ...rest };
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

    describe('ESQL query should start with a source command', () => {
      ['eval', 'stats', 'rename', 'limit', 'keep', 'drop', 'mv_expand', 'dissect', 'grok'].map(
        (command) =>
          testErrorsAndWarnings(command, [
            `SyntaxError: mismatched input '${command}' expecting {'explain', 'from', 'meta', 'row', 'show'}`,
          ])
      );
    });

    describe('from', () => {
      testErrorsAndWarnings('f', [
        `SyntaxError: mismatched input 'f' expecting {'explain', 'from', 'meta', 'row', 'show'}`,
      ]);
      testErrorsAndWarnings(`from `, ["SyntaxError: missing FROM_UNQUOTED_IDENTIFIER at '<EOF>'"]);
      testErrorsAndWarnings(`from index,`, [
        "SyntaxError: missing FROM_UNQUOTED_IDENTIFIER at '<EOF>'",
      ]);
      testErrorsAndWarnings(`from assignment = 1`, [
        "SyntaxError: mismatched input '=' expecting <EOF>",
        'Unknown index [assignment]',
      ]);
      testErrorsAndWarnings(`from index`, []);
      testErrorsAndWarnings(`FROM index`, []);
      testErrorsAndWarnings(`FrOm index`, []);
      testErrorsAndWarnings('from `index`', [
        "SyntaxError: token recognition error at: '`'",
        "SyntaxError: token recognition error at: '`'",
      ]);

      testErrorsAndWarnings(`from index, other_index`, []);
      testErrorsAndWarnings(`from index, missingIndex`, ['Unknown index [missingIndex]']);
      testErrorsAndWarnings(`from fn()`, ['Unknown index [fn()]']);
      testErrorsAndWarnings(`from average()`, ['Unknown index [average()]']);
      for (const isWrapped of [true, false]) {
        function setWrapping(option: string) {
          return isWrapped ? `[${option}]` : option;
        }
        function addBracketsWarning() {
          return isWrapped
            ? ["Square brackets '[]' need to be removed from FROM METADATA declaration"]
            : [];
        }
        testErrorsAndWarnings(
          `from index ${setWrapping('METADATA _id')}`,
          [],
          addBracketsWarning()
        );
        testErrorsAndWarnings(
          `from index ${setWrapping('metadata _id')}`,
          [],
          addBracketsWarning()
        );

        testErrorsAndWarnings(
          `from index ${setWrapping('METADATA _id, _source')}`,
          [],
          addBracketsWarning()
        );
        testErrorsAndWarnings(
          `from index ${setWrapping('METADATA _id, _source2')}`,
          [
            'Metadata field [_source2] is not available. Available metadata fields are: [_id, _source]',
          ],
          addBracketsWarning()
        );
        testErrorsAndWarnings(
          `from index ${setWrapping('metadata _id, _source')} ${setWrapping('METADATA _id2')}`,
          [
            isWrapped
              ? "SyntaxError: mismatched input '[' expecting <EOF>"
              : "SyntaxError: mismatched input 'METADATA' expecting <EOF>",
          ],
          addBracketsWarning()
        );

        testErrorsAndWarnings(
          `from remote-ccs:indexes ${setWrapping('METADATA _id')}`,
          [],
          addBracketsWarning()
        );
        testErrorsAndWarnings(
          `from *:indexes ${setWrapping('METADATA _id')}`,
          [],
          addBracketsWarning()
        );
      }
      testErrorsAndWarnings(`from index (metadata _id)`, [
        "SyntaxError: mismatched input '(metadata' expecting <EOF>",
      ]);
      testErrorsAndWarnings(`from ind*, other*`, []);
      testErrorsAndWarnings(`from index*`, []);
      testErrorsAndWarnings(`from *a_i*dex*`, []);
      testErrorsAndWarnings(`from in*ex*`, []);
      testErrorsAndWarnings(`from *n*ex`, []);
      testErrorsAndWarnings(`from *n*ex*`, []);
      testErrorsAndWarnings(`from i*d*x*`, []);
      testErrorsAndWarnings(`from i*d*x`, []);
      testErrorsAndWarnings(`from i***x*`, []);
      testErrorsAndWarnings(`from i****`, []);
      testErrorsAndWarnings(`from i**`, []);
      testErrorsAndWarnings(`from index**`, []);
      testErrorsAndWarnings(`from *ex`, []);
      testErrorsAndWarnings(`from *ex*`, []);
      testErrorsAndWarnings(`from in*ex`, []);
      testErrorsAndWarnings(`from ind*ex`, []);
      testErrorsAndWarnings(`from indexes*`, ['Unknown index [indexes*]']);

      testErrorsAndWarnings(`from remote-*:indexes*`, []);
      testErrorsAndWarnings(`from remote-*:indexes`, []);
      testErrorsAndWarnings(`from remote-ccs:indexes`, []);
      testErrorsAndWarnings(`from a_index, remote-ccs:indexes`, []);
      testErrorsAndWarnings('from .secret_index', []);
      testErrorsAndWarnings('from my-index', []);
      testErrorsAndWarnings('from numberField', ['Unknown index [numberField]']);
      testErrorsAndWarnings('from policy', ['Unknown index [policy]']);
    });

    describe('row', () => {
      testErrorsAndWarnings('row', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
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
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
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
        testErrorsAndWarnings(`row var = (numberField ${op} 0)`, ['Unknown column [numberField]']);
        testErrorsAndWarnings(`row var = (NOT (5 ${op} 0))`, []);
        testErrorsAndWarnings(`row var = to_ip("127.0.0.1") ${op} to_ip("127.0.0.1")`, []);
        testErrorsAndWarnings(`row var = now() ${op} now()`, []);
        testErrorsAndWarnings(
          `row var = false ${op} false`,
          ['==', '!='].includes(op)
            ? []
            : [
                `Argument of [${op}] must be [number], found value [false] type [boolean]`,
                `Argument of [${op}] must be [number], found value [false] type [boolean]`,
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
            ? [`Argument of [${op}] must be [time_literal], found value [now()] type [date]`]
            : [
                `Argument of [${op}] must be [number], found value [now()] type [date]`,
                `Argument of [${op}] must be [number], found value [now()] type [date]`,
              ]
        );
      }

      for (const op of ['like', 'rlike']) {
        testErrorsAndWarnings(`row var = "a" ${op} "?a"`, []);
        testErrorsAndWarnings(`row var = "a" NOT ${op} "?a"`, []);
        testErrorsAndWarnings(`row var = NOT "a" ${op} "?a"`, []);
        testErrorsAndWarnings(`row var = NOT "a" NOT ${op} "?a"`, []);
        testErrorsAndWarnings(`row var = 5 ${op} "?a"`, [
          `Argument of [${op}] must be [string], found value [5] type [number]`,
        ]);
        testErrorsAndWarnings(`row var = 5 NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [string], found value [5] type [number]`,
        ]);
        testErrorsAndWarnings(`row var = NOT 5 ${op} "?a"`, [
          `Argument of [${op}] must be [string], found value [5] type [number]`,
        ]);
        testErrorsAndWarnings(`row var = NOT 5 NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [string], found value [5] type [number]`,
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
        for (const timeLiteral of timeLiterals) {
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
              `Argument of [${op}] must be [number], found value [now()] type [date]`,
              `Argument of [${op}] must be [number], found value [1 ${timeLiteral.name}] type [duration]`,
            ]);
          }
        }
      });
    });

    describe('meta', () => {
      testErrorsAndWarnings('meta', ["SyntaxError: missing 'functions' at '<EOF>'"]);
      testErrorsAndWarnings('meta functions', []);
      testErrorsAndWarnings('meta functions()', [
        "SyntaxError: token recognition error at: '('",
        "SyntaxError: token recognition error at: ')'",
      ]);
      testErrorsAndWarnings('meta functions blah', [
        "SyntaxError: token recognition error at: 'b'",
        "SyntaxError: token recognition error at: 'l'",
        "SyntaxError: token recognition error at: 'a'",
        "SyntaxError: token recognition error at: 'h'",
      ]);
      testErrorsAndWarnings('meta info', [
        "SyntaxError: token recognition error at: 'i'",
        "SyntaxError: token recognition error at: 'n'",
        "SyntaxError: token recognition error at: 'fo'",
        "SyntaxError: missing 'functions' at '<EOF>'",
      ]);
    });

    describe('show', () => {
      testErrorsAndWarnings('show', ["SyntaxError: missing 'info' at '<EOF>'"]);
      testErrorsAndWarnings('show functions', [
        "SyntaxError: token recognition error at: 'f'",
        "SyntaxError: token recognition error at: 'u'",
        "SyntaxError: token recognition error at: 'n'",
        "SyntaxError: token recognition error at: 'c'",
        "SyntaxError: token recognition error at: 't'",
        "SyntaxError: token recognition error at: 'io'",
        "SyntaxError: token recognition error at: 'n'",
        "SyntaxError: token recognition error at: 's'",
        "SyntaxError: missing 'info' at '<EOF>'",
      ]);
      testErrorsAndWarnings('show info', []);
      testErrorsAndWarnings('show numberField', [
        "SyntaxError: token recognition error at: 'n'",
        "SyntaxError: token recognition error at: 'u'",
        "SyntaxError: token recognition error at: 'm'",
        "SyntaxError: token recognition error at: 'b'",
        "SyntaxError: token recognition error at: 'e'",
        "SyntaxError: token recognition error at: 'r'",
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
      testErrorsAndWarnings('from index | limit numberField', [
        "SyntaxError: mismatched input 'numberField' expecting INTEGER_LITERAL",
      ]);
      testErrorsAndWarnings('from index | limit stringField', [
        "SyntaxError: mismatched input 'stringField' expecting INTEGER_LITERAL",
      ]);
      testErrorsAndWarnings('from index | limit 4', []);
    });

    describe('keep', () => {
      testErrorsAndWarnings('from index | keep ', ["SyntaxError: missing ID_PATTERN at '<EOF>'"]);
      testErrorsAndWarnings('from index | keep stringField, numberField, dateField', []);
      testErrorsAndWarnings('from index | keep `stringField`, `numberField`, `dateField`', []);
      testErrorsAndWarnings('from index | keep 4.5', [
        "SyntaxError: token recognition error at: '4'",
        "SyntaxError: token recognition error at: '5'",
        "SyntaxError: missing ID_PATTERN at '.'",
        "SyntaxError: missing ID_PATTERN at '<EOF>'",
      ]);
      testErrorsAndWarnings('from index | keep `4.5`', ['Unknown column [4.5]']);
      testErrorsAndWarnings('from index | keep missingField, numberField, dateField', [
        'Unknown column [missingField]',
      ]);
      testErrorsAndWarnings('from index | keep `any#Char$Field`', []);
      testErrorsAndWarnings('from index | project ', [
        "SyntaxError: mismatched input 'project' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'inlinestats', 'keep', 'limit', 'mv_expand', 'rename', 'sort', 'stats', 'where'}",
      ]);
      testErrorsAndWarnings('from index | project stringField, numberField, dateField', [
        "SyntaxError: mismatched input 'project' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'inlinestats', 'keep', 'limit', 'mv_expand', 'rename', 'sort', 'stats', 'where'}",
      ]);
      testErrorsAndWarnings('from index | PROJECT stringField, numberField, dateField', [
        "SyntaxError: mismatched input 'PROJECT' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'inlinestats', 'keep', 'limit', 'mv_expand', 'rename', 'sort', 'stats', 'where'}",
      ]);
      testErrorsAndWarnings('from index | project missingField, numberField, dateField', [
        "SyntaxError: mismatched input 'project' expecting {'dissect', 'drop', 'enrich', 'eval', 'grok', 'inlinestats', 'keep', 'limit', 'mv_expand', 'rename', 'sort', 'stats', 'where'}",
      ]);
      testErrorsAndWarnings('from index | keep s*', []);
      testErrorsAndWarnings('from index | keep *Field', []);
      testErrorsAndWarnings('from index | keep s*Field', []);
      testErrorsAndWarnings('from index | keep string*Field', []);
      testErrorsAndWarnings('from index | keep s*, n*', []);
      testErrorsAndWarnings('from index | keep m*', ['Unknown column [m*]']);
      testErrorsAndWarnings('from index | keep *m', ['Unknown column [*m]']);
      testErrorsAndWarnings('from index | keep d*m', ['Unknown column [d*m]']);
      testErrorsAndWarnings(
        'from unsupported_index | keep unsupported_field',
        [],
        [
          'Field [unsupported_field] cannot be retrieved, it is unsupported or not indexed; returning null',
        ]
      );

      testErrorsAndWarnings(
        `FROM index | STATS ROUND(AVG(numberField * 1.5)), COUNT(*), MIN(numberField * 10) | KEEP \`MIN(numberField * 10)\``,
        []
      );
      testErrorsAndWarnings(
        `FROM index | STATS COUNT(*), MIN(numberField * 10), MAX(numberField)| KEEP \`COUNT(*)\``,
        []
      );
    });

    describe('drop', () => {
      testErrorsAndWarnings('from index | drop ', ["SyntaxError: missing ID_PATTERN at '<EOF>'"]);
      testErrorsAndWarnings('from index | drop stringField, numberField, dateField', []);
      testErrorsAndWarnings('from index | drop 4.5', [
        "SyntaxError: token recognition error at: '4'",
        "SyntaxError: token recognition error at: '5'",
        "SyntaxError: missing ID_PATTERN at '.'",
        "SyntaxError: missing ID_PATTERN at '<EOF>'",
      ]);
      testErrorsAndWarnings('from index | drop missingField, numberField, dateField', [
        'Unknown column [missingField]',
      ]);
      testErrorsAndWarnings('from index | drop `any#Char$Field`', []);
      testErrorsAndWarnings('from index | drop s*', []);
      testErrorsAndWarnings('from index | drop s**Field', []);
      testErrorsAndWarnings('from index | drop *Field*', []);
      testErrorsAndWarnings('from index | drop s*F*d', []);
      testErrorsAndWarnings('from index | drop *Field', []);
      testErrorsAndWarnings('from index | drop s*Field', []);
      testErrorsAndWarnings('from index | drop string*Field', []);
      testErrorsAndWarnings('from index | drop s*, n*', []);
      testErrorsAndWarnings('from index | drop m*', ['Unknown column [m*]']);
      testErrorsAndWarnings('from index | drop *m', ['Unknown column [*m]']);
      testErrorsAndWarnings('from index | drop d*m', ['Unknown column [d*m]']);
      testErrorsAndWarnings('from index | drop *', ['Removing all fields is not allowed [*]']);
      testErrorsAndWarnings('from index | drop stringField, *', [
        'Removing all fields is not allowed [*]',
      ]);
      testErrorsAndWarnings(
        'from index | drop @timestamp',
        [],
        ['Drop [@timestamp] will remove all time filters to the search results']
      );
      testErrorsAndWarnings(
        'from index | drop stringField, @timestamp',
        [],
        ['Drop [@timestamp] will remove all time filters to the search results']
      );
      testErrorsAndWarnings(
        `FROM index | STATS ROUND(AVG(numberField * 1.5)), COUNT(*), MIN(numberField * 10) | DROP \`MIN(numberField * 10)\``,
        []
      );
      testErrorsAndWarnings(
        `FROM index | STATS COUNT(*), MIN(numberField * 10), MAX(numberField)| DROP \`COUNT(*)\``,
        []
      );
    });

    describe('mv_expand', () => {
      testErrorsAndWarnings('from a_index | mv_expand ', [
        "SyntaxError: missing {UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} at '<EOF>'",
      ]);
      for (const type of ['string', 'number', 'date', 'boolean', 'ip']) {
        testErrorsAndWarnings(`from a_index | mv_expand ${type}Field`, []);
      }

      testErrorsAndWarnings('from a_index | mv_expand numberField, b', [
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
      testErrorsAndWarnings('from a_index | rename stringField', [
        "SyntaxError: mismatched input '<EOF>' expecting 'as'",
      ]);
      testErrorsAndWarnings('from a_index | rename a', [
        "SyntaxError: mismatched input '<EOF>' expecting 'as'",
        'Unknown column [a]',
      ]);
      testErrorsAndWarnings('from a_index | rename stringField as', [
        "SyntaxError: missing ID_PATTERN at '<EOF>'",
      ]);
      testErrorsAndWarnings('from a_index | rename missingField as', [
        "SyntaxError: missing ID_PATTERN at '<EOF>'",
        'Unknown column [missingField]',
      ]);
      testErrorsAndWarnings('from a_index | rename stringField as b', []);
      testErrorsAndWarnings('from a_index | rename stringField AS b', []);
      testErrorsAndWarnings('from a_index | rename stringField As b', []);
      testErrorsAndWarnings('from a_index | rename stringField As b, b AS c', []);
      testErrorsAndWarnings('from a_index | rename fn() as a', [
        "SyntaxError: token recognition error at: '('",
        "SyntaxError: token recognition error at: ')'",
        'Unknown column [fn]',
        'Unknown column [a]',
      ]);
      testErrorsAndWarnings(
        'from a_index | eval numberField + 1 | rename `numberField + 1` as a',
        []
      );
      testErrorsAndWarnings(
        'from a_index | stats avg(numberField) | rename `avg(numberField)` as avg0',
        []
      );
      testErrorsAndWarnings('from a_index |eval numberField + 1 | rename `numberField + 1` as ', [
        "SyntaxError: missing ID_PATTERN at '<EOF>'",
      ]);
      testErrorsAndWarnings('from a_index | rename s* as strings', [
        'Using wildcards (*) in RENAME is not allowed [s*]',
        'Unknown column [strings]',
      ]);
      testErrorsAndWarnings('row a = 10 | rename a as `this``is fine`', []);
      testErrorsAndWarnings('row a = 10 | rename a as this is fine', [
        "SyntaxError: mismatched input 'is' expecting <EOF>",
      ]);
    });

    describe('dissect', () => {
      testErrorsAndWarnings('from a_index | dissect', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | dissect stringField', [
        "SyntaxError: missing QUOTED_STRING at '<EOF>'",
      ]);
      testErrorsAndWarnings('from a_index | dissect stringField 2', [
        "SyntaxError: mismatched input '2' expecting QUOTED_STRING",
      ]);
      testErrorsAndWarnings('from a_index | dissect stringField .', [
        "SyntaxError: mismatched input '<EOF>' expecting {UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
        'Unknown column [stringField.]',
      ]);
      testErrorsAndWarnings('from a_index | dissect stringField %a', [
        "SyntaxError: mismatched input '%' expecting QUOTED_STRING",
        "SyntaxError: mismatched input '<EOF>' expecting '='",
      ]);
      // Do not try to validate the dissect pattern string
      testErrorsAndWarnings('from a_index | dissect stringField "%{firstWord}"', []);
      testErrorsAndWarnings('from a_index | dissect numberField "%{firstWord}"', [
        'DISSECT only supports string type values, found [numberField] of type [number]',
      ]);
      testErrorsAndWarnings('from a_index | dissect stringField "%{firstWord}" option ', [
        "SyntaxError: mismatched input '<EOF>' expecting '='",
      ]);
      testErrorsAndWarnings('from a_index | dissect stringField "%{firstWord}" option = ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', 'null', '?', 'true', '+', '-', OPENING_BRACKET}",
        'Invalid option for DISSECT: [option]',
      ]);
      testErrorsAndWarnings('from a_index | dissect stringField "%{firstWord}" option = 1', [
        'Invalid option for DISSECT: [option]',
      ]);
      testErrorsAndWarnings(
        'from a_index | dissect stringField "%{firstWord}" append_separator = "-"',
        []
      );
      testErrorsAndWarnings(
        'from a_index | dissect stringField "%{firstWord}" ignore_missing = true',
        ['Invalid option for DISSECT: [ignore_missing]']
      );
      testErrorsAndWarnings(
        'from a_index | dissect stringField "%{firstWord}" append_separator = true',
        ['Invalid value for DISSECT append_separator: expected a string, but was [true]']
      );
      testErrorsAndWarnings(
        'from a_index | dissect stringField "%{firstWord}" | keep firstWord',
        []
      );
      // testErrorsAndWarnings('from a_index | dissect s* "%{a}"', [
      //   'Using wildcards (*) in dissect is not allowed [s*]',
      // ]);
    });

    describe('grok', () => {
      testErrorsAndWarnings('from a_index | grok', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | grok stringField', [
        "SyntaxError: missing QUOTED_STRING at '<EOF>'",
      ]);
      testErrorsAndWarnings('from a_index | grok stringField 2', [
        "SyntaxError: mismatched input '2' expecting QUOTED_STRING",
      ]);
      testErrorsAndWarnings('from a_index | grok stringField .', [
        "SyntaxError: mismatched input '<EOF>' expecting {UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
        'Unknown column [stringField.]',
      ]);
      testErrorsAndWarnings('from a_index | grok stringField %a', [
        "SyntaxError: mismatched input '%' expecting QUOTED_STRING",
      ]);
      // Do not try to validate the grok pattern string
      testErrorsAndWarnings('from a_index | grok stringField "%{firstWord}"', []);
      testErrorsAndWarnings('from a_index | grok numberField "%{firstWord}"', [
        'GROK only supports string type values, found [numberField] of type [number]',
      ]);
      testErrorsAndWarnings('from a_index | grok stringField "%{firstWord}" | keep firstWord', []);
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
        testErrorsAndWarnings(`from a_index | where numberField ${op} 0`, []);
        testErrorsAndWarnings(`from a_index | where NOT numberField ${op} 0`, []);
        testErrorsAndWarnings(`from a_index | where (numberField ${op} 0)`, []);
        testErrorsAndWarnings(`from a_index | where (NOT (numberField ${op} 0))`, []);
        testErrorsAndWarnings(`from a_index | where 1 ${op} 0`, []);

        for (const type of ['string', 'number', 'date', 'boolean', 'ip']) {
          testErrorsAndWarnings(
            `from a_index | where ${type}Field ${op} ${type}Field`,
            type !== 'boolean' || ['==', '!='].includes(op)
              ? []
              : [
                  `Argument of [${op}] must be [number], found value [${type}Field] type [${type}]`,
                  `Argument of [${op}] must be [number], found value [${type}Field] type [${type}]`,
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
            testErrorsAndWarnings(`from a_index | where ${unaryCombination} numberField > 0`, []);
            testErrorsAndWarnings(
              `from a_index | where ${unaryCombination} round(numberField) > 0`,
              []
            );
            testErrorsAndWarnings(
              `from a_index | where 1 + ${unaryCombination} numberField > 0`,
              []
            );
            // still valid
            testErrorsAndWarnings(`from a_index | where 1 ${unaryCombination} numberField > 0`, []);
          }
        }
        testErrorsAndWarnings(
          `from a_index | where ${Array(nesting).fill('not ').join('')} booleanField`,
          []
        );
      }
      for (const wrongOp of ['*', '/', '%']) {
        testErrorsAndWarnings(`from a_index | where ${wrongOp}+ numberField`, [
          `SyntaxError: extraneous input '${wrongOp}' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}`,
        ]);
      }

      // Skip these tests until the insensitive case equality gets restored back
      testErrorsAndWarnings.skip(`from a_index | where numberField =~ 0`, [
        'Argument of [=~] must be [string], found value [numberField] type [number]',
        'Argument of [=~] must be [string], found value [0] type [number]',
      ]);
      testErrorsAndWarnings.skip(`from a_index | where NOT numberField =~ 0`, [
        'Argument of [=~] must be [string], found value [numberField] type [number]',
        'Argument of [=~] must be [string], found value [0] type [number]',
      ]);
      testErrorsAndWarnings.skip(`from a_index | where (numberField =~ 0)`, [
        'Argument of [=~] must be [string], found value [numberField] type [number]',
        'Argument of [=~] must be [string], found value [0] type [number]',
      ]);
      testErrorsAndWarnings.skip(`from a_index | where (NOT (numberField =~ 0))`, [
        'Argument of [=~] must be [string], found value [numberField] type [number]',
        'Argument of [=~] must be [string], found value [0] type [number]',
      ]);
      testErrorsAndWarnings.skip(`from a_index | where 1 =~ 0`, [
        'Argument of [=~] must be [string], found value [1] type [number]',
        'Argument of [=~] must be [string], found value [0] type [number]',
      ]);
      testErrorsAndWarnings.skip(`from a_index | eval stringField =~ 0`, [
        `Argument of [=~] must be [string], found value [0] type [number]`,
      ]);

      for (const op of ['like', 'rlike']) {
        testErrorsAndWarnings(`from a_index | where stringField ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | where stringField NOT ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | where NOT stringField ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | where NOT stringField NOT ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | where numberField ${op} "?a"`, [
          `Argument of [${op}] must be [string], found value [numberField] type [number]`,
        ]);
        testErrorsAndWarnings(`from a_index | where numberField NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [string], found value [numberField] type [number]`,
        ]);
        testErrorsAndWarnings(`from a_index | where NOT numberField ${op} "?a"`, [
          `Argument of [${op}] must be [string], found value [numberField] type [number]`,
        ]);
        testErrorsAndWarnings(`from a_index | where NOT numberField NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [string], found value [numberField] type [number]`,
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
        testErrorsAndWarnings(`from a_index | where ${camelCase(field)}Field IS NULL`, []);
        testErrorsAndWarnings(`from a_index | where ${camelCase(field)}Field IS null`, []);
        testErrorsAndWarnings(`from a_index | where ${camelCase(field)}Field is null`, []);
        testErrorsAndWarnings(`from a_index | where ${camelCase(field)}Field is NULL`, []);
        testErrorsAndWarnings(`from a_index | where ${camelCase(field)}Field IS NOT NULL`, []);
        testErrorsAndWarnings(`from a_index | where ${camelCase(field)}Field IS NOT null`, []);
        testErrorsAndWarnings(`from a_index | where ${camelCase(field)}Field IS not NULL`, []);
        testErrorsAndWarnings(`from a_index | where ${camelCase(field)}Field Is nOt NuLL`, []);
      }

      // this is a scenario that was failing because "or" didn't accept "null"
      testErrorsAndWarnings('from a_index | where stringField == "a" or null', []);
    });

    describe('eval', () => {
      testErrorsAndWarnings('from a_index | eval ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | eval stringField ', []);
      testErrorsAndWarnings('from a_index | eval b = stringField', []);
      testErrorsAndWarnings('from a_index | eval numberField + 1', []);
      testErrorsAndWarnings('from a_index | eval numberField + ', [
        "SyntaxError: no viable alternative at input 'numberField + '",
      ]);
      testErrorsAndWarnings('from a_index | eval stringField + 1', [
        'Argument of [+] must be [number], found value [stringField] type [string]',
      ]);
      testErrorsAndWarnings('from a_index | eval a=b', ['Unknown column [b]']);
      testErrorsAndWarnings('from a_index | eval a=b, ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
        'Unknown column [b]',
      ]);
      testErrorsAndWarnings('from a_index | eval a=round', ['Unknown column [round]']);
      testErrorsAndWarnings('from a_index | eval a=round(', [
        "SyntaxError: no viable alternative at input 'round('",
      ]);
      testErrorsAndWarnings('from a_index | eval a=round(numberField) ', []);
      testErrorsAndWarnings('from a_index | eval a=round(numberField), ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | eval a=round(numberField) + round(numberField) ', []);
      testErrorsAndWarnings('from a_index | eval a=round(numberField) + round(stringField) ', [
        'Argument of [round] must be [number], found value [stringField] type [string]',
      ]);
      testErrorsAndWarnings(
        'from a_index | eval a=round(numberField) + round(stringField), numberField  ',
        ['Argument of [round] must be [number], found value [stringField] type [string]']
      );
      testErrorsAndWarnings(
        'from a_index | eval a=round(numberField) + round(numberField), numberField  ',
        []
      );
      testErrorsAndWarnings(
        'from a_index | eval a=round(numberField) + round(numberField), b = numberField  ',
        []
      );

      testErrorsAndWarnings('from a_index | eval a=[1, 2, 3]', []);
      testErrorsAndWarnings('from a_index | eval a=[true, false]', []);
      testErrorsAndWarnings('from a_index | eval a=["a", "b"]', []);
      testErrorsAndWarnings('from a_index | eval a=null', []);

      for (const field of fieldTypes) {
        testErrorsAndWarnings(`from a_index | eval ${camelCase(field)}Field IS NULL`, []);
        testErrorsAndWarnings(`from a_index | eval ${camelCase(field)}Field IS null`, []);
        testErrorsAndWarnings(`from a_index | eval ${camelCase(field)}Field is null`, []);
        testErrorsAndWarnings(`from a_index | eval ${camelCase(field)}Field is NULL`, []);
        testErrorsAndWarnings(`from a_index | eval ${camelCase(field)}Field IS NOT NULL`, []);
        testErrorsAndWarnings(`from a_index | eval ${camelCase(field)}Field IS NOT null`, []);
        testErrorsAndWarnings(`from a_index | eval ${camelCase(field)}Field IS not NULL`, []);
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
            testErrorsAndWarnings(`from a_index | eval ${unaryCombination} numberField`, []);
            testErrorsAndWarnings(`from a_index | eval a=${unaryCombination} numberField`, []);
            testErrorsAndWarnings(
              `from a_index | eval a=${unaryCombination} round(numberField)`,
              []
            );
            testErrorsAndWarnings(`from a_index | eval 1 + ${unaryCombination} numberField`, []);
            // still valid
            testErrorsAndWarnings(`from a_index | eval 1 ${unaryCombination} numberField`, []);
          }
        }

        testErrorsAndWarnings(
          `from a_index | eval ${Array(nesting).fill('not ').join('')} booleanField`,
          []
        );
      }

      for (const wrongOp of ['*', '/', '%']) {
        testErrorsAndWarnings(`from a_index | eval ${wrongOp}+ numberField`, [
          `SyntaxError: extraneous input '${wrongOp}' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}`,
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
        testErrorsAndWarnings(`from a_index | eval numberField ${op} 0`, []);
        testErrorsAndWarnings(`from a_index | eval NOT numberField ${op} 0`, []);
        testErrorsAndWarnings(`from a_index | eval (numberField ${op} 0)`, []);
        testErrorsAndWarnings(`from a_index | eval (NOT (numberField ${op} 0))`, []);
        testErrorsAndWarnings(`from a_index | eval 1 ${op} 0`, []);
        for (const type of ['string', 'number', 'date', 'boolean', 'ip']) {
          testErrorsAndWarnings(
            `from a_index | eval ${type}Field ${op} ${type}Field`,
            type !== 'boolean' || ['==', '!='].includes(op)
              ? []
              : [
                  `Argument of [${op}] must be [number], found value [${type}Field] type [${type}]`,
                  `Argument of [${op}] must be [number], found value [${type}Field] type [${type}]`,
                ]
          );
        }
        // Implicit casting of literal values tests
        testErrorsAndWarnings(`from a_index | eval numberField ${op} stringField`, [
          `Argument of [${op}] must be [number], found value [stringField] type [string]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval stringField ${op} numberField`, [
          `Argument of [${op}] must be [number], found value [stringField] type [string]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval numberField ${op} "2022"`, [
          `Argument of [${op}] must be [number], found value ["2022"] type [string]`,
        ]);

        testErrorsAndWarnings(`from a_index | eval dateField ${op} stringField`, [
          `Argument of [${op}] must be [string], found value [dateField] type [date]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval stringField ${op} dateField`, [
          `Argument of [${op}] must be [string], found value [dateField] type [date]`,
        ]);

        // Check that the implicit cast doesn't apply for fields
        testErrorsAndWarnings(`from a_index | eval stringField ${op} 0`, [
          `Argument of [${op}] must be [number], found value [stringField] type [string]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval stringField ${op} now()`, [
          `Argument of [${op}] must be [string], found value [now()] type [date]`,
        ]);

        testErrorsAndWarnings(`from a_index | eval dateField ${op} "2022"`, []);
        testErrorsAndWarnings(`from a_index | eval "2022" ${op} dateField`, []);

        testErrorsAndWarnings(`from a_index | eval versionField ${op} "1.2.3"`, []);
        testErrorsAndWarnings(`from a_index | eval "1.2.3" ${op} versionField`, []);

        testErrorsAndWarnings(
          `from a_index | eval booleanField ${op} "true"`,
          ['==', '!='].includes(op)
            ? []
            : [`Argument of [${op}] must be [string], found value [booleanField] type [boolean]`]
        );
        testErrorsAndWarnings(
          `from a_index | eval "true" ${op} booleanField`,
          ['==', '!='].includes(op)
            ? []
            : [`Argument of [${op}] must be [string], found value [booleanField] type [boolean]`]
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
        testErrorsAndWarnings(`from a_index | eval numberField ${op} 1`, []);
        testErrorsAndWarnings(`from a_index | eval (numberField ${op} 1)`, []);
        testErrorsAndWarnings(`from a_index | eval 1 ${op} 1`, []);
        testErrorsAndWarnings(
          `from a_index | eval now() ${op} now()`,
          ['+', '-'].includes(op)
            ? [`Argument of [${op}] must be [time_literal], found value [now()] type [date]`]
            : [
                `Argument of [${op}] must be [number], found value [now()] type [date]`,
                `Argument of [${op}] must be [number], found value [now()] type [date]`,
              ]
        );

        testErrorsAndWarnings(`from a_index | eval 1 ${op} "1"`, [
          `Argument of [${op}] must be [number], found value [\"1\"] type [string]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval "1" ${op} 1`, [
          `Argument of [${op}] must be [number], found value [\"1\"] type [string]`,
        ]);
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
        testErrorsAndWarnings(`from a_index | eval stringField ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | eval stringField NOT ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | eval NOT stringField ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | eval NOT stringField NOT ${op} "?a"`, []);
        testErrorsAndWarnings(`from a_index | eval numberField ${op} "?a"`, [
          `Argument of [${op}] must be [string], found value [numberField] type [number]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval numberField NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [string], found value [numberField] type [number]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval NOT numberField ${op} "?a"`, [
          `Argument of [${op}] must be [string], found value [numberField] type [number]`,
        ]);
        testErrorsAndWarnings(`from a_index | eval NOT numberField NOT ${op} "?a"`, [
          `Argument of [not_${op}] must be [string], found value [numberField] type [number]`,
        ]);
      }
      // test lists
      testErrorsAndWarnings('from a_index | eval 1 in (1, 2, 3)', []);
      testErrorsAndWarnings('from a_index | eval numberField in (1, 2, 3)', []);
      testErrorsAndWarnings('from a_index | eval numberField not in (1, 2, 3)', []);
      testErrorsAndWarnings('from a_index | eval numberField not in (1, 2, 3, numberField)', []);
      testErrorsAndWarnings('from a_index | eval 1 in (1, 2, 3, round(numberField))', []);
      testErrorsAndWarnings('from a_index | eval "a" in ("a", "b", "c")', []);
      testErrorsAndWarnings('from a_index | eval stringField in ("a", "b", "c")', []);
      testErrorsAndWarnings('from a_index | eval stringField not in ("a", "b", "c")', []);
      testErrorsAndWarnings(
        'from a_index | eval stringField not in ("a", "b", "c", stringField)',
        []
      );
      testErrorsAndWarnings('from a_index | eval 1 in ("a", "b", "c")', [
        // 'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
      ]);
      testErrorsAndWarnings('from a_index | eval numberField in ("a", "b", "c")', [
        // 'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
      ]);
      testErrorsAndWarnings('from a_index | eval numberField not in ("a", "b", "c")', [
        // 'Argument of [not_in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
      ]);
      testErrorsAndWarnings('from a_index | eval numberField not in (1, 2, 3, stringField)', [
        // 'Argument of [not_in] must be [number[]], found value [(1, 2, 3, stringField)] type [(number, number, number, string)]',
      ]);

      testErrorsAndWarnings('from a_index | eval avg(numberField)', [
        'EVAL does not support function avg',
      ]);
      testErrorsAndWarnings(
        'from a_index | stats avg(numberField) | eval `avg(numberField)` + 1',
        []
      );
      testErrorsAndWarnings('from a_index | eval not', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
        'Error: [not] function expects exactly one argument, got 0.',
      ]);
      testErrorsAndWarnings('from a_index | eval in', [
        "SyntaxError: mismatched input 'in' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);

      testErrorsAndWarnings('from a_index | eval stringField in stringField', [
        "SyntaxError: missing '(' at 'stringField'",
        "SyntaxError: mismatched input '<EOF>' expecting {',', ')'}",
      ]);

      testErrorsAndWarnings('from a_index | eval stringField in stringField)', [
        "SyntaxError: missing '(' at 'stringField'",
        'Error: [in] function expects exactly 2 arguments, got 1.',
      ]);
      testErrorsAndWarnings('from a_index | eval stringField not in stringField', [
        "SyntaxError: missing '(' at 'stringField'",
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
        for (const timeLiteral of timeLiterals) {
          testErrorsAndWarnings(`from a_index | eval 1 ${timeLiteral.name}`, [
            `EVAL does not support [date_period] in expression [1 ${timeLiteral.name}]`,
          ]);
          testErrorsAndWarnings(`from a_index | eval 1                ${timeLiteral.name}`, [
            `EVAL does not support [date_period] in expression [1 ${timeLiteral.name}]`,
          ]);

          // this is not possible for now
          // testErrorsAndWarnings(`from a_index | eval var = 1 ${timeLiteral.name}`, [
          //   `Eval does not support [date_period] in expression [1 ${timeLiteral.name}]`,
          // ]);
          testErrorsAndWarnings(`from a_index | eval var = now() - 1 ${timeLiteral.name}`, []);
          testErrorsAndWarnings(`from a_index | eval var = dateField - 1 ${timeLiteral.name}`, []);
          testErrorsAndWarnings(
            `from a_index | eval var = dateField - 1 ${timeLiteral.name.toUpperCase()}`,
            []
          );
          testErrorsAndWarnings(
            `from a_index | eval var = dateField - 1 ${capitalize(timeLiteral.name)}`,
            []
          );
          testErrorsAndWarnings(`from a_index | eval var = dateField + 1 ${timeLiteral.name}`, []);
          testErrorsAndWarnings(`from a_index | eval 1 ${timeLiteral.name} + 1 year`, [
            `Argument of [+] must be [date], found value [1 ${timeLiteral.name}] type [duration]`,
          ]);
          for (const op of ['*', '/', '%']) {
            testErrorsAndWarnings(`from a_index | eval var = now() ${op} 1 ${timeLiteral.name}`, [
              `Argument of [${op}] must be [number], found value [now()] type [date]`,
              `Argument of [${op}] must be [number], found value [1 ${timeLiteral.name}] type [duration]`,
            ]);
          }
        }
      });
    });

    describe('stats', () => {
      testErrorsAndWarnings('from a_index | stats ', [
        'At least one aggregation or grouping expression required in [STATS]',
      ]);
      testErrorsAndWarnings('from a_index | stats by stringField', []);
      testErrorsAndWarnings('from a_index | stats by ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | stats numberField ', [
        'Expected an aggregate function or group but got [numberField] of type [FieldAttribute]',
      ]);
      testErrorsAndWarnings('from a_index | stats numberField=', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | stats numberField=5 by ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | stats avg(numberField) by wrongField', [
        'Unknown column [wrongField]',
      ]);
      testErrorsAndWarnings('from a_index | stats avg(numberField) by wrongField + 1', [
        'Unknown column [wrongField]',
      ]);
      testErrorsAndWarnings('from a_index | stats avg(numberField) by var0 = wrongField + 1', [
        'Unknown column [wrongField]',
      ]);
      testErrorsAndWarnings('from a_index | stats avg(numberField) by 1', []);
      testErrorsAndWarnings('from a_index | stats avg(numberField) by percentile(numberField)', [
        'STATS BY does not support function percentile',
      ]);
      testErrorsAndWarnings('from a_index | stats count(`numberField`)', []);

      // this is a scenario that was failing because "or" didn't accept "null"
      testErrorsAndWarnings('from a_index | stats count(stringField == "a" or null)', []);

      for (const subCommand of ['keep', 'drop', 'eval']) {
        testErrorsAndWarnings(
          `from a_index | stats count(\`numberField\`) | ${subCommand} \`count(\`\`numberField\`\`)\` `,
          []
        );
      }

      testErrorsAndWarnings(
        'from a_index | stats avg(numberField) by stringField, percentile(numberField) by ipField',
        [
          "SyntaxError: mismatched input 'by' expecting <EOF>",
          'STATS BY does not support function percentile',
        ]
      );

      testErrorsAndWarnings(
        'from a_index | stats avg(numberField), percentile(numberField, 50) by ipField',
        []
      );

      testErrorsAndWarnings(
        'from a_index | stats avg(numberField), percentile(numberField, 50) BY ipField',
        []
      );
      for (const op of ['+', '-', '*', '/', '%']) {
        testErrorsAndWarnings(
          `from a_index | stats avg(numberField) ${op} percentile(numberField, 50) BY ipField`,
          []
        );
      }
      testErrorsAndWarnings('from a_index | stats count(* + 1) BY ipField', [
        "SyntaxError: no viable alternative at input 'count(* +'",
      ]);
      testErrorsAndWarnings('from a_index | stats count(* + round(numberField)) BY ipField', [
        "SyntaxError: no viable alternative at input 'count(* +'",
      ]);
      testErrorsAndWarnings('from a_index | stats count(round(*)) BY ipField', [
        'Using wildcards (*) in round is not allowed',
      ]);
      testErrorsAndWarnings('from a_index | stats count(count(*)) BY ipField', [
        `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [number]`,
      ]);
      testErrorsAndWarnings('from a_index | stats numberField + 1', [
        'At least one aggregation function required in [STATS], found [numberField+1]',
      ]);

      for (const nesting of NESTED_DEPTHS) {
        const moreBuiltinWrapping = Array(nesting).fill('+1').join('');
        testErrorsAndWarnings(
          `from a_index | stats 5 + avg(numberField) ${moreBuiltinWrapping}`,
          []
        );
        testErrorsAndWarnings(
          `from a_index | stats 5 ${moreBuiltinWrapping} + avg(numberField)`,
          []
        );
        testErrorsAndWarnings(`from a_index | stats 5 ${moreBuiltinWrapping} + numberField`, [
          `At least one aggregation function required in [STATS], found [5${moreBuiltinWrapping}+numberField]`,
        ]);
        testErrorsAndWarnings(`from a_index | stats 5 + numberField ${moreBuiltinWrapping}`, [
          `At least one aggregation function required in [STATS], found [5+numberField${moreBuiltinWrapping}]`,
        ]);
        testErrorsAndWarnings(
          `from a_index | stats 5 + numberField ${moreBuiltinWrapping}, var0 = sum(numberField)`,
          [
            `At least one aggregation function required in [STATS], found [5+numberField${moreBuiltinWrapping}]`,
          ]
        );
        const evalFnWrapping = Array(nesting).fill('round(').join('');
        const closingWrapping = Array(nesting).fill(')').join('');
        // stress test the validation of the nesting check here
        testErrorsAndWarnings(
          `from a_index | stats ${evalFnWrapping} sum(numberField) ${closingWrapping}`,
          []
        );
        testErrorsAndWarnings(
          `from a_index | stats ${evalFnWrapping} sum(numberField) ${closingWrapping} + ${evalFnWrapping} sum(numberField) ${closingWrapping}`,
          []
        );
        testErrorsAndWarnings(
          `from a_index | stats ${evalFnWrapping} numberField + sum(numberField) ${closingWrapping}`,
          [
            `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalFnWrapping}numberField+sum(numberField)${closingWrapping}]`,
          ]
        );
        testErrorsAndWarnings(
          `from a_index | stats ${evalFnWrapping} numberField + sum(numberField) ${closingWrapping}, var0 = sum(numberField)`,
          [
            `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalFnWrapping}numberField+sum(numberField)${closingWrapping}]`,
          ]
        );
        testErrorsAndWarnings(
          `from a_index | stats var0 = ${evalFnWrapping} numberField + sum(numberField) ${closingWrapping}, var1 = sum(numberField)`,
          [
            `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalFnWrapping}numberField+sum(numberField)${closingWrapping}]`,
          ]
        );
        testErrorsAndWarnings(
          `from a_index | stats ${evalFnWrapping} sum(numberField + numberField) ${closingWrapping}`,
          []
        );
        testErrorsAndWarnings(
          `from a_index | stats ${evalFnWrapping} sum(numberField + round(numberField)) ${closingWrapping}`,
          []
        );
        testErrorsAndWarnings(
          `from a_index | stats ${evalFnWrapping} sum(numberField + round(numberField)) ${closingWrapping} + ${evalFnWrapping} sum(numberField + round(numberField)) ${closingWrapping}`,
          []
        );
        testErrorsAndWarnings(
          `from a_index | stats sum(${evalFnWrapping} numberField ${closingWrapping} )`,
          []
        );
        testErrorsAndWarnings(
          `from a_index | stats sum(${evalFnWrapping} numberField ${closingWrapping} ) + sum(${evalFnWrapping} numberField ${closingWrapping} )`,
          []
        );
      }

      testErrorsAndWarnings('from a_index | stats 5 + numberField + 1', [
        'At least one aggregation function required in [STATS], found [5+numberField+1]',
      ]);

      testErrorsAndWarnings('from a_index | stats numberField + 1 by ipField', [
        'At least one aggregation function required in [STATS], found [numberField+1]',
      ]);

      testErrorsAndWarnings(
        'from a_index | stats avg(numberField), percentile(numberField, 50) + 1 by ipField',
        []
      );

      testErrorsAndWarnings('from a_index | stats count(*)', []);
      testErrorsAndWarnings('from a_index | stats count()', []);
      testErrorsAndWarnings('from a_index | stats var0 = count(*)', []);
      testErrorsAndWarnings('from a_index | stats var0 = count()', []);
      testErrorsAndWarnings('from a_index | stats var0 = avg(numberField), count(*)', []);
      testErrorsAndWarnings('from a_index | stats var0 = avg(fn(number)), count(*)', [
        'Unknown function [fn]',
      ]);

      // test all not allowed combinations
      testErrorsAndWarnings('from a_index | STATS sum( numberField ) + abs( numberField ) ', [
        'Cannot combine aggregation and non-aggregation values in [STATS], found [sum(numberField)+abs(numberField)]',
      ]);
      testErrorsAndWarnings('from a_index | STATS abs( numberField + sum( numberField )) ', [
        'Cannot combine aggregation and non-aggregation values in [STATS], found [abs(numberField+sum(numberField))]',
      ]);

      testErrorsAndWarnings(
        `FROM index
    | EVAL numberField * 3.281
    | STATS avg_numberField = AVG(\`numberField * 3.281\`)`,
        []
      );

      testErrorsAndWarnings(
        `FROM index | STATS AVG(numberField) by round(numberField) + 1 | EVAL \`round(numberField) + 1\` / 2`,
        []
      );

      testErrorsAndWarnings(`from a_index | stats sum(case(false, 0, 1))`, []);
      testErrorsAndWarnings(`from a_index | stats var0 = sum( case(false, 0, 1))`, []);

      describe('constant-only parameters', () => {
        testErrorsAndWarnings('from index | stats by bucket(dateField, abs(numberField), "", "")', [
          'Argument of [bucket] must be a constant, received [abs(numberField)]',
        ]);
        testErrorsAndWarnings(
          'from index | stats by bucket(dateField, abs(length(numberField)), "", "")',
          ['Argument of [bucket] must be a constant, received [abs(length(numberField))]']
        );
        testErrorsAndWarnings('from index | stats by bucket(dateField, pi(), "", "")', []);
        testErrorsAndWarnings('from index | stats by bucket(dateField, 1 + 30 / 10, "", "")', []);
        testErrorsAndWarnings(
          'from index | stats by bucket(dateField, 1 + 30 / 10, concat("", ""), "")',
          []
        );
        testErrorsAndWarnings(
          'from index | stats by bucket(dateField, numberField, stringField, stringField)',
          [
            'Argument of [bucket] must be a constant, received [numberField]',
            'Argument of [bucket] must be a constant, received [stringField]',
            'Argument of [bucket] must be a constant, received [stringField]',
          ]
        );
      });
    });

    describe('sort', () => {
      testErrorsAndWarnings('from a_index | sort ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | sort "field" ', []);
      testErrorsAndWarnings('from a_index | sort wrongField ', ['Unknown column [wrongField]']);
      testErrorsAndWarnings('from a_index | sort numberField, ', [
        "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', '(', 'not', 'null', '?', 'true', '+', '-', OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | sort numberField, stringField', []);
      for (const dir of ['desc', 'asc']) {
        testErrorsAndWarnings(`from a_index | sort "field" ${dir} `, []);
        testErrorsAndWarnings(`from a_index | sort numberField ${dir} `, []);
        testErrorsAndWarnings(`from a_index | sort numberField ${dir} nulls `, [
          "SyntaxError: missing {'first', 'last'} at '<EOF>'",
        ]);
        for (const nullDir of ['first', 'last']) {
          testErrorsAndWarnings(`from a_index | sort numberField ${dir} nulls ${nullDir}`, []);
          testErrorsAndWarnings(`from a_index | sort numberField ${dir} ${nullDir}`, [
            `SyntaxError: extraneous input '${nullDir}' expecting <EOF>`,
          ]);
        }
      }
      for (const nullDir of ['first', 'last']) {
        testErrorsAndWarnings(`from a_index | sort numberField nulls ${nullDir}`, []);
        testErrorsAndWarnings(`from a_index | sort numberField ${nullDir}`, [
          `SyntaxError: extraneous input '${nullDir}' expecting <EOF>`,
        ]);
      }
      testErrorsAndWarnings(`row a = 1 | stats COUNT(*) | sort \`COUNT(*)\``, []);
      testErrorsAndWarnings(`ROW a = 1 | STATS couNt(*) | SORT \`couNt(*)\``, []);

      describe('sorting by expressions', () => {
        // SORT accepts complex expressions
        testErrorsAndWarnings(
          'from a_index | sort abs(numberField) - to_long(stringField) desc nulls first',
          []
        );

        // Expression parts are also validated
        testErrorsAndWarnings('from a_index | sort sin(stringField)', [
          'Argument of [sin] must be [number], found value [stringField] type [string]',
        ]);

        // Expression parts are also validated
        testErrorsAndWarnings('from a_index | sort numberField + stringField', [
          'Argument of [+] must be [number], found value [stringField] type [string]',
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
        "SyntaxError: mismatched input '`this``is fine`' expecting ENRICH_POLICY_NAME",
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
      testErrorsAndWarnings(`from a_index | enrich policy on stringField with `, [
        "SyntaxError: mismatched input '<EOF>' expecting ID_PATTERN",
      ]);
      testErrorsAndWarnings(`from a_index | enrich policy on stringField with var0 `, [
        'Unknown column [var0]',
      ]);
      testErrorsAndWarnings(`from a_index |enrich policy on numberField with var0 = `, [
        "SyntaxError: missing ID_PATTERN at '<EOF>'",
        'Unknown column [var0]',
      ]);
      testErrorsAndWarnings(`from a_index | enrich policy on stringField with var0 = c `, [
        'Unknown column [var0]',
        `Unknown column [c]`,
      ]);
      // need to re-enable once the fields/variables become location aware
      // testErrorsAndWarnings(`from a_index | enrich policy on stringField with var0 = stringField `, [
      //   `Unknown column [stringField]`,
      // ]);
      testErrorsAndWarnings(`from a_index |enrich policy on numberField with var0 = , `, [
        "SyntaxError: missing ID_PATTERN at ','",
        "SyntaxError: mismatched input '<EOF>' expecting ID_PATTERN",
        'Unknown column [var0]',
      ]);
      testErrorsAndWarnings(
        `from a_index | enrich policy on stringField with var0 = otherField, var1 `,
        ['Unknown column [var1]']
      );
      testErrorsAndWarnings(
        `from a_index | enrich policy on stringField with var0 = otherField `,
        []
      );
      testErrorsAndWarnings(
        `from a_index | enrich policy on stringField with var0 = otherField, yetAnotherField `,
        []
      );
      testErrorsAndWarnings(
        `from a_index |enrich policy on numberField with var0 = otherField, var1 = `,
        ["SyntaxError: missing ID_PATTERN at '<EOF>'", 'Unknown column [var1]']
      );

      testErrorsAndWarnings(
        `from a_index | enrich policy on stringField with var0 = otherField, var1 = yetAnotherField`,
        []
      );
      testErrorsAndWarnings(
        'from a_index | enrich policy on stringField with var0 = otherField, `this``is fine` = yetAnotherField',
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
        'from a_index | eval stringField = 5',
        [],
        ['Column [stringField] of type string has been overwritten as new type: number']
      );
      testErrorsAndWarnings(
        'from a_index | eval numberField = "5"',
        [],
        ['Column [numberField] of type number has been overwritten as new type: string']
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
        const expr = 'round(numberField) + 1';
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

      it('should call fields callbacks also for meta command', async () => {
        const callbackMocks = getCallbackMocks();
        await validateQuery(
          `meta functions | keep name`,
          getAstAndSyntaxErrors,
          undefined,
          callbackMocks
        );
        expect(callbackMocks.getSources).not.toHaveBeenCalled();
        expect(callbackMocks.getPolicies).not.toHaveBeenCalled();
        expect(callbackMocks.getFieldsFor).toHaveBeenCalledTimes(1);
        expect(callbackMocks.getFieldsFor).toHaveBeenLastCalledWith({
          query: 'meta functions',
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
            `from a_index | eval b  = a | enrich policy | dissect stringField "%{firstWord}"`,
            getAstAndSyntaxErrors,
            undefined,
            {
              getFieldsFor: undefined,
              getSources: undefined,
              getPolicies: undefined,
              getMetaFields: undefined,
            }
          );
        } catch {
          fail('Should not throw');
        }
      });

      it(`should not crash if no callbacks are passed`, async () => {
        try {
          await validateQuery(
            `from a_index | eval b  = a | enrich policy | dissect stringField "%{firstWord}"`,
            getAstAndSyntaxErrors
          );
        } catch {
          fail('Should not throw');
        }
      });
    });

    describe('functions', () => {
      // This section will expand in time, especially with https://github.com/elastic/kibana/issues/182390
      describe(FUNCTION_DESCRIBE_BLOCK_NAME, () => {
        testErrorsAndWarnings(
          `row var = date_diff("month", "2023-12-02T11:00:00.000Z", "2023-12-02T11:00:00.000Z")`,
          []
        );

        testErrorsAndWarnings(
          `row var = date_diff("mm", "2023-12-02T11:00:00.000Z", "2023-12-02T11:00:00.000Z")`,
          []
        );

        testErrorsAndWarnings(
          `row var = date_diff("bogus", "2023-12-02T11:00:00.000Z", "2023-12-02T11:00:00.000Z")`,
          [],
          [
            'Invalid option ["bogus"] for date_diff. Supported options: ["year", "years", "yy", "yyyy", "quarter", "quarters", "qq", "q", "month", "months", "mm", "m", "dayofyear", "dy", "y", "day", "days", "dd", "d", "week", "weeks", "wk", "ww", "weekday", "weekdays", "dw", "hour", "hours", "hh", "minute", "minutes", "mi", "n", "second", "seconds", "ss", "s", "millisecond", "milliseconds", "ms", "microsecond", "microseconds", "mcs", "nanosecond", "nanoseconds", "ns"].',
          ]
        );

        testErrorsAndWarnings(
          `from a_index | eval date_diff(stringField, "2023-12-02T11:00:00.000Z", "2023-12-02T11:00:00.000Z")`,
          []
        );

        testErrorsAndWarnings(
          `from a_index | eval date_diff("month", dateField, "2023-12-02T11:00:00.000Z")`,
          []
        );

        testErrorsAndWarnings(
          `from a_index | eval date_diff("month", "2023-12-02T11:00:00.000Z", dateField)`,
          []
        );

        testErrorsAndWarnings(`from a_index | eval date_diff("month", stringField, dateField)`, [
          'Argument of [date_diff] must be [date], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings(`from a_index | eval date_diff("month", dateField, stringField)`, [
          'Argument of [date_diff] must be [date], found value [stringField] type [string]',
        ]);
      });

      describe('abs', () => {
        testErrorsAndWarnings('row var = abs(5)', []);
        testErrorsAndWarnings('row abs(5)', []);
        testErrorsAndWarnings('row var = abs(to_integer("a"))', []);

        testErrorsAndWarnings('row var = abs("a")', [
          'Argument of [abs] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where abs(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where abs(stringField) > 0', [
          'Argument of [abs] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = abs(numberField)', []);
        testErrorsAndWarnings('from a_index | eval abs(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = abs(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval abs(stringField)', [
          'Argument of [abs] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval abs(numberField, extraArg)', [
          'Error: [abs] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = abs(*)', [
          'Using wildcards (*) in abs is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort abs(numberField)', []);
      });

      describe('acos', () => {
        testErrorsAndWarnings('row var = acos(5)', []);
        testErrorsAndWarnings('row acos(5)', []);
        testErrorsAndWarnings('row var = acos(to_integer("a"))', []);

        testErrorsAndWarnings('row var = acos("a")', [
          'Argument of [acos] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where acos(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where acos(stringField) > 0', [
          'Argument of [acos] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = acos(numberField)', []);
        testErrorsAndWarnings('from a_index | eval acos(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = acos(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval acos(stringField)', [
          'Argument of [acos] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval acos(numberField, extraArg)', [
          'Error: [acos] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = acos(*)', [
          'Using wildcards (*) in acos is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort acos(numberField)', []);
      });

      describe('asin', () => {
        testErrorsAndWarnings('row var = asin(5)', []);
        testErrorsAndWarnings('row asin(5)', []);
        testErrorsAndWarnings('row var = asin(to_integer("a"))', []);

        testErrorsAndWarnings('row var = asin("a")', [
          'Argument of [asin] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where asin(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where asin(stringField) > 0', [
          'Argument of [asin] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = asin(numberField)', []);
        testErrorsAndWarnings('from a_index | eval asin(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = asin(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval asin(stringField)', [
          'Argument of [asin] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval asin(numberField, extraArg)', [
          'Error: [asin] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = asin(*)', [
          'Using wildcards (*) in asin is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort asin(numberField)', []);
      });

      describe('atan', () => {
        testErrorsAndWarnings('row var = atan(5)', []);
        testErrorsAndWarnings('row atan(5)', []);
        testErrorsAndWarnings('row var = atan(to_integer("a"))', []);

        testErrorsAndWarnings('row var = atan("a")', [
          'Argument of [atan] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where atan(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where atan(stringField) > 0', [
          'Argument of [atan] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = atan(numberField)', []);
        testErrorsAndWarnings('from a_index | eval atan(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = atan(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval atan(stringField)', [
          'Argument of [atan] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval atan(numberField, extraArg)', [
          'Error: [atan] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = atan(*)', [
          'Using wildcards (*) in atan is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort atan(numberField)', []);
      });

      describe('atan2', () => {
        testErrorsAndWarnings('row var = atan2(5, 5)', []);
        testErrorsAndWarnings('row atan2(5, 5)', []);
        testErrorsAndWarnings('row var = atan2(to_integer("a"), to_integer("a"))', []);

        testErrorsAndWarnings('row var = atan2("a", "a")', [
          'Argument of [atan2] must be [number], found value ["a"] type [string]',
          'Argument of [atan2] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where atan2(numberField, numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where atan2(stringField, stringField) > 0', [
          'Argument of [atan2] must be [number], found value [stringField] type [string]',
          'Argument of [atan2] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = atan2(numberField, numberField)', []);
        testErrorsAndWarnings('from a_index | eval atan2(numberField, numberField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = atan2(to_integer(stringField), to_integer(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval atan2(stringField, stringField)', [
          'Argument of [atan2] must be [number], found value [stringField] type [string]',
          'Argument of [atan2] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval atan2(numberField, numberField, extraArg)', [
          'Error: [atan2] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort atan2(numberField, numberField)', []);
      });

      describe('case', () => {
        testErrorsAndWarnings('row var = case(true, "a")', []);
        testErrorsAndWarnings('row case(true, "a")', []);
        testErrorsAndWarnings('from a_index | eval var = case(booleanField, stringField)', []);
        testErrorsAndWarnings('from a_index | eval case(booleanField, stringField)', []);
        testErrorsAndWarnings('from a_index | sort case(booleanField, stringField)', []);
      });

      describe('ceil', () => {
        testErrorsAndWarnings('row var = ceil(5)', []);
        testErrorsAndWarnings('row ceil(5)', []);
        testErrorsAndWarnings('row var = ceil(to_integer("a"))', []);

        testErrorsAndWarnings('row var = ceil("a")', [
          'Argument of [ceil] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where ceil(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where ceil(stringField) > 0', [
          'Argument of [ceil] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = ceil(numberField)', []);
        testErrorsAndWarnings('from a_index | eval ceil(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = ceil(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval ceil(stringField)', [
          'Argument of [ceil] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval ceil(numberField, extraArg)', [
          'Error: [ceil] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = ceil(*)', [
          'Using wildcards (*) in ceil is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort ceil(numberField)', []);
      });

      describe('cidr_match', () => {
        testErrorsAndWarnings('row var = cidr_match(to_ip("127.0.0.1"), "a")', []);
        testErrorsAndWarnings('row cidr_match(to_ip("127.0.0.1"), "a")', []);
        testErrorsAndWarnings('row var = cidr_match(to_ip("a"), to_string("a"))', []);

        testErrorsAndWarnings('row var = cidr_match("a", 5)', [
          'Argument of [cidr_match] must be [ip], found value ["a"] type [string]',
          'Argument of [cidr_match] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = cidr_match(ipField, stringField)', []);
        testErrorsAndWarnings('from a_index | eval cidr_match(ipField, stringField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = cidr_match(to_ip(stringField), to_string(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval cidr_match(stringField, numberField)', [
          'Argument of [cidr_match] must be [ip], found value [stringField] type [string]',
          'Argument of [cidr_match] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | sort cidr_match(ipField, stringField)', []);
      });

      describe('coalesce', () => {
        testErrorsAndWarnings('row var = coalesce("a")', []);
        testErrorsAndWarnings('row coalesce("a")', []);
        testErrorsAndWarnings('from a_index | eval var = coalesce(stringField)', []);
        testErrorsAndWarnings('from a_index | eval coalesce(stringField)', []);
        testErrorsAndWarnings('from a_index | sort coalesce(stringField)', []);
      });

      describe('concat', () => {
        testErrorsAndWarnings('row var = concat("a", "a")', []);
        testErrorsAndWarnings('row concat("a", "a")', []);
        testErrorsAndWarnings('row var = concat(to_string("a"), to_string("a"))', []);

        testErrorsAndWarnings('row var = concat(5, 5)', [
          'Argument of [concat] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings(
          'from a_index | where length(concat(stringField, stringField)) > 0',
          []
        );

        testErrorsAndWarnings('from a_index | where length(concat(numberField, numberField)) > 0', [
          'Argument of [concat] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = concat(stringField, stringField)', []);
        testErrorsAndWarnings('from a_index | eval concat(stringField, stringField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = concat(to_string(stringField), to_string(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval concat(numberField, numberField)', [
          'Argument of [concat] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | sort concat(stringField, stringField)', []);
      });

      describe('cos', () => {
        testErrorsAndWarnings('row var = cos(5)', []);
        testErrorsAndWarnings('row cos(5)', []);
        testErrorsAndWarnings('row var = cos(to_integer("a"))', []);

        testErrorsAndWarnings('row var = cos("a")', [
          'Argument of [cos] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where cos(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where cos(stringField) > 0', [
          'Argument of [cos] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = cos(numberField)', []);
        testErrorsAndWarnings('from a_index | eval cos(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = cos(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval cos(stringField)', [
          'Argument of [cos] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval cos(numberField, extraArg)', [
          'Error: [cos] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = cos(*)', [
          'Using wildcards (*) in cos is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort cos(numberField)', []);
      });

      describe('cosh', () => {
        testErrorsAndWarnings('row var = cosh(5)', []);
        testErrorsAndWarnings('row cosh(5)', []);
        testErrorsAndWarnings('row var = cosh(to_integer("a"))', []);

        testErrorsAndWarnings('row var = cosh("a")', [
          'Argument of [cosh] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where cosh(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where cosh(stringField) > 0', [
          'Argument of [cosh] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = cosh(numberField)', []);
        testErrorsAndWarnings('from a_index | eval cosh(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = cosh(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval cosh(stringField)', [
          'Argument of [cosh] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval cosh(numberField, extraArg)', [
          'Error: [cosh] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = cosh(*)', [
          'Using wildcards (*) in cosh is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort cosh(numberField)', []);
      });

      describe('date_diff', () => {
        testErrorsAndWarnings(
          'from a_index | eval var = date_diff("year", dateField, dateField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval date_diff("year", dateField, dateField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = date_diff("year", to_datetime(stringField), to_datetime(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval date_diff(numberField, stringField, stringField)',
          [
            'Argument of [date_diff] must be [string], found value [numberField] type [number]',
            'Argument of [date_diff] must be [date], found value [stringField] type [string]',
            'Argument of [date_diff] must be [date], found value [stringField] type [string]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval date_diff("year", dateField, dateField, extraArg)',
          ['Error: [date_diff] function expects exactly 3 arguments, got 4.']
        );

        testErrorsAndWarnings('from a_index | sort date_diff("year", dateField, dateField)', []);
      });

      describe('date_extract', () => {
        testErrorsAndWarnings('row var = date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", now())', []);
        testErrorsAndWarnings('row date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", now())', []);

        testErrorsAndWarnings(
          'from a_index | eval var = date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", dateField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", dateField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", to_datetime(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval date_extract(stringField, stringField)', [
          'Argument of [date_extract] must be [chrono_literal], found value [stringField] type [string]',
          'Argument of [date_extract] must be [date], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", dateField, extraArg)',
          ['Error: [date_extract] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | sort date_extract("ALIGNED_DAY_OF_WEEK_IN_MONTH", dateField)',
          []
        );
      });

      describe('date_format', () => {
        testErrorsAndWarnings('row var = date_format(now(), "a")', []);
        testErrorsAndWarnings('row date_format(now(), "a")', []);
        testErrorsAndWarnings('from a_index | eval var = date_format(dateField, stringField)', []);
        testErrorsAndWarnings('from a_index | eval date_format(dateField, stringField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = date_format(to_datetime(stringField), to_string(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval date_format(stringField, numberField)', [
          'Argument of [date_format] must be [date], found value [stringField] type [string]',
          'Argument of [date_format] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval date_format(dateField, stringField, extraArg)', [
          'Error: [date_format] function expects no more than 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort date_format(dateField, stringField)', []);
      });

      describe('date_parse', () => {
        testErrorsAndWarnings('row var = date_parse("a", "a")', []);
        testErrorsAndWarnings('row date_parse("a", "a")', []);
        testErrorsAndWarnings('row var = date_parse(to_string("a"), to_string("a"))', []);

        testErrorsAndWarnings('row var = date_parse(5, 5)', [
          'Argument of [date_parse] must be [string], found value [5] type [number]',
          'Argument of [date_parse] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = date_parse(stringField, stringField)', []);
        testErrorsAndWarnings('from a_index | eval date_parse(stringField, stringField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = date_parse(to_string(stringField), to_string(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval date_parse(numberField, numberField)', [
          'Argument of [date_parse] must be [string], found value [numberField] type [number]',
          'Argument of [date_parse] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval date_parse(stringField, stringField, extraArg)',
          ['Error: [date_parse] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings('from a_index | sort date_parse(stringField, stringField)', []);
      });

      describe('date_trunc', () => {
        testErrorsAndWarnings('row var = date_trunc(1 year, now())', []);
        testErrorsAndWarnings('row date_trunc(1 year, now())', []);
        testErrorsAndWarnings('from a_index | eval var = date_trunc(1 year, dateField)', []);
        testErrorsAndWarnings('from a_index | eval date_trunc(1 year, dateField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = date_trunc(1 year, to_datetime(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval date_trunc(stringField, stringField)', [
          'Argument of [date_trunc] must be [time_literal], found value [stringField] type [string]',
          'Argument of [date_trunc] must be [date], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval date_trunc(1 year, dateField, extraArg)', [
          'Error: [date_trunc] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort date_trunc(1 year, dateField)', []);
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
      });

      describe('ends_with', () => {
        testErrorsAndWarnings('row var = ends_with("a", "a")', []);
        testErrorsAndWarnings('row ends_with("a", "a")', []);
        testErrorsAndWarnings('row var = ends_with(to_string("a"), to_string("a"))', []);

        testErrorsAndWarnings('row var = ends_with(5, 5)', [
          'Argument of [ends_with] must be [string], found value [5] type [number]',
          'Argument of [ends_with] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = ends_with(stringField, stringField)', []);
        testErrorsAndWarnings('from a_index | eval ends_with(stringField, stringField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = ends_with(to_string(stringField), to_string(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval ends_with(numberField, numberField)', [
          'Argument of [ends_with] must be [string], found value [numberField] type [number]',
          'Argument of [ends_with] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval ends_with(stringField, stringField, extraArg)', [
          'Error: [ends_with] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort ends_with(stringField, stringField)', []);
      });

      describe('floor', () => {
        testErrorsAndWarnings('row var = floor(5)', []);
        testErrorsAndWarnings('row floor(5)', []);
        testErrorsAndWarnings('row var = floor(to_integer("a"))', []);

        testErrorsAndWarnings('row var = floor("a")', [
          'Argument of [floor] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where floor(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where floor(stringField) > 0', [
          'Argument of [floor] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = floor(numberField)', []);
        testErrorsAndWarnings('from a_index | eval floor(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = floor(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval floor(stringField)', [
          'Argument of [floor] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval floor(numberField, extraArg)', [
          'Error: [floor] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = floor(*)', [
          'Using wildcards (*) in floor is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort floor(numberField)', []);
      });

      describe('greatest', () => {
        testErrorsAndWarnings('row var = greatest("a")', []);
        testErrorsAndWarnings('row greatest("a")', []);
        testErrorsAndWarnings('from a_index | eval var = greatest(stringField)', []);
        testErrorsAndWarnings('from a_index | eval greatest(stringField)', []);
        testErrorsAndWarnings('from a_index | sort greatest(stringField)', []);
      });

      describe('least', () => {
        testErrorsAndWarnings('row var = least("a")', []);
        testErrorsAndWarnings('row least("a")', []);
        testErrorsAndWarnings('from a_index | eval var = least(stringField)', []);
        testErrorsAndWarnings('from a_index | eval least(stringField)', []);
        testErrorsAndWarnings('from a_index | sort least(stringField)', []);
      });

      describe('left', () => {
        testErrorsAndWarnings('row var = left("a", 5)', []);
        testErrorsAndWarnings('row left("a", 5)', []);
        testErrorsAndWarnings('row var = left(to_string("a"), to_integer("a"))', []);

        testErrorsAndWarnings('row var = left(5, "a")', [
          'Argument of [left] must be [string], found value [5] type [number]',
          'Argument of [left] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings(
          'from a_index | where length(left(stringField, numberField)) > 0',
          []
        );

        testErrorsAndWarnings('from a_index | where length(left(numberField, stringField)) > 0', [
          'Argument of [left] must be [string], found value [numberField] type [number]',
          'Argument of [left] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = left(stringField, numberField)', []);
        testErrorsAndWarnings('from a_index | eval left(stringField, numberField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = left(to_string(stringField), to_integer(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval left(numberField, stringField)', [
          'Argument of [left] must be [string], found value [numberField] type [number]',
          'Argument of [left] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval left(stringField, numberField, extraArg)', [
          'Error: [left] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort left(stringField, numberField)', []);
      });

      describe('length', () => {
        testErrorsAndWarnings('row var = length("a")', []);
        testErrorsAndWarnings('row length("a")', []);
        testErrorsAndWarnings('row var = length(to_string("a"))', []);

        testErrorsAndWarnings('row var = length(5)', [
          'Argument of [length] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | where length(stringField) > 0', []);

        testErrorsAndWarnings('from a_index | where length(numberField) > 0', [
          'Argument of [length] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = length(stringField)', []);
        testErrorsAndWarnings('from a_index | eval length(stringField)', []);
        testErrorsAndWarnings('from a_index | eval var = length(to_string(stringField))', []);

        testErrorsAndWarnings('from a_index | eval length(numberField)', [
          'Argument of [length] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval length(stringField, extraArg)', [
          'Error: [length] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = length(*)', [
          'Using wildcards (*) in length is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort length(stringField)', []);
      });

      describe('log', () => {
        testErrorsAndWarnings('row var = log(5, 5)', []);
        testErrorsAndWarnings('row log(5, 5)', []);
        testErrorsAndWarnings('row var = log(to_integer("a"), to_integer("a"))', []);

        testErrorsAndWarnings('row var = log("a", "a")', [
          'Argument of [log] must be [number], found value ["a"] type [string]',
          'Argument of [log] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where log(numberField, numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where log(stringField, stringField) > 0', [
          'Argument of [log] must be [number], found value [stringField] type [string]',
          'Argument of [log] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = log(numberField, numberField)', []);
        testErrorsAndWarnings('from a_index | eval log(numberField, numberField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = log(to_integer(stringField), to_integer(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval log(stringField, stringField)', [
          'Argument of [log] must be [number], found value [stringField] type [string]',
          'Argument of [log] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval log(numberField, numberField, extraArg)', [
          'Error: [log] function expects no more than 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort log(numberField, numberField)', []);
      });

      describe('log10', () => {
        testErrorsAndWarnings('row var = log10(5)', []);
        testErrorsAndWarnings('row log10(5)', []);
        testErrorsAndWarnings('row var = log10(to_integer("a"))', []);

        testErrorsAndWarnings('row var = log10("a")', [
          'Argument of [log10] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where log10(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where log10(stringField) > 0', [
          'Argument of [log10] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = log10(numberField)', []);
        testErrorsAndWarnings('from a_index | eval log10(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = log10(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval log10(stringField)', [
          'Argument of [log10] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval log10(numberField, extraArg)', [
          'Error: [log10] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = log10(*)', [
          'Using wildcards (*) in log10 is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort log10(numberField)', []);
      });

      describe('ltrim', () => {
        testErrorsAndWarnings('row var = ltrim("a")', []);
        testErrorsAndWarnings('row ltrim("a")', []);
        testErrorsAndWarnings('row var = ltrim(to_string("a"))', []);

        testErrorsAndWarnings('row var = ltrim(5)', [
          'Argument of [ltrim] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | where length(ltrim(stringField)) > 0', []);

        testErrorsAndWarnings('from a_index | where length(ltrim(numberField)) > 0', [
          'Argument of [ltrim] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = ltrim(stringField)', []);
        testErrorsAndWarnings('from a_index | eval ltrim(stringField)', []);
        testErrorsAndWarnings('from a_index | eval var = ltrim(to_string(stringField))', []);

        testErrorsAndWarnings('from a_index | eval ltrim(numberField)', [
          'Argument of [ltrim] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval ltrim(stringField, extraArg)', [
          'Error: [ltrim] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = ltrim(*)', [
          'Using wildcards (*) in ltrim is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort ltrim(stringField)', []);
      });

      describe('mv_avg', () => {
        testErrorsAndWarnings('row var = mv_avg(5)', []);
        testErrorsAndWarnings('row mv_avg(5)', []);
        testErrorsAndWarnings('row var = mv_avg(to_integer("a"))', []);

        testErrorsAndWarnings('row var = mv_avg("a")', [
          'Argument of [mv_avg] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_avg(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where mv_avg(stringField) > 0', [
          'Argument of [mv_avg] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_avg(numberField)', []);
        testErrorsAndWarnings('from a_index | eval mv_avg(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_avg(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval mv_avg(stringField)', [
          'Argument of [mv_avg] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval mv_avg(numberField, extraArg)', [
          'Error: [mv_avg] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_avg(*)', [
          'Using wildcards (*) in mv_avg is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_avg(numberField)', []);
      });

      describe('mv_concat', () => {
        testErrorsAndWarnings('row var = mv_concat("a", "a")', []);
        testErrorsAndWarnings('row mv_concat("a", "a")', []);
        testErrorsAndWarnings('row var = mv_concat(to_string("a"), to_string("a"))', []);

        testErrorsAndWarnings('row var = mv_concat(5, 5)', [
          'Argument of [mv_concat] must be [string], found value [5] type [number]',
          'Argument of [mv_concat] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings(
          'from a_index | where length(mv_concat(stringField, stringField)) > 0',
          []
        );

        testErrorsAndWarnings(
          'from a_index | where length(mv_concat(numberField, numberField)) > 0',
          [
            'Argument of [mv_concat] must be [string], found value [numberField] type [number]',
            'Argument of [mv_concat] must be [string], found value [numberField] type [number]',
          ]
        );

        testErrorsAndWarnings('from a_index | eval var = mv_concat(stringField, stringField)', []);
        testErrorsAndWarnings('from a_index | eval mv_concat(stringField, stringField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_concat(to_string(stringField), to_string(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval mv_concat(numberField, numberField)', [
          'Argument of [mv_concat] must be [string], found value [numberField] type [number]',
          'Argument of [mv_concat] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval mv_concat(stringField, stringField, extraArg)', [
          'Error: [mv_concat] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_concat(stringField, stringField)', []);
      });

      describe('mv_count', () => {
        testErrorsAndWarnings('row var = mv_count("a")', []);
        testErrorsAndWarnings('row mv_count("a")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_count(stringField)', []);
        testErrorsAndWarnings('from a_index | eval mv_count(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = mv_count(*)', [
          'Using wildcards (*) in mv_count is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_count(stringField)', []);
      });

      describe('mv_dedupe', () => {
        testErrorsAndWarnings('row var = mv_dedupe("a")', []);
        testErrorsAndWarnings('row mv_dedupe("a")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(stringField)', []);
        testErrorsAndWarnings('from a_index | eval mv_dedupe(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = mv_dedupe(*)', [
          'Using wildcards (*) in mv_dedupe is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_dedupe(stringField)', []);
      });

      describe('mv_first', () => {
        testErrorsAndWarnings('row var = mv_first("a")', []);
        testErrorsAndWarnings('row mv_first("a")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_first(stringField)', []);
        testErrorsAndWarnings('from a_index | eval mv_first(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = mv_first(*)', [
          'Using wildcards (*) in mv_first is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_first(stringField)', []);
      });

      describe('mv_last', () => {
        testErrorsAndWarnings('row var = mv_last("a")', []);
        testErrorsAndWarnings('row mv_last("a")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_last(stringField)', []);
        testErrorsAndWarnings('from a_index | eval mv_last(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = mv_last(*)', [
          'Using wildcards (*) in mv_last is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_last(stringField)', []);
      });

      describe('mv_max', () => {
        testErrorsAndWarnings('row var = mv_max("a")', []);
        testErrorsAndWarnings('row mv_max("a")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_max(stringField)', []);
        testErrorsAndWarnings('from a_index | eval mv_max(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = mv_max(*)', [
          'Using wildcards (*) in mv_max is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_max(stringField)', []);
      });

      describe('mv_median', () => {
        testErrorsAndWarnings('row var = mv_median(5)', []);
        testErrorsAndWarnings('row mv_median(5)', []);
        testErrorsAndWarnings('row var = mv_median(to_integer("a"))', []);

        testErrorsAndWarnings('row var = mv_median("a")', [
          'Argument of [mv_median] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_median(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where mv_median(stringField) > 0', [
          'Argument of [mv_median] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_median(numberField)', []);
        testErrorsAndWarnings('from a_index | eval mv_median(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_median(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval mv_median(stringField)', [
          'Argument of [mv_median] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval mv_median(numberField, extraArg)', [
          'Error: [mv_median] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_median(*)', [
          'Using wildcards (*) in mv_median is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_median(numberField)', []);
      });

      describe('mv_min', () => {
        testErrorsAndWarnings('row var = mv_min("a")', []);
        testErrorsAndWarnings('row mv_min("a")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_min(stringField)', []);
        testErrorsAndWarnings('from a_index | eval mv_min(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = mv_min(*)', [
          'Using wildcards (*) in mv_min is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_min(stringField)', []);
      });

      describe('mv_slice', () => {
        testErrorsAndWarnings('row var = mv_slice("a", 5, 5)', []);
        testErrorsAndWarnings('row mv_slice("a", 5, 5)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = mv_slice(stringField, numberField, numberField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_slice(stringField, numberField, numberField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | sort mv_slice(stringField, numberField, numberField)',
          []
        );
      });

      describe('mv_sort', () => {
        testErrorsAndWarnings('row var = mv_sort("a", "asc")', []);
        testErrorsAndWarnings('row mv_sort("a", "asc")', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sort(stringField, "asc")', []);
        testErrorsAndWarnings('from a_index | eval mv_sort(stringField, "asc")', []);
        testErrorsAndWarnings('from a_index | sort mv_sort(stringField, "asc")', []);
      });

      describe('mv_sum', () => {
        testErrorsAndWarnings('row var = mv_sum(5)', []);
        testErrorsAndWarnings('row mv_sum(5)', []);
        testErrorsAndWarnings('row var = mv_sum(to_integer("a"))', []);

        testErrorsAndWarnings('row var = mv_sum("a")', [
          'Argument of [mv_sum] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where mv_sum(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where mv_sum(stringField) > 0', [
          'Argument of [mv_sum] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_sum(numberField)', []);
        testErrorsAndWarnings('from a_index | eval mv_sum(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = mv_sum(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval mv_sum(stringField)', [
          'Argument of [mv_sum] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval mv_sum(numberField, extraArg)', [
          'Error: [mv_sum] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = mv_sum(*)', [
          'Using wildcards (*) in mv_sum is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort mv_sum(numberField)', []);
      });

      describe('mv_zip', () => {
        testErrorsAndWarnings('row var = mv_zip("a", "a", "a")', []);
        testErrorsAndWarnings('row mv_zip("a", "a", "a")', []);

        testErrorsAndWarnings(
          'row var = mv_zip(to_string("a"), to_string("a"), to_string("a"))',
          []
        );

        testErrorsAndWarnings('row var = mv_zip(5, 5, 5)', [
          'Argument of [mv_zip] must be [string], found value [5] type [number]',
          'Argument of [mv_zip] must be [string], found value [5] type [number]',
          'Argument of [mv_zip] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings(
          'from a_index | where length(mv_zip(stringField, stringField, stringField)) > 0',
          []
        );

        testErrorsAndWarnings(
          'from a_index | where length(mv_zip(numberField, numberField, numberField)) > 0',
          [
            'Argument of [mv_zip] must be [string], found value [numberField] type [number]',
            'Argument of [mv_zip] must be [string], found value [numberField] type [number]',
            'Argument of [mv_zip] must be [string], found value [numberField] type [number]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_zip(stringField, stringField, stringField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval mv_zip(stringField, stringField, stringField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = mv_zip(to_string(stringField), to_string(stringField), to_string(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval mv_zip(numberField, numberField, numberField)', [
          'Argument of [mv_zip] must be [string], found value [numberField] type [number]',
          'Argument of [mv_zip] must be [string], found value [numberField] type [number]',
          'Argument of [mv_zip] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval mv_zip(stringField, stringField, stringField, extraArg)',
          ['Error: [mv_zip] function expects exactly 3 arguments, got 4.']
        );

        testErrorsAndWarnings(
          'from a_index | sort mv_zip(stringField, stringField, stringField)',
          []
        );
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
      });

      describe('pow', () => {
        testErrorsAndWarnings('row var = pow(5, 5)', []);
        testErrorsAndWarnings('row pow(5, 5)', []);
        testErrorsAndWarnings('row var = pow(to_integer("a"), to_integer("a"))', []);

        testErrorsAndWarnings('row var = pow("a", "a")', [
          'Argument of [pow] must be [number], found value ["a"] type [string]',
          'Argument of [pow] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where pow(numberField, numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where pow(stringField, stringField) > 0', [
          'Argument of [pow] must be [number], found value [stringField] type [string]',
          'Argument of [pow] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = pow(numberField, numberField)', []);
        testErrorsAndWarnings('from a_index | eval pow(numberField, numberField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = pow(to_integer(stringField), to_integer(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval pow(stringField, stringField)', [
          'Argument of [pow] must be [number], found value [stringField] type [string]',
          'Argument of [pow] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval pow(numberField, numberField, extraArg)', [
          'Error: [pow] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort pow(numberField, numberField)', []);
      });

      describe('replace', () => {
        testErrorsAndWarnings('row var = replace("a", "a", "a")', []);
        testErrorsAndWarnings('row replace("a", "a", "a")', []);

        testErrorsAndWarnings(
          'row var = replace(to_string("a"), to_string("a"), to_string("a"))',
          []
        );

        testErrorsAndWarnings('row var = replace(5, 5, 5)', [
          'Argument of [replace] must be [string], found value [5] type [number]',
          'Argument of [replace] must be [string], found value [5] type [number]',
          'Argument of [replace] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings(
          'from a_index | where length(replace(stringField, stringField, stringField)) > 0',
          []
        );

        testErrorsAndWarnings(
          'from a_index | where length(replace(numberField, numberField, numberField)) > 0',
          [
            'Argument of [replace] must be [string], found value [numberField] type [number]',
            'Argument of [replace] must be [string], found value [numberField] type [number]',
            'Argument of [replace] must be [string], found value [numberField] type [number]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval var = replace(stringField, stringField, stringField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval replace(stringField, stringField, stringField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = replace(to_string(stringField), to_string(stringField), to_string(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval replace(numberField, numberField, numberField)',
          [
            'Argument of [replace] must be [string], found value [numberField] type [number]',
            'Argument of [replace] must be [string], found value [numberField] type [number]',
            'Argument of [replace] must be [string], found value [numberField] type [number]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval replace(stringField, stringField, stringField, extraArg)',
          ['Error: [replace] function expects exactly 3 arguments, got 4.']
        );

        testErrorsAndWarnings(
          'from a_index | sort replace(stringField, stringField, stringField)',
          []
        );
      });

      describe('right', () => {
        testErrorsAndWarnings('row var = right("a", 5)', []);
        testErrorsAndWarnings('row right("a", 5)', []);
        testErrorsAndWarnings('row var = right(to_string("a"), to_integer("a"))', []);

        testErrorsAndWarnings('row var = right(5, "a")', [
          'Argument of [right] must be [string], found value [5] type [number]',
          'Argument of [right] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings(
          'from a_index | where length(right(stringField, numberField)) > 0',
          []
        );

        testErrorsAndWarnings('from a_index | where length(right(numberField, stringField)) > 0', [
          'Argument of [right] must be [string], found value [numberField] type [number]',
          'Argument of [right] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = right(stringField, numberField)', []);
        testErrorsAndWarnings('from a_index | eval right(stringField, numberField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = right(to_string(stringField), to_integer(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval right(numberField, stringField)', [
          'Argument of [right] must be [string], found value [numberField] type [number]',
          'Argument of [right] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval right(stringField, numberField, extraArg)', [
          'Error: [right] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort right(stringField, numberField)', []);
      });

      describe('round', () => {
        testErrorsAndWarnings('row var = round(5, 5)', []);
        testErrorsAndWarnings('row round(5, 5)', []);
        testErrorsAndWarnings('row var = round(to_integer("a"), to_integer("a"))', []);

        testErrorsAndWarnings('row var = round("a", "a")', [
          'Argument of [round] must be [number], found value ["a"] type [string]',
          'Argument of [round] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where round(numberField, numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where round(stringField, stringField) > 0', [
          'Argument of [round] must be [number], found value [stringField] type [string]',
          'Argument of [round] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = round(numberField, numberField)', []);
        testErrorsAndWarnings('from a_index | eval round(numberField, numberField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = round(to_integer(stringField), to_integer(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval round(stringField, stringField)', [
          'Argument of [round] must be [number], found value [stringField] type [string]',
          'Argument of [round] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval round(numberField, numberField, extraArg)', [
          'Error: [round] function expects no more than 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort round(numberField, numberField)', []);
      });

      describe('rtrim', () => {
        testErrorsAndWarnings('row var = rtrim("a")', []);
        testErrorsAndWarnings('row rtrim("a")', []);
        testErrorsAndWarnings('row var = rtrim(to_string("a"))', []);

        testErrorsAndWarnings('row var = rtrim(5)', [
          'Argument of [rtrim] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | where length(rtrim(stringField)) > 0', []);

        testErrorsAndWarnings('from a_index | where length(rtrim(numberField)) > 0', [
          'Argument of [rtrim] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = rtrim(stringField)', []);
        testErrorsAndWarnings('from a_index | eval rtrim(stringField)', []);
        testErrorsAndWarnings('from a_index | eval var = rtrim(to_string(stringField))', []);

        testErrorsAndWarnings('from a_index | eval rtrim(numberField)', [
          'Argument of [rtrim] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval rtrim(stringField, extraArg)', [
          'Error: [rtrim] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = rtrim(*)', [
          'Using wildcards (*) in rtrim is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort rtrim(stringField)', []);
      });

      describe('signum', () => {
        testErrorsAndWarnings('row var = signum(5)', []);
        testErrorsAndWarnings('row signum(5)', []);
        testErrorsAndWarnings('row var = signum(to_integer("a"))', []);

        testErrorsAndWarnings('row var = signum("a")', [
          'Argument of [signum] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where signum(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where signum(stringField) > 0', [
          'Argument of [signum] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = signum(numberField)', []);
        testErrorsAndWarnings('from a_index | eval signum(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = signum(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval signum(stringField)', [
          'Argument of [signum] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval signum(numberField, extraArg)', [
          'Error: [signum] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = signum(*)', [
          'Using wildcards (*) in signum is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort signum(numberField)', []);
      });

      describe('sin', () => {
        testErrorsAndWarnings('row var = sin(5)', []);
        testErrorsAndWarnings('row sin(5)', []);
        testErrorsAndWarnings('row var = sin(to_integer("a"))', []);

        testErrorsAndWarnings('row var = sin("a")', [
          'Argument of [sin] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where sin(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where sin(stringField) > 0', [
          'Argument of [sin] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sin(numberField)', []);
        testErrorsAndWarnings('from a_index | eval sin(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = sin(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval sin(stringField)', [
          'Argument of [sin] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval sin(numberField, extraArg)', [
          'Error: [sin] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sin(*)', [
          'Using wildcards (*) in sin is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort sin(numberField)', []);
      });

      describe('sinh', () => {
        testErrorsAndWarnings('row var = sinh(5)', []);
        testErrorsAndWarnings('row sinh(5)', []);
        testErrorsAndWarnings('row var = sinh(to_integer("a"))', []);

        testErrorsAndWarnings('row var = sinh("a")', [
          'Argument of [sinh] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where sinh(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where sinh(stringField) > 0', [
          'Argument of [sinh] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sinh(numberField)', []);
        testErrorsAndWarnings('from a_index | eval sinh(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = sinh(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval sinh(stringField)', [
          'Argument of [sinh] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval sinh(numberField, extraArg)', [
          'Error: [sinh] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sinh(*)', [
          'Using wildcards (*) in sinh is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort sinh(numberField)', []);
      });

      describe('split', () => {
        testErrorsAndWarnings('row var = split("a", "a")', []);
        testErrorsAndWarnings('row split("a", "a")', []);
        testErrorsAndWarnings('row var = split(to_string("a"), to_string("a"))', []);

        testErrorsAndWarnings('row var = split(5, 5)', [
          'Argument of [split] must be [string], found value [5] type [number]',
          'Argument of [split] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings(
          'from a_index | where length(split(stringField, stringField)) > 0',
          []
        );

        testErrorsAndWarnings('from a_index | where length(split(numberField, numberField)) > 0', [
          'Argument of [split] must be [string], found value [numberField] type [number]',
          'Argument of [split] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = split(stringField, stringField)', []);
        testErrorsAndWarnings('from a_index | eval split(stringField, stringField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = split(to_string(stringField), to_string(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval split(numberField, numberField)', [
          'Argument of [split] must be [string], found value [numberField] type [number]',
          'Argument of [split] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval split(stringField, stringField, extraArg)', [
          'Error: [split] function expects exactly 2 arguments, got 3.',
        ]);

        testErrorsAndWarnings('from a_index | sort split(stringField, stringField)', []);
      });

      describe('sqrt', () => {
        testErrorsAndWarnings('row var = sqrt(5)', []);
        testErrorsAndWarnings('row sqrt(5)', []);
        testErrorsAndWarnings('row var = sqrt(to_integer("a"))', []);

        testErrorsAndWarnings('row var = sqrt("a")', [
          'Argument of [sqrt] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where sqrt(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where sqrt(stringField) > 0', [
          'Argument of [sqrt] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sqrt(numberField)', []);
        testErrorsAndWarnings('from a_index | eval sqrt(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = sqrt(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval sqrt(stringField)', [
          'Argument of [sqrt] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval sqrt(numberField, extraArg)', [
          'Error: [sqrt] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sqrt(*)', [
          'Using wildcards (*) in sqrt is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort sqrt(numberField)', []);
      });

      describe('st_contains', () => {
        testErrorsAndWarnings(
          'row var = st_contains(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_contains(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings('row var = st_contains(to_geopoint("a"), to_geopoint("a"))', []);

        testErrorsAndWarnings('row var = st_contains("a", "a")', [
          'Argument of [st_contains] must be [geo_point], found value ["a"] type [string]',
          'Argument of [st_contains] must be [geo_point], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings(
          'row var = st_contains(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_contains(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_geopoint("a"), to_geoshape("POINT (30 10)"))',
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
          'row var = st_contains(to_geoshape("POINT (30 10)"), to_geopoint("a"))',
          []
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
          'row var = st_contains(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_contains(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_contains(to_cartesianpoint("a"), to_cartesianpoint("a"))',
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
          'row var = st_contains(to_cartesianpoint("a"), to_cartesianshape("POINT (30 10)"))',
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
          'row var = st_contains(to_cartesianshape("POINT (30 10)"), to_cartesianpoint("a"))',
          []
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
          'from a_index | eval var = st_contains(geoPointField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_contains(geoPointField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(to_geopoint(stringField), to_geopoint(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_contains(stringField, stringField)', [
          'Argument of [st_contains] must be [geo_point], found value [stringField] type [string]',
          'Argument of [st_contains] must be [geo_point], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval st_contains(geoPointField, geoPointField, extraArg)',
          ['Error: [st_contains] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(geoPointField, geoShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_contains(geoPointField, geoShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(to_geopoint(stringField), geoShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_contains(geoPointField, geoShapeField, extraArg)',
          ['Error: [st_contains] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(geoShapeField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_contains(geoShapeField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(geoShapeField, to_geopoint(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_contains(geoShapeField, geoPointField, extraArg)',
          ['Error: [st_contains] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(geoShapeField, geoShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_contains(geoShapeField, geoShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval st_contains(geoShapeField, geoShapeField, extraArg)',
          ['Error: [st_contains] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_contains(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(to_cartesianpoint(stringField), to_cartesianpoint(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_contains(cartesianPointField, cartesianPointField, extraArg)',
          ['Error: [st_contains] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_contains(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_contains(to_cartesianpoint(stringField), cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_contains(cartesianPointField, cartesianShapeField, extraArg)',
          ['Error: [st_contains] function expects exactly 2 arguments, got 3.']
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
          'from a_index | eval var = st_contains(cartesianShapeField, to_cartesianpoint(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_contains(cartesianShapeField, cartesianPointField, extraArg)',
          ['Error: [st_contains] function expects exactly 2 arguments, got 3.']
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
          'from a_index | eval st_contains(cartesianShapeField, cartesianShapeField, extraArg)',
          ['Error: [st_contains] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings('from a_index | sort st_contains(geoPointField, geoPointField)', []);
      });

      describe('st_disjoint', () => {
        testErrorsAndWarnings(
          'row var = st_disjoint(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_disjoint(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings('row var = st_disjoint(to_geopoint("a"), to_geopoint("a"))', []);

        testErrorsAndWarnings('row var = st_disjoint("a", "a")', [
          'Argument of [st_disjoint] must be [geo_point], found value ["a"] type [string]',
          'Argument of [st_disjoint] must be [geo_point], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings(
          'row var = st_disjoint(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_disjoint(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_geopoint("a"), to_geoshape("POINT (30 10)"))',
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
          'row var = st_disjoint(to_geoshape("POINT (30 10)"), to_geopoint("a"))',
          []
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
          'row var = st_disjoint(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_disjoint(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_disjoint(to_cartesianpoint("a"), to_cartesianpoint("a"))',
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
          'row var = st_disjoint(to_cartesianpoint("a"), to_cartesianshape("POINT (30 10)"))',
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
          'row var = st_disjoint(to_cartesianshape("POINT (30 10)"), to_cartesianpoint("a"))',
          []
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
          'from a_index | eval var = st_disjoint(geoPointField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_disjoint(geoPointField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(to_geopoint(stringField), to_geopoint(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_disjoint(stringField, stringField)', [
          'Argument of [st_disjoint] must be [geo_point], found value [stringField] type [string]',
          'Argument of [st_disjoint] must be [geo_point], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval st_disjoint(geoPointField, geoPointField, extraArg)',
          ['Error: [st_disjoint] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(geoPointField, geoShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_disjoint(geoPointField, geoShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(to_geopoint(stringField), geoShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_disjoint(geoPointField, geoShapeField, extraArg)',
          ['Error: [st_disjoint] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(geoShapeField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_disjoint(geoShapeField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(geoShapeField, to_geopoint(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_disjoint(geoShapeField, geoPointField, extraArg)',
          ['Error: [st_disjoint] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(geoShapeField, geoShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_disjoint(geoShapeField, geoShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval st_disjoint(geoShapeField, geoShapeField, extraArg)',
          ['Error: [st_disjoint] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_disjoint(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(to_cartesianpoint(stringField), to_cartesianpoint(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_disjoint(cartesianPointField, cartesianPointField, extraArg)',
          ['Error: [st_disjoint] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_disjoint(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_disjoint(to_cartesianpoint(stringField), cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_disjoint(cartesianPointField, cartesianShapeField, extraArg)',
          ['Error: [st_disjoint] function expects exactly 2 arguments, got 3.']
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
          'from a_index | eval var = st_disjoint(cartesianShapeField, to_cartesianpoint(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_disjoint(cartesianShapeField, cartesianPointField, extraArg)',
          ['Error: [st_disjoint] function expects exactly 2 arguments, got 3.']
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
          'from a_index | eval st_disjoint(cartesianShapeField, cartesianShapeField, extraArg)',
          ['Error: [st_disjoint] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings('from a_index | sort st_disjoint(geoPointField, geoPointField)', []);
      });

      describe('st_intersects', () => {
        testErrorsAndWarnings(
          'row var = st_intersects(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_intersects(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings('row var = st_intersects(to_geopoint("a"), to_geopoint("a"))', []);

        testErrorsAndWarnings('row var = st_intersects("a", "a")', [
          'Argument of [st_intersects] must be [geo_point], found value ["a"] type [string]',
          'Argument of [st_intersects] must be [geo_point], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings(
          'row var = st_intersects(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_intersects(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_geopoint("a"), to_geoshape("POINT (30 10)"))',
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
          'row var = st_intersects(to_geoshape("POINT (30 10)"), to_geopoint("a"))',
          []
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
          'row var = st_intersects(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_intersects(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_intersects(to_cartesianpoint("a"), to_cartesianpoint("a"))',
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
          'row var = st_intersects(to_cartesianpoint("a"), to_cartesianshape("POINT (30 10)"))',
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
          'row var = st_intersects(to_cartesianshape("POINT (30 10)"), to_cartesianpoint("a"))',
          []
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
          'from a_index | eval var = st_intersects(geoPointField, geoPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(geoPointField, geoPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(to_geopoint(stringField), to_geopoint(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_intersects(stringField, stringField)', [
          'Argument of [st_intersects] must be [geo_point], found value [stringField] type [string]',
          'Argument of [st_intersects] must be [geo_point], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(geoPointField, geoPointField, extraArg)',
          ['Error: [st_intersects] function expects exactly 2 arguments, got 3.']
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
          'from a_index | eval var = st_intersects(to_geopoint(stringField), geoShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(geoPointField, geoShapeField, extraArg)',
          ['Error: [st_intersects] function expects exactly 2 arguments, got 3.']
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
          'from a_index | eval var = st_intersects(geoShapeField, to_geopoint(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(geoShapeField, geoPointField, extraArg)',
          ['Error: [st_intersects] function expects exactly 2 arguments, got 3.']
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
          'from a_index | eval st_intersects(geoShapeField, geoShapeField, extraArg)',
          ['Error: [st_intersects] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(to_cartesianpoint(stringField), to_cartesianpoint(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(cartesianPointField, cartesianPointField, extraArg)',
          ['Error: [st_intersects] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_intersects(to_cartesianpoint(stringField), cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(cartesianPointField, cartesianShapeField, extraArg)',
          ['Error: [st_intersects] function expects exactly 2 arguments, got 3.']
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
          'from a_index | eval var = st_intersects(cartesianShapeField, to_cartesianpoint(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_intersects(cartesianShapeField, cartesianPointField, extraArg)',
          ['Error: [st_intersects] function expects exactly 2 arguments, got 3.']
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
          'from a_index | eval st_intersects(cartesianShapeField, cartesianShapeField, extraArg)',
          ['Error: [st_intersects] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | sort st_intersects(geoPointField, geoPointField)',
          []
        );
      });

      describe('st_within', () => {
        testErrorsAndWarnings(
          'row var = st_within(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_within(to_geopoint("POINT (30 10)"), to_geopoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings('row var = st_within(to_geopoint("a"), to_geopoint("a"))', []);

        testErrorsAndWarnings('row var = st_within("a", "a")', [
          'Argument of [st_within] must be [geo_point], found value ["a"] type [string]',
          'Argument of [st_within] must be [geo_point], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings(
          'row var = st_within(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_within(to_geopoint("POINT (30 10)"), to_geoshape("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_geopoint("a"), to_geoshape("POINT (30 10)"))',
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
          'row var = st_within(to_geoshape("POINT (30 10)"), to_geopoint("a"))',
          []
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
          'row var = st_within(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row st_within(to_cartesianpoint("POINT (30 10)"), to_cartesianpoint("POINT (30 10)"))',
          []
        );

        testErrorsAndWarnings(
          'row var = st_within(to_cartesianpoint("a"), to_cartesianpoint("a"))',
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
          'row var = st_within(to_cartesianpoint("a"), to_cartesianshape("POINT (30 10)"))',
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
          'row var = st_within(to_cartesianshape("POINT (30 10)"), to_cartesianpoint("a"))',
          []
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
          'from a_index | eval var = st_within(geoPointField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_within(geoPointField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(to_geopoint(stringField), to_geopoint(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval st_within(stringField, stringField)', [
          'Argument of [st_within] must be [geo_point], found value [stringField] type [string]',
          'Argument of [st_within] must be [geo_point], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval st_within(geoPointField, geoPointField, extraArg)',
          ['Error: [st_within] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(geoPointField, geoShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_within(geoPointField, geoShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(to_geopoint(stringField), geoShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_within(geoPointField, geoShapeField, extraArg)',
          ['Error: [st_within] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(geoShapeField, geoPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_within(geoShapeField, geoPointField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(geoShapeField, to_geopoint(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_within(geoShapeField, geoPointField, extraArg)',
          ['Error: [st_within] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(geoShapeField, geoShapeField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval st_within(geoShapeField, geoShapeField)', []);

        testErrorsAndWarnings(
          'from a_index | eval st_within(geoShapeField, geoShapeField, extraArg)',
          ['Error: [st_within] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_within(cartesianPointField, cartesianPointField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(to_cartesianpoint(stringField), to_cartesianpoint(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_within(cartesianPointField, cartesianPointField, extraArg)',
          ['Error: [st_within] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_within(cartesianPointField, cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = st_within(to_cartesianpoint(stringField), cartesianShapeField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_within(cartesianPointField, cartesianShapeField, extraArg)',
          ['Error: [st_within] function expects exactly 2 arguments, got 3.']
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
          'from a_index | eval var = st_within(cartesianShapeField, to_cartesianpoint(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval st_within(cartesianShapeField, cartesianPointField, extraArg)',
          ['Error: [st_within] function expects exactly 2 arguments, got 3.']
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
          'from a_index | eval st_within(cartesianShapeField, cartesianShapeField, extraArg)',
          ['Error: [st_within] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings('from a_index | sort st_within(geoPointField, geoPointField)', []);
      });

      describe('st_x', () => {
        testErrorsAndWarnings('row var = st_x(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row st_x(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = st_x(to_geopoint("a"))', []);

        testErrorsAndWarnings('row var = st_x("a")', [
          'Argument of [st_x] must be [geo_point], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('row var = st_x(to_cartesianpoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row st_x(to_cartesianpoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = st_x(to_cartesianpoint("a"))', []);
        testErrorsAndWarnings('from a_index | eval var = st_x(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval st_x(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval var = st_x(to_geopoint(stringField))', []);

        testErrorsAndWarnings('from a_index | eval st_x(stringField)', [
          'Argument of [st_x] must be [geo_point], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval st_x(geoPointField, extraArg)', [
          'Error: [st_x] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = st_x(*)', [
          'Using wildcards (*) in st_x is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = st_x(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval st_x(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval var = st_x(to_cartesianpoint(stringField))', []);

        testErrorsAndWarnings('from a_index | eval st_x(cartesianPointField, extraArg)', [
          'Error: [st_x] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort st_x(geoPointField)', []);
      });

      describe('st_y', () => {
        testErrorsAndWarnings('row var = st_y(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row st_y(to_geopoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = st_y(to_geopoint("a"))', []);

        testErrorsAndWarnings('row var = st_y("a")', [
          'Argument of [st_y] must be [geo_point], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('row var = st_y(to_cartesianpoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row st_y(to_cartesianpoint("POINT (30 10)"))', []);
        testErrorsAndWarnings('row var = st_y(to_cartesianpoint("a"))', []);
        testErrorsAndWarnings('from a_index | eval var = st_y(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval st_y(geoPointField)', []);
        testErrorsAndWarnings('from a_index | eval var = st_y(to_geopoint(stringField))', []);

        testErrorsAndWarnings('from a_index | eval st_y(stringField)', [
          'Argument of [st_y] must be [geo_point], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval st_y(geoPointField, extraArg)', [
          'Error: [st_y] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = st_y(*)', [
          'Using wildcards (*) in st_y is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | eval var = st_y(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval st_y(cartesianPointField)', []);
        testErrorsAndWarnings('from a_index | eval var = st_y(to_cartesianpoint(stringField))', []);

        testErrorsAndWarnings('from a_index | eval st_y(cartesianPointField, extraArg)', [
          'Error: [st_y] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | sort st_y(geoPointField)', []);
      });

      describe('starts_with', () => {
        testErrorsAndWarnings('row var = starts_with("a", "a")', []);
        testErrorsAndWarnings('row starts_with("a", "a")', []);
        testErrorsAndWarnings('row var = starts_with(to_string("a"), to_string("a"))', []);

        testErrorsAndWarnings('row var = starts_with(5, 5)', [
          'Argument of [starts_with] must be [string], found value [5] type [number]',
          'Argument of [starts_with] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = starts_with(stringField, stringField)',
          []
        );
        testErrorsAndWarnings('from a_index | eval starts_with(stringField, stringField)', []);

        testErrorsAndWarnings(
          'from a_index | eval var = starts_with(to_string(stringField), to_string(stringField))',
          []
        );

        testErrorsAndWarnings('from a_index | eval starts_with(numberField, numberField)', [
          'Argument of [starts_with] must be [string], found value [numberField] type [number]',
          'Argument of [starts_with] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval starts_with(stringField, stringField, extraArg)',
          ['Error: [starts_with] function expects exactly 2 arguments, got 3.']
        );

        testErrorsAndWarnings('from a_index | sort starts_with(stringField, stringField)', []);
      });

      describe('substring', () => {
        testErrorsAndWarnings('row var = substring("a", 5, 5)', []);
        testErrorsAndWarnings('row substring("a", 5, 5)', []);

        testErrorsAndWarnings(
          'row var = substring(to_string("a"), to_integer("a"), to_integer("a"))',
          []
        );

        testErrorsAndWarnings('row var = substring(5, "a", "a")', [
          'Argument of [substring] must be [string], found value [5] type [number]',
          'Argument of [substring] must be [number], found value ["a"] type [string]',
          'Argument of [substring] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings(
          'from a_index | where length(substring(stringField, numberField, numberField)) > 0',
          []
        );

        testErrorsAndWarnings(
          'from a_index | where length(substring(numberField, stringField, stringField)) > 0',
          [
            'Argument of [substring] must be [string], found value [numberField] type [number]',
            'Argument of [substring] must be [number], found value [stringField] type [string]',
            'Argument of [substring] must be [number], found value [stringField] type [string]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval var = substring(stringField, numberField, numberField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval substring(stringField, numberField, numberField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval var = substring(to_string(stringField), to_integer(stringField), to_integer(stringField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | eval substring(numberField, stringField, stringField)',
          [
            'Argument of [substring] must be [string], found value [numberField] type [number]',
            'Argument of [substring] must be [number], found value [stringField] type [string]',
            'Argument of [substring] must be [number], found value [stringField] type [string]',
          ]
        );

        testErrorsAndWarnings(
          'from a_index | eval substring(stringField, numberField, numberField, extraArg)',
          ['Error: [substring] function expects exactly 3 arguments, got 4.']
        );

        testErrorsAndWarnings(
          'from a_index | sort substring(stringField, numberField, numberField)',
          []
        );
      });

      describe('tan', () => {
        testErrorsAndWarnings('row var = tan(5)', []);
        testErrorsAndWarnings('row tan(5)', []);
        testErrorsAndWarnings('row var = tan(to_integer("a"))', []);

        testErrorsAndWarnings('row var = tan("a")', [
          'Argument of [tan] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where tan(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where tan(stringField) > 0', [
          'Argument of [tan] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = tan(numberField)', []);
        testErrorsAndWarnings('from a_index | eval tan(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = tan(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval tan(stringField)', [
          'Argument of [tan] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval tan(numberField, extraArg)', [
          'Error: [tan] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = tan(*)', [
          'Using wildcards (*) in tan is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort tan(numberField)', []);
      });

      describe('tanh', () => {
        testErrorsAndWarnings('row var = tanh(5)', []);
        testErrorsAndWarnings('row tanh(5)', []);
        testErrorsAndWarnings('row var = tanh(to_integer("a"))', []);

        testErrorsAndWarnings('row var = tanh("a")', [
          'Argument of [tanh] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where tanh(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where tanh(stringField) > 0', [
          'Argument of [tanh] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = tanh(numberField)', []);
        testErrorsAndWarnings('from a_index | eval tanh(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = tanh(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval tanh(stringField)', [
          'Argument of [tanh] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval tanh(numberField, extraArg)', [
          'Error: [tanh] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = tanh(*)', [
          'Using wildcards (*) in tanh is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort tanh(numberField)', []);
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
      });

      describe('to_boolean', () => {
        testErrorsAndWarnings('row var = to_boolean("a")', []);
        testErrorsAndWarnings('row to_boolean("a")', []);
        testErrorsAndWarnings('row var = to_bool("a")', []);
        testErrorsAndWarnings('from a_index | eval var = to_boolean(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_boolean(stringField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_bool(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = to_boolean(*)', [
          'Using wildcards (*) in to_boolean is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_boolean(stringField)', []);
      });

      describe('to_cartesianpoint', () => {
        testErrorsAndWarnings('row var = to_cartesianpoint("a")', []);
        testErrorsAndWarnings('row to_cartesianpoint("a")', []);
        testErrorsAndWarnings('from a_index | eval var = to_cartesianpoint(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_cartesianpoint(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = to_cartesianpoint(*)', [
          'Using wildcards (*) in to_cartesianpoint is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_cartesianpoint(stringField)', []);
      });

      describe('to_cartesianshape', () => {
        testErrorsAndWarnings('row var = to_cartesianshape("a")', []);
        testErrorsAndWarnings('row to_cartesianshape("a")', []);
        testErrorsAndWarnings('from a_index | eval var = to_cartesianshape(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_cartesianshape(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = to_cartesianshape(*)', [
          'Using wildcards (*) in to_cartesianshape is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_cartesianshape(stringField)', []);
      });

      describe('to_datetime', () => {
        testErrorsAndWarnings('row var = to_datetime("a")', []);
        testErrorsAndWarnings('row to_datetime("a")', []);
        testErrorsAndWarnings('row var = to_dt("a")', []);
        testErrorsAndWarnings('from a_index | eval var = to_datetime(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_datetime(stringField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dt(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = to_datetime(*)', [
          'Using wildcards (*) in to_datetime is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_datetime(stringField)', []);
      });

      describe('to_degrees', () => {
        testErrorsAndWarnings('row var = to_degrees(5)', []);
        testErrorsAndWarnings('row to_degrees(5)', []);
        testErrorsAndWarnings('row var = to_degrees(to_integer("a"))', []);

        testErrorsAndWarnings('row var = to_degrees("a")', [
          'Argument of [to_degrees] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where to_degrees(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where to_degrees(stringField) > 0', [
          'Argument of [to_degrees] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_degrees(numberField)', []);
        testErrorsAndWarnings('from a_index | eval to_degrees(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_degrees(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval to_degrees(stringField)', [
          'Argument of [to_degrees] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval to_degrees(numberField, extraArg)', [
          'Error: [to_degrees] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_degrees(*)', [
          'Using wildcards (*) in to_degrees is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_degrees(numberField)', []);
      });

      describe('to_double', () => {
        testErrorsAndWarnings('row var = to_double("a")', []);
        testErrorsAndWarnings('row to_double("a")', []);
        testErrorsAndWarnings('row var = to_dbl("a")', []);
        testErrorsAndWarnings('from a_index | eval var = to_double(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_double(stringField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_dbl(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = to_double(*)', [
          'Using wildcards (*) in to_double is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_double(stringField)', []);
      });

      describe('to_geopoint', () => {
        testErrorsAndWarnings('row var = to_geopoint("a")', []);
        testErrorsAndWarnings('row to_geopoint("a")', []);
        testErrorsAndWarnings('from a_index | eval var = to_geopoint(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_geopoint(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = to_geopoint(*)', [
          'Using wildcards (*) in to_geopoint is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_geopoint(stringField)', []);
      });

      describe('to_geoshape', () => {
        testErrorsAndWarnings('row var = to_geoshape("a")', []);
        testErrorsAndWarnings('row to_geoshape("a")', []);
        testErrorsAndWarnings('from a_index | eval var = to_geoshape(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_geoshape(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = to_geoshape(*)', [
          'Using wildcards (*) in to_geoshape is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_geoshape(stringField)', []);
      });

      describe('to_integer', () => {
        testErrorsAndWarnings('row var = to_integer("a")', []);
        testErrorsAndWarnings('row to_integer("a")', []);
        testErrorsAndWarnings('row var = to_int("a")', []);
        testErrorsAndWarnings('from a_index | eval var = to_integer(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_integer(stringField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_int(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = to_integer(*)', [
          'Using wildcards (*) in to_integer is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_integer(stringField)', []);
      });

      describe('to_ip', () => {
        testErrorsAndWarnings('row var = to_ip("a")', []);
        testErrorsAndWarnings('row to_ip("a")', []);
        testErrorsAndWarnings('from a_index | eval var = to_ip(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_ip(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = to_ip(*)', [
          'Using wildcards (*) in to_ip is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_ip(stringField)', []);
      });

      describe('to_long', () => {
        testErrorsAndWarnings('row var = to_long("a")', []);
        testErrorsAndWarnings('row to_long("a")', []);
        testErrorsAndWarnings('from a_index | eval var = to_long(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_long(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = to_long(*)', [
          'Using wildcards (*) in to_long is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_long(stringField)', []);
      });

      describe('to_lower', () => {
        testErrorsAndWarnings('row var = to_lower("a")', []);
        testErrorsAndWarnings('row to_lower("a")', []);
        testErrorsAndWarnings('row var = to_lower(to_string("a"))', []);

        testErrorsAndWarnings('row var = to_lower(5)', [
          'Argument of [to_lower] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | where length(to_lower(stringField)) > 0', []);

        testErrorsAndWarnings('from a_index | where length(to_lower(numberField)) > 0', [
          'Argument of [to_lower] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_lower(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_lower(stringField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_lower(to_string(stringField))', []);

        testErrorsAndWarnings('from a_index | eval to_lower(numberField)', [
          'Argument of [to_lower] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval to_lower(stringField, extraArg)', [
          'Error: [to_lower] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_lower(*)', [
          'Using wildcards (*) in to_lower is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_lower(stringField)', []);
      });

      describe('to_radians', () => {
        testErrorsAndWarnings('row var = to_radians(5)', []);
        testErrorsAndWarnings('row to_radians(5)', []);
        testErrorsAndWarnings('row var = to_radians(to_integer("a"))', []);

        testErrorsAndWarnings('row var = to_radians("a")', [
          'Argument of [to_radians] must be [number], found value ["a"] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | where to_radians(numberField) > 0', []);

        testErrorsAndWarnings('from a_index | where to_radians(stringField) > 0', [
          'Argument of [to_radians] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_radians(numberField)', []);
        testErrorsAndWarnings('from a_index | eval to_radians(numberField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_radians(to_integer(stringField))', []);

        testErrorsAndWarnings('from a_index | eval to_radians(stringField)', [
          'Argument of [to_radians] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | eval to_radians(numberField, extraArg)', [
          'Error: [to_radians] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_radians(*)', [
          'Using wildcards (*) in to_radians is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_radians(numberField)', []);
      });

      describe('to_string', () => {
        testErrorsAndWarnings('row var = to_string("a")', []);
        testErrorsAndWarnings('row to_string("a")', []);
        testErrorsAndWarnings('row var = to_str("a")', []);
        testErrorsAndWarnings('from a_index | eval var = to_string(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_string(stringField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_str(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = to_string(*)', [
          'Using wildcards (*) in to_string is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_string(stringField)', []);
      });

      describe('to_unsigned_long', () => {
        testErrorsAndWarnings('row var = to_unsigned_long("a")', []);
        testErrorsAndWarnings('row to_unsigned_long("a")', []);
        testErrorsAndWarnings('row var = to_ul("a")', []);
        testErrorsAndWarnings('row var = to_ulong("a")', []);
        testErrorsAndWarnings('from a_index | eval var = to_unsigned_long(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_unsigned_long(stringField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ul(stringField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ulong(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = to_unsigned_long(*)', [
          'Using wildcards (*) in to_unsigned_long is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_unsigned_long(stringField)', []);
      });

      describe('to_upper', () => {
        testErrorsAndWarnings('row var = to_upper("a")', []);
        testErrorsAndWarnings('row to_upper("a")', []);
        testErrorsAndWarnings('row var = to_upper(to_string("a"))', []);

        testErrorsAndWarnings('row var = to_upper(5)', [
          'Argument of [to_upper] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | where length(to_upper(stringField)) > 0', []);

        testErrorsAndWarnings('from a_index | where length(to_upper(numberField)) > 0', [
          'Argument of [to_upper] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_upper(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_upper(stringField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_upper(to_string(stringField))', []);

        testErrorsAndWarnings('from a_index | eval to_upper(numberField)', [
          'Argument of [to_upper] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval to_upper(stringField, extraArg)', [
          'Error: [to_upper] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = to_upper(*)', [
          'Using wildcards (*) in to_upper is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_upper(stringField)', []);
      });

      describe('to_version', () => {
        testErrorsAndWarnings('row var = to_version("a")', []);
        testErrorsAndWarnings('row to_version("a")', []);
        testErrorsAndWarnings('row var = to_ver("a")', []);
        testErrorsAndWarnings('from a_index | eval var = to_version(stringField)', []);
        testErrorsAndWarnings('from a_index | eval to_version(stringField)', []);
        testErrorsAndWarnings('from a_index | eval var = to_ver(stringField)', []);

        testErrorsAndWarnings('from a_index | eval var = to_version(*)', [
          'Using wildcards (*) in to_version is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort to_version(stringField)', []);
      });

      describe('trim', () => {
        testErrorsAndWarnings('row var = trim("a")', []);
        testErrorsAndWarnings('row trim("a")', []);
        testErrorsAndWarnings('row var = trim(to_string("a"))', []);

        testErrorsAndWarnings('row var = trim(5)', [
          'Argument of [trim] must be [string], found value [5] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | where length(trim(stringField)) > 0', []);

        testErrorsAndWarnings('from a_index | where length(trim(numberField)) > 0', [
          'Argument of [trim] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval var = trim(stringField)', []);
        testErrorsAndWarnings('from a_index | eval trim(stringField)', []);
        testErrorsAndWarnings('from a_index | eval var = trim(to_string(stringField))', []);

        testErrorsAndWarnings('from a_index | eval trim(numberField)', [
          'Argument of [trim] must be [string], found value [numberField] type [number]',
        ]);

        testErrorsAndWarnings('from a_index | eval trim(stringField, extraArg)', [
          'Error: [trim] function expects exactly one argument, got 2.',
        ]);

        testErrorsAndWarnings('from a_index | eval var = trim(*)', [
          'Using wildcards (*) in trim is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort trim(stringField)', []);
      });

      describe('avg', () => {
        testErrorsAndWarnings('from a_index | stats var = avg(numberField)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(avg(numberField))', []);
        testErrorsAndWarnings('from a_index | stats round(avg(numberField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(avg(numberField)) + avg(numberField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(avg(numberField)) + avg(numberField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats avg(numberField / 2)', []);
        testErrorsAndWarnings('from a_index | stats var0 = avg(numberField / 2)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField), avg(numberField / 2)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = avg(numberField / 2)',
          []
        );
        testErrorsAndWarnings('from a_index | stats var0 = avg(numberField)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField), avg(numberField)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField), var0 = avg(numberField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(numberField) by round(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = avg(numberField) by var1 = round(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), avg(numberField) by round(numberField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = avg(numberField) by var1 = round(numberField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), avg(numberField) by round(numberField / 2), numberField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = avg(numberField) by var1 = round(numberField / 2), numberField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = avg(avg(numberField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats avg(avg(numberField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats avg(stringField)', [
          'Argument of [avg] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | stats var = avg(*)', [
          'Using wildcards (*) in avg is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort avg(numberField)', [
          'SORT does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(numberField)', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | where avg(numberField) > 0', [
          'WHERE does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(numberField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval var = avg(numberField) > 0', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(numberField)', [
          'EVAL does not support function avg',
        ]);

        testErrorsAndWarnings('from a_index | eval avg(numberField) > 0', [
          'EVAL does not support function avg',
        ]);
      });

      describe('sum', () => {
        testErrorsAndWarnings('from a_index | stats var = sum(numberField)', []);
        testErrorsAndWarnings('from a_index | stats sum(numberField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(sum(numberField))', []);
        testErrorsAndWarnings('from a_index | stats round(sum(numberField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(sum(numberField)) + sum(numberField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(sum(numberField)) + sum(numberField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats sum(numberField / 2)', []);
        testErrorsAndWarnings('from a_index | stats var0 = sum(numberField / 2)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField), sum(numberField / 2)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = sum(numberField / 2)',
          []
        );
        testErrorsAndWarnings('from a_index | stats var0 = sum(numberField)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField), sum(numberField)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField), var0 = sum(numberField)', []);
        testErrorsAndWarnings(
          'from a_index | stats sum(numberField) by round(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = sum(numberField) by var1 = round(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), sum(numberField) by round(numberField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = sum(numberField) by var1 = round(numberField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), sum(numberField) by round(numberField / 2), numberField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = sum(numberField) by var1 = round(numberField / 2), numberField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = sum(avg(numberField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats sum(avg(numberField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats sum(stringField)', [
          'Argument of [sum] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | stats var = sum(*)', [
          'Using wildcards (*) in sum is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort sum(numberField)', [
          'SORT does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(numberField)', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | where sum(numberField) > 0', [
          'WHERE does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(numberField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval var = sum(numberField) > 0', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(numberField)', [
          'EVAL does not support function sum',
        ]);

        testErrorsAndWarnings('from a_index | eval sum(numberField) > 0', [
          'EVAL does not support function sum',
        ]);
      });

      describe('median', () => {
        testErrorsAndWarnings('from a_index | stats var = median(numberField)', []);
        testErrorsAndWarnings('from a_index | stats median(numberField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(median(numberField))', []);
        testErrorsAndWarnings('from a_index | stats round(median(numberField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(median(numberField)) + median(numberField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median(numberField)) + median(numberField)',
          []
        );

        testErrorsAndWarnings('from a_index | stats median(numberField / 2)', []);
        testErrorsAndWarnings('from a_index | stats var0 = median(numberField / 2)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField), median(numberField / 2)', []);

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = median(numberField / 2)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = median(numberField)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField), median(numberField)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = median(numberField)',
          []
        );
        testErrorsAndWarnings(
          'from a_index | stats median(numberField) by round(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median(numberField) by var1 = round(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), median(numberField) by round(numberField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = median(numberField) by var1 = round(numberField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), median(numberField) by round(numberField / 2), numberField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = median(numberField) by var1 = round(numberField / 2), numberField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = median(avg(numberField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats median(avg(numberField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats median(stringField)', [
          'Argument of [median] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | stats var = median(*)', [
          'Using wildcards (*) in median is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort median(numberField)', [
          'SORT does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(numberField)', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | where median(numberField) > 0', [
          'WHERE does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(numberField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median(numberField) > 0', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(numberField)', [
          'EVAL does not support function median',
        ]);

        testErrorsAndWarnings('from a_index | eval median(numberField) > 0', [
          'EVAL does not support function median',
        ]);
      });

      describe('median_absolute_deviation', () => {
        testErrorsAndWarnings(
          'from a_index | stats var = median_absolute_deviation(numberField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats median_absolute_deviation(numberField)', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(numberField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(numberField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(median_absolute_deviation(numberField)) + median_absolute_deviation(numberField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(median_absolute_deviation(numberField)) + median_absolute_deviation(numberField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median_absolute_deviation(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), median_absolute_deviation(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = median_absolute_deviation(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(numberField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), median_absolute_deviation(numberField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = median_absolute_deviation(numberField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats median_absolute_deviation(numberField) by round(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = median_absolute_deviation(numberField) by var1 = round(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), median_absolute_deviation(numberField) by round(numberField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = median_absolute_deviation(numberField) by var1 = round(numberField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), median_absolute_deviation(numberField) by round(numberField / 2), numberField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = median_absolute_deviation(numberField) by var1 = round(numberField / 2), numberField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = median_absolute_deviation(avg(numberField))',
          [
            "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
          ]
        );

        testErrorsAndWarnings('from a_index | stats median_absolute_deviation(avg(numberField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats median_absolute_deviation(stringField)', [
          'Argument of [median_absolute_deviation] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | stats var = median_absolute_deviation(*)', [
          'Using wildcards (*) in median_absolute_deviation is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | sort median_absolute_deviation(numberField)', [
          'SORT does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings('from a_index | where median_absolute_deviation(numberField)', [
          'WHERE does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings('from a_index | where median_absolute_deviation(numberField) > 0', [
          'WHERE does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings('from a_index | eval var = median_absolute_deviation(numberField)', [
          'EVAL does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = median_absolute_deviation(numberField) > 0',
          ['EVAL does not support function median_absolute_deviation']
        );

        testErrorsAndWarnings('from a_index | eval median_absolute_deviation(numberField)', [
          'EVAL does not support function median_absolute_deviation',
        ]);

        testErrorsAndWarnings('from a_index | eval median_absolute_deviation(numberField) > 0', [
          'EVAL does not support function median_absolute_deviation',
        ]);
      });

      describe('percentile', () => {
        testErrorsAndWarnings('from a_index | stats var = percentile(numberField, 5)', []);
        testErrorsAndWarnings('from a_index | stats percentile(numberField, 5)', []);
        testErrorsAndWarnings('from a_index | stats var = round(percentile(numberField, 5))', []);
        testErrorsAndWarnings('from a_index | stats round(percentile(numberField, 5))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(percentile(numberField, 5)) + percentile(numberField, 5)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(percentile(numberField, 5)) + percentile(numberField, 5)',
          []
        );

        testErrorsAndWarnings('from a_index | stats percentile(numberField, numberField)', [
          'Argument of [percentile] must be a constant, received [numberField]',
        ]);

        testErrorsAndWarnings('from a_index | stats percentile(numberField / 2, 5)', []);
        testErrorsAndWarnings('from a_index | stats var0 = percentile(numberField / 2, 5)', []);

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), percentile(numberField / 2, 5)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = percentile(numberField / 2, 5)',
          []
        );

        testErrorsAndWarnings('from a_index | stats var0 = percentile(numberField, 5)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), percentile(numberField, 5)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = percentile(numberField, 5)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats percentile(numberField, 5) by round(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = percentile(numberField, 5) by var1 = round(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), percentile(numberField, 5) by round(numberField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = percentile(numberField, 5) by var1 = round(numberField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), percentile(numberField, 5) by round(numberField / 2), numberField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = percentile(numberField, 5) by var1 = round(numberField / 2), numberField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = percentile(avg(numberField), 5)', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats percentile(avg(numberField), 5)', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats percentile(stringField, 5)', [
          'Argument of [percentile] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | sort percentile(numberField, 5)', [
          'SORT does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(numberField, 5)', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | where percentile(numberField, 5) > 0', [
          'WHERE does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(numberField, 5)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval var = percentile(numberField, 5) > 0', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(numberField, 5)', [
          'EVAL does not support function percentile',
        ]);

        testErrorsAndWarnings('from a_index | eval percentile(numberField, 5) > 0', [
          'EVAL does not support function percentile',
        ]);
      });

      describe('max', () => {
        testErrorsAndWarnings('from a_index | stats var = max(numberField)', []);
        testErrorsAndWarnings('from a_index | stats max(numberField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(max(numberField))', []);
        testErrorsAndWarnings('from a_index | stats round(max(numberField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(max(numberField)) + max(numberField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(max(numberField)) + max(numberField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats max(numberField / 2)', []);
        testErrorsAndWarnings('from a_index | stats var0 = max(numberField / 2)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField), max(numberField / 2)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = max(numberField / 2)',
          []
        );
        testErrorsAndWarnings('from a_index | stats var0 = max(numberField)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField), max(numberField)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField), var0 = max(numberField)', []);
        testErrorsAndWarnings(
          'from a_index | stats max(numberField) by round(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = max(numberField) by var1 = round(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), max(numberField) by round(numberField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = max(numberField) by var1 = round(numberField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), max(numberField) by round(numberField / 2), numberField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = max(numberField) by var1 = round(numberField / 2), numberField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = max(avg(numberField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats max(avg(numberField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats max(stringField)', [
          'Argument of [max] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | stats var = max(*)', [
          'Using wildcards (*) in max is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | stats var = max(dateField)', []);
        testErrorsAndWarnings('from a_index | stats max(dateField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(max(dateField))', []);
        testErrorsAndWarnings('from a_index | stats round(max(dateField))', []);
        testErrorsAndWarnings(
          'from a_index | stats var = round(max(dateField)) + max(dateField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats round(max(dateField)) + max(dateField)', []);

        testErrorsAndWarnings('from a_index | sort max(numberField)', [
          'SORT does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(numberField)', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(numberField) > 0', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(dateField)', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | where max(dateField) > 0', [
          'WHERE does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval var = max(numberField)', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval var = max(numberField) > 0', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval max(numberField)', [
          'EVAL does not support function max',
        ]);

        testErrorsAndWarnings('from a_index | eval max(numberField) > 0', [
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
      });

      describe('min', () => {
        testErrorsAndWarnings('from a_index | stats var = min(numberField)', []);
        testErrorsAndWarnings('from a_index | stats min(numberField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(min(numberField))', []);
        testErrorsAndWarnings('from a_index | stats round(min(numberField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(min(numberField)) + min(numberField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(min(numberField)) + min(numberField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats min(numberField / 2)', []);
        testErrorsAndWarnings('from a_index | stats var0 = min(numberField / 2)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField), min(numberField / 2)', []);
        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = min(numberField / 2)',
          []
        );
        testErrorsAndWarnings('from a_index | stats var0 = min(numberField)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField), min(numberField)', []);
        testErrorsAndWarnings('from a_index | stats avg(numberField), var0 = min(numberField)', []);
        testErrorsAndWarnings(
          'from a_index | stats min(numberField) by round(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var0 = min(numberField) by var1 = round(numberField / 2)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), min(numberField) by round(numberField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = min(numberField) by var1 = round(numberField / 2), ipField',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), min(numberField) by round(numberField / 2), numberField / 2',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats avg(numberField), var0 = min(numberField) by var1 = round(numberField / 2), numberField / 2',
          []
        );

        testErrorsAndWarnings('from a_index | stats var = min(avg(numberField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats min(avg(numberField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats min(stringField)', [
          'Argument of [min] must be [number], found value [stringField] type [string]',
        ]);

        testErrorsAndWarnings('from a_index | stats var = min(*)', [
          'Using wildcards (*) in min is not allowed',
        ]);

        testErrorsAndWarnings('from a_index | stats var = min(dateField)', []);
        testErrorsAndWarnings('from a_index | stats min(dateField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(min(dateField))', []);
        testErrorsAndWarnings('from a_index | stats round(min(dateField))', []);
        testErrorsAndWarnings(
          'from a_index | stats var = round(min(dateField)) + min(dateField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats round(min(dateField)) + min(dateField)', []);

        testErrorsAndWarnings('from a_index | sort min(numberField)', [
          'SORT does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(numberField)', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(numberField) > 0', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(dateField)', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | where min(dateField) > 0', [
          'WHERE does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval var = min(numberField)', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval var = min(numberField) > 0', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval min(numberField)', [
          'EVAL does not support function min',
        ]);

        testErrorsAndWarnings('from a_index | eval min(numberField) > 0', [
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
      });

      describe('count', () => {
        testErrorsAndWarnings('from a_index | stats var = count(stringField)', []);
        testErrorsAndWarnings('from a_index | stats count(stringField)', []);
        testErrorsAndWarnings('from a_index | stats var = round(count(stringField))', []);
        testErrorsAndWarnings('from a_index | stats round(count(stringField))', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(count(stringField)) + count(stringField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(count(stringField)) + count(stringField)',
          []
        );

        testErrorsAndWarnings('from a_index | sort count(stringField)', [
          'SORT does not support function count',
        ]);

        testErrorsAndWarnings('from a_index | where count(stringField)', [
          'WHERE does not support function count',
        ]);

        testErrorsAndWarnings('from a_index | where count(stringField) > 0', [
          'WHERE does not support function count',
        ]);

        testErrorsAndWarnings('from a_index | eval var = count(stringField)', [
          'EVAL does not support function count',
        ]);

        testErrorsAndWarnings('from a_index | eval var = count(stringField) > 0', [
          'EVAL does not support function count',
        ]);

        testErrorsAndWarnings('from a_index | eval count(stringField)', [
          'EVAL does not support function count',
        ]);

        testErrorsAndWarnings('from a_index | eval count(stringField) > 0', [
          'EVAL does not support function count',
        ]);
      });

      describe('count_distinct', () => {
        testErrorsAndWarnings(
          'from a_index | stats var = count_distinct(stringField, numberField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats count_distinct(stringField, numberField)', []);

        testErrorsAndWarnings(
          'from a_index | stats var = round(count_distinct(stringField, numberField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(count_distinct(stringField, numberField))',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats var = round(count_distinct(stringField, numberField)) + count_distinct(stringField, numberField)',
          []
        );

        testErrorsAndWarnings(
          'from a_index | stats round(count_distinct(stringField, numberField)) + count_distinct(stringField, numberField)',
          []
        );

        testErrorsAndWarnings('from a_index | sort count_distinct(stringField, numberField)', [
          'SORT does not support function count_distinct',
        ]);

        testErrorsAndWarnings('from a_index | where count_distinct(stringField, numberField)', [
          'WHERE does not support function count_distinct',
        ]);

        testErrorsAndWarnings('from a_index | where count_distinct(stringField, numberField) > 0', [
          'WHERE does not support function count_distinct',
        ]);

        testErrorsAndWarnings(
          'from a_index | eval var = count_distinct(stringField, numberField)',
          ['EVAL does not support function count_distinct']
        );

        testErrorsAndWarnings(
          'from a_index | eval var = count_distinct(stringField, numberField) > 0',
          ['EVAL does not support function count_distinct']
        );

        testErrorsAndWarnings('from a_index | eval count_distinct(stringField, numberField)', [
          'EVAL does not support function count_distinct',
        ]);

        testErrorsAndWarnings('from a_index | eval count_distinct(stringField, numberField) > 0', [
          'EVAL does not support function count_distinct',
        ]);
      });

      describe('st_centroid_agg', () => {
        testErrorsAndWarnings(
          'from a_index | stats var = st_centroid_agg(cartesianPointField)',
          []
        );
        testErrorsAndWarnings('from a_index | stats st_centroid_agg(cartesianPointField)', []);

        testErrorsAndWarnings('from a_index | stats var = st_centroid_agg(avg(numberField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats st_centroid_agg(avg(numberField))', [
          "Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]",
        ]);

        testErrorsAndWarnings('from a_index | stats st_centroid_agg(stringField)', [
          'Argument of [st_centroid_agg] must be [cartesian_point], found value [stringField] type [string]',
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
      });

      describe('values', () => {
        testErrorsAndWarnings('from a_index | stats var = values(stringField)', []);
        testErrorsAndWarnings('from a_index | stats values(stringField)', []);

        testErrorsAndWarnings('from a_index | sort values(stringField)', [
          'SORT does not support function values',
        ]);

        testErrorsAndWarnings('from a_index | where values(stringField)', [
          'WHERE does not support function values',
        ]);

        testErrorsAndWarnings('from a_index | where values(stringField) > 0', [
          'WHERE does not support function values',
        ]);

        testErrorsAndWarnings('from a_index | eval var = values(stringField)', [
          'EVAL does not support function values',
        ]);

        testErrorsAndWarnings('from a_index | eval var = values(stringField) > 0', [
          'EVAL does not support function values',
        ]);

        testErrorsAndWarnings('from a_index | eval values(stringField)', [
          'EVAL does not support function values',
        ]);

        testErrorsAndWarnings('from a_index | eval values(stringField) > 0', [
          'EVAL does not support function values',
        ]);
      });

      describe('bucket', () => {
        testErrorsAndWarnings('from a_index | stats by bucket(dateField, 1 year)', []);
        testErrorsAndWarnings('from a_index | stats by bin(dateField, 1 year)', []);
        testErrorsAndWarnings('from a_index | stats by bucket(numberField, 5)', []);

        testErrorsAndWarnings('from a_index | stats by bucket(numberField, numberField)', [
          'Argument of [bucket] must be a constant, received [numberField]',
        ]);

        testErrorsAndWarnings('from a_index | stats by bin(numberField, 5)', []);
        testErrorsAndWarnings('from a_index | stats by bucket(dateField, 5, "a", "a")', []);

        testErrorsAndWarnings(
          'from a_index | stats by bucket(dateField, numberField, stringField, stringField)',
          [
            'Argument of [bucket] must be a constant, received [numberField]',
            'Argument of [bucket] must be a constant, received [stringField]',
            'Argument of [bucket] must be a constant, received [stringField]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats by bin(dateField, 5, "a", "a")', []);
        testErrorsAndWarnings('from a_index | stats by bucket(dateField, 5, now(), now())', []);

        testErrorsAndWarnings(
          'from a_index | stats by bucket(dateField, numberField, dateField, dateField)',
          [
            'Argument of [bucket] must be a constant, received [numberField]',
            'Argument of [bucket] must be a constant, received [dateField]',
            'Argument of [bucket] must be a constant, received [dateField]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats by bin(dateField, 5, now(), now())', []);
        testErrorsAndWarnings('from a_index | stats by bucket(dateField, 5, "a", now())', []);

        testErrorsAndWarnings(
          'from a_index | stats by bucket(dateField, numberField, stringField, dateField)',
          [
            'Argument of [bucket] must be a constant, received [numberField]',
            'Argument of [bucket] must be a constant, received [stringField]',
            'Argument of [bucket] must be a constant, received [dateField]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats by bin(dateField, 5, "a", now())', []);
        testErrorsAndWarnings('from a_index | stats by bucket(dateField, 5, now(), "a")', []);

        testErrorsAndWarnings(
          'from a_index | stats by bucket(dateField, numberField, dateField, stringField)',
          [
            'Argument of [bucket] must be a constant, received [numberField]',
            'Argument of [bucket] must be a constant, received [dateField]',
            'Argument of [bucket] must be a constant, received [stringField]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats by bin(dateField, 5, now(), "a")', []);
        testErrorsAndWarnings('from a_index | stats by bucket(numberField, 5, 5, 5)', []);

        testErrorsAndWarnings(
          'from a_index | stats by bucket(numberField, numberField, numberField, numberField)',
          [
            'Argument of [bucket] must be a constant, received [numberField]',
            'Argument of [bucket] must be a constant, received [numberField]',
            'Argument of [bucket] must be a constant, received [numberField]',
          ]
        );

        testErrorsAndWarnings('from a_index | stats by bin(numberField, 5, 5, 5)', []);

        testErrorsAndWarnings('from a_index | sort bucket(dateField, 1 year)', [
          'SORT does not support function bucket',
        ]);
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
        getMetaFields: /Metadata field/,
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
    it.each(['getSources', 'getFieldsFor', 'getPolicies', 'getMetaFields'] as Array<
      keyof typeof ignoreErrorsMap
    >)(`should not error if %s is missing`, async (excludedCallback) => {
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
    });

    it('should work if no callback passed', async () => {
      const excludedCallbacks = [
        'getSources',
        'getPolicies',
        'getFieldsFor',
        'getMetaFields',
      ] as Array<keyof typeof ignoreErrorsMap>;
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
