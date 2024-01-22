/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CharStreams } from 'antlr4ts';
import { getParser, ROOT_STATEMENT } from '../../antlr_facade';
// import { mathCommandDefinition } from '../../autocomplete/autocomplete_definitions';
// import { getDurationItemsWithQuantifier } from '../../autocomplete/helpers';
import { AstListener } from '../ast_factory';
import { validateAst } from './validation';
import { ESQLAst } from '../types';
import { ESQLErrorListener } from '../../monaco/esql_error_listener';
import { evalFunctionsDefinitions } from '../definitions/functions';
import { getFunctionSignatures } from '../definitions/helpers';
import { FunctionDefinition } from '../definitions/types';
import { chronoLiterals, timeLiterals } from '../definitions/literals';
import { statsAggregationFunctionDefinitions } from '../definitions/aggs';
import capitalize from 'lodash/capitalize';
import { EditorError } from '../../../../types';

function getCallbackMocks() {
  return {
    getFieldsFor: jest.fn(async ({ query }) =>
      /enrich/.test(query)
        ? [
            { name: 'otherField', type: 'string' },
            { name: 'yetAnotherField', type: 'number' },
          ]
        : /unsupported_index/.test(query)
        ? [{ name: 'unsupported_field', type: 'unsupported' }]
        : [
            ...['string', 'number', 'date', 'boolean', 'ip'].map((type) => ({
              name: `${type}Field`,
              type,
            })),
            { name: 'geoPointField', type: 'geo_point' },
            { name: 'any#Char$ field', type: 'number' },
            { name: 'kubernetes.something.something', type: 'number' },
            {
              name: `listField`,
              type: `list`,
            },
            { name: '@timestamp', type: 'date' },
          ]
    ),
    getSources: jest.fn(async () =>
      ['a', 'index', 'otherIndex', '.secretIndex', 'my-index', 'unsupported_index'].map((name) => ({
        name,
        hidden: name.startsWith('.'),
      }))
    ),
    getPolicies: jest.fn(async () => [
      {
        name: 'policy',
        sourceIndices: ['enrichIndex1'],
        matchField: 'otherStringField',
        enrichFields: ['otherField', 'yetAnotherField'],
      },
    ]),
  };
}

const toDoubleSignature = evalFunctionsDefinitions.find(({ name }) => name === 'to_double')!;
const toStringSignature = evalFunctionsDefinitions.find(({ name }) => name === 'to_string')!;
const toDateSignature = evalFunctionsDefinitions.find(({ name }) => name === 'to_datetime')!;
const toBooleanSignature = evalFunctionsDefinitions.find(({ name }) => name === 'to_boolean')!;
const toIpSignature = evalFunctionsDefinitions.find(({ name }) => name === 'to_ip')!;

const toAvgSignature = statsAggregationFunctionDefinitions.find(({ name }) => name === 'avg')!;

const nestedFunctions = {
  number: prepareNestedFunction(toDoubleSignature),
  string: prepareNestedFunction(toStringSignature),
  date: prepareNestedFunction(toDateSignature),
  boolean: prepareNestedFunction(toBooleanSignature),
  ip: prepareNestedFunction(toIpSignature),
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
  typeString: 'string' | 'number' | 'date' | 'boolean' | 'ip',
  { useNestedFunction, isStats }: { useNestedFunction: boolean; isStats: boolean }
) {
  if (useNestedFunction && isStats) {
    return prepareNestedFunction(toAvgSignature);
  }
  return useNestedFunction ? nestedFunctions[typeString] : `${typeString}Field`;
}

function getMultiValue(type: 'string[]' | 'number[]' | 'boolean[]' | 'any[]') {
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
  return params.map(({ name: _name, type, ...rest }) => {
    const typeString: string = type;
    if (['string', 'number', 'date', 'boolean', 'ip'].includes(typeString)) {
      return {
        name: getFieldName(typeString as 'string' | 'number' | 'date' | 'boolean' | 'ip', {
          useNestedFunction,
          isStats: !useLiterals,
        }),
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
    if (['string[]', 'number[]', 'boolean[]', 'any[]'].includes(typeString)) {
      return {
        name: getMultiValue(typeString as 'string[]' | 'number[]' | 'boolean[]' | 'any[]'),
        type,
        ...rest,
      };
    }
    return { name: 'stringField', type, ...rest };
  });
}

describe('validation logic', () => {
  const getAstAndErrors = async (
    text: string | undefined
  ): Promise<{
    errors: EditorError[];
    ast: ESQLAst;
  }> => {
    if (text == null) {
      return { ast: [], errors: [] };
    }
    const errorListener = new ESQLErrorListener();
    const parseListener = new AstListener();
    const parser = getParser(CharStreams.fromString(text), errorListener, parseListener);

    parser[ROOT_STATEMENT]();

    return { ...parseListener.getAst(), errors: errorListener.getErrors() };
  };

  function testErrorsAndWarningsFn(
    statement: string,
    expectedErrors: string[] = [],
    expectedWarnings: string[] = [],
    { only, skip }: { only?: boolean; skip?: boolean } = {}
  ) {
    const testFn = only ? it.only : skip ? it.skip : it;
    testFn(
      `${statement} => ${expectedErrors.length} errors, ${expectedWarnings.length} warnings`,
      async () => {
        const callbackMocks = getCallbackMocks();
        const { warnings, errors } = await validateAst(statement, getAstAndErrors, callbackMocks);
        expect(errors.map((e) => ('message' in e ? e.message : e.text))).toEqual(expectedErrors);
        expect(warnings.map((w) => w.text)).toEqual(expectedWarnings);
      }
    );
  }

  type TestArgs = [string, string[], string[]?];

  // Make only and skip work with our custom wrapper
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
          `SyntaxError: expected {EXPLAIN, FROM, ROW, SHOW} but found "${command}"`,
        ])
    );
  });

  describe('from', () => {
    testErrorsAndWarnings('f', ['SyntaxError: expected {EXPLAIN, FROM, ROW, SHOW} but found "f"']);
    testErrorsAndWarnings(`from `, [
      "SyntaxError: missing {QUOTED_IDENTIFIER, FROM_UNQUOTED_IDENTIFIER} at '<EOF>'",
    ]);
    testErrorsAndWarnings(`from index,`, [
      "SyntaxError: missing {QUOTED_IDENTIFIER, FROM_UNQUOTED_IDENTIFIER} at '<EOF>'",
    ]);
    testErrorsAndWarnings(`from assignment = 1`, [
      'SyntaxError: expected {<EOF>, PIPE, COMMA, OPENING_BRACKET} but found "="',
      'Unknown index [assignment]',
    ]);
    testErrorsAndWarnings(`from index`, []);
    testErrorsAndWarnings(`FROM index`, []);
    testErrorsAndWarnings(`FrOm index`, []);
    testErrorsAndWarnings('from `index`', []);

    testErrorsAndWarnings(`from index, otherIndex`, []);
    testErrorsAndWarnings(`from index, missingIndex`, ['Unknown index [missingIndex]']);
    testErrorsAndWarnings(`from fn()`, ['Unknown index [fn()]']);
    testErrorsAndWarnings(`from average()`, ['Unknown index [average()]']);
    testErrorsAndWarnings(`from index [METADATA _id]`, []);
    testErrorsAndWarnings(`from index [metadata _id]`, []);

    testErrorsAndWarnings(`from index [METADATA _id, _source]`, []);
    testErrorsAndWarnings(`from index [metadata _id, _source] [METADATA _id2]`, [
      'SyntaxError: expected {<EOF>, PIPE} but found "["',
    ]);
    testErrorsAndWarnings(`from index metadata _id`, [
      'SyntaxError: expected {<EOF>, PIPE, COMMA, OPENING_BRACKET} but found "metadata"',
    ]);
    testErrorsAndWarnings(`from index (metadata _id)`, [
      'SyntaxError: expected {<EOF>, PIPE, COMMA, OPENING_BRACKET} but found "(metadata"',
    ]);
    testErrorsAndWarnings(`from ind*, other*`, []);
    testErrorsAndWarnings(`from index*`, []);
    testErrorsAndWarnings(`from *ex`, []);
    testErrorsAndWarnings(`from in*ex`, []);
    testErrorsAndWarnings(`from ind*ex`, []);
    testErrorsAndWarnings(`from indexes*`, ['Unknown index [indexes*]']);

    testErrorsAndWarnings(`from remote-*:indexes*`, [
      'ES|QL does not yet support querying remote indices [remote-*:indexes*]',
    ]);
    testErrorsAndWarnings(`from remote-*:indexes`, [
      'ES|QL does not yet support querying remote indices [remote-*:indexes]',
    ]);
    testErrorsAndWarnings(`from remote-ccs:indexes`, [
      'ES|QL does not yet support querying remote indices [remote-ccs:indexes]',
    ]);
    testErrorsAndWarnings(`from a, remote-ccs:indexes`, [
      'ES|QL does not yet support querying remote indices [remote-ccs:indexes]',
    ]);
    testErrorsAndWarnings(`from remote-ccs:indexes [METADATA _id]`, [
      'ES|QL does not yet support querying remote indices [remote-ccs:indexes]',
    ]);
    testErrorsAndWarnings(`from *:indexes [METADATA _id]`, [
      'ES|QL does not yet support querying remote indices [*:indexes]',
    ]);
    testErrorsAndWarnings('from .secretIndex', []);
    testErrorsAndWarnings('from my-index', []);
  });

  describe('row', () => {
    testErrorsAndWarnings('row', [
      'SyntaxError: expected {STRING, INTEGER_LITERAL, DECIMAL_LITERAL, FALSE, LP, NOT, NULL, PARAM, TRUE, PLUS, MINUS, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} but found "<EOF>"',
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
    testErrorsAndWarnings('row a = (1)', []);
    testErrorsAndWarnings('row a = (1, 2, 3)', [
      'SyntaxError: expected {STRING, INTEGER_LITERAL, DECIMAL_LITERAL, FALSE, LP, NOT, NULL, PARAM, TRUE, PLUS, MINUS, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} but found ","',
      "SyntaxError: extraneous input ')' expecting <EOF>",
    ]);

    testErrorsAndWarnings('row var = 1 in (1, 2, 3)', []);
    testErrorsAndWarnings('row var = 5 in (1, 2, 3)', []);
    testErrorsAndWarnings('row var = 5 not in (1, 2, 3)', []);
    testErrorsAndWarnings('row var = 1 in (1, 2, 3, round(5))', []);
    testErrorsAndWarnings('row var = "a" in ("a", "b", "c")', []);
    testErrorsAndWarnings('row var = "a" in ("a", "b", "c")', []);
    testErrorsAndWarnings('row var = "a" not in ("a", "b", "c")', []);
    testErrorsAndWarnings('row var = 1 in ("a", "b", "c")', [
      'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
    ]);
    testErrorsAndWarnings('row var = 5 in ("a", "b", "c")', [
      'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
    ]);
    testErrorsAndWarnings('row var = 5 not in ("a", "b", "c")', [
      'Argument of [not_in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
    ]);
    testErrorsAndWarnings('row var = 5 not in (1, 2, 3, "a")', [
      'Argument of [not_in] must be [number[]], found value [(1, 2, 3, "a")] type [(number, number, number, string)]',
    ]);

    function tweakSignatureForRowCommand(signature: string) {
      /**
       * row has no access to any field, so replace it with literal
       * or functions (for dates)
       */
      return signature
        .replace(/numberField/g, '5')
        .replace(/stringField/g, '"a"')
        .replace(/dateField/g, 'now()')
        .replace(/booleanField/g, 'true')
        .replace(/ipField/g, 'to_ip("127.0.0.1")');
    }

    for (const { name, alias, signatures, ...defRest } of evalFunctionsDefinitions) {
      for (const { params, returnType } of signatures) {
        const fieldMapping = getFieldMapping(params);
        const signatureStringCorrect = tweakSignatureForRowCommand(
          getFunctionSignatures(
            { name, ...defRest, signatures: [{ params: fieldMapping, returnType }] },
            { withTypes: false }
          )[0].declaration
        );

        testErrorsAndWarnings(`row var = ${signatureStringCorrect}`, []);
        testErrorsAndWarnings(`row ${signatureStringCorrect}`);

        if (alias) {
          for (const otherName of alias) {
            const signatureStringWithAlias = tweakSignatureForRowCommand(
              getFunctionSignatures(
                { name: otherName, ...defRest, signatures: [{ params: fieldMapping, returnType }] },
                { withTypes: false }
              )[0].declaration
            );

            testErrorsAndWarnings(`row var = ${signatureStringWithAlias}`, []);
          }
        }

        // Skip functions that have only arguments of type "any", as it is not possible to pass "the wrong type".
        // auto_bucket and to_version functions are a bit harder to test exactly a combination of argument and predict the
        // the right error message
        if (
          params.every(({ type }) => type !== 'any') &&
          !['auto_bucket', 'to_version'].includes(name)
        ) {
          // now test nested functions
          const fieldMappingWithNestedFunctions = getFieldMapping(params, {
            useNestedFunction: true,
            useLiterals: true,
          });
          const signatureString = tweakSignatureForRowCommand(
            getFunctionSignatures(
              {
                name,
                ...defRest,
                signatures: [{ params: fieldMappingWithNestedFunctions, returnType }],
              },
              { withTypes: false }
            )[0].declaration
          );

          testErrorsAndWarnings(`row var = ${signatureString}`);

          const wrongFieldMapping = params.map(({ name: _name, type, ...rest }) => {
            const typeString = type;
            const canBeFieldButNotString = ['number', 'date', 'boolean', 'ip'].includes(typeString);
            const isLiteralType = /literal$/.test(typeString);
            // pick a field name purposely wrong
            const nameValue = canBeFieldButNotString || isLiteralType ? '"a"' : '5';
            return { name: nameValue, type, ...rest };
          });
          const expectedErrors = params.map(
            ({ type }, i) =>
              `Argument of [${name}] must be [${type}], found value [${
                wrongFieldMapping[i].name
              }] type [${wrongFieldMapping[i].name === '5' ? 'number' : 'string'}]`
          );
          const wrongSignatureString = tweakSignatureForRowCommand(
            getFunctionSignatures(
              { name, ...defRest, signatures: [{ params: wrongFieldMapping, returnType }] },
              { withTypes: false }
            )[0].declaration
          );
          testErrorsAndWarnings(`row var = ${wrongSignatureString}`, expectedErrors);
        }
      }
    }
    for (const op of ['>', '>=', '<', '<=', '==']) {
      testErrorsAndWarnings(`row var = 5 ${op} 0`, []);
      testErrorsAndWarnings(`row var = NOT 5 ${op} 0`, []);
      testErrorsAndWarnings(`row var = (numberField ${op} 0)`, []);
      testErrorsAndWarnings(`row var = (NOT (5 ${op} 0))`, []);
      testErrorsAndWarnings(`row var = "a" ${op} 0`, [
        `Argument of [${op}] must be [number], found value ["a"] type [string]`,
      ]);
    }
    for (const op of ['+', '-', '*', '/', '%']) {
      testErrorsAndWarnings(`row var = 1 ${op} 1`, []);
      testErrorsAndWarnings(`row var = (5 ${op} 1)`, []);
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

    describe('date math', () => {
      testErrorsAndWarnings('row 1 anno', [
        'Row does not support [date_period] in expression [1 anno]',
      ]);
      testErrorsAndWarnings('row var = 1 anno', ["Unexpected time interval qualifier: 'anno'"]);
      testErrorsAndWarnings('row now() + 1 anno', ["Unexpected time interval qualifier: 'anno'"]);
      for (const timeLiteral of timeLiterals) {
        testErrorsAndWarnings(`row 1 ${timeLiteral.name}`, [
          `Row does not support [date_period] in expression [1 ${timeLiteral.name}]`,
        ]);
        testErrorsAndWarnings(`row 1                ${timeLiteral.name}`, [
          `Row does not support [date_period] in expression [1 ${timeLiteral.name}]`,
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

  describe('show', () => {
    testErrorsAndWarnings('show', ['SyntaxError: expected {SHOW} but found "<EOF>"']);
    testErrorsAndWarnings('show functions', []);
    testErrorsAndWarnings('show info', []);
    testErrorsAndWarnings('show functions blah', [
      "SyntaxError: token recognition error at: 'b'",
      "SyntaxError: token recognition error at: 'l'",
      "SyntaxError: token recognition error at: 'a'",
      "SyntaxError: token recognition error at: 'h'",
    ]);
  });

  describe('limit', () => {
    testErrorsAndWarnings('from index | limit ', [
      `SyntaxError: missing INTEGER_LITERAL at '<EOF>'`,
    ]);
    testErrorsAndWarnings('from index | limit 4 ', []);
    testErrorsAndWarnings('from index | limit 4.5', [
      'SyntaxError: expected {INTEGER_LITERAL} but found "4.5"',
    ]);
    testErrorsAndWarnings('from index | limit a', [
      'SyntaxError: expected {INTEGER_LITERAL} but found "a"',
    ]);
    testErrorsAndWarnings('from index | limit numberField', [
      'SyntaxError: expected {INTEGER_LITERAL} but found "numberField"',
    ]);
    testErrorsAndWarnings('from index | limit stringField', [
      'SyntaxError: expected {INTEGER_LITERAL} but found "stringField"',
    ]);
    testErrorsAndWarnings('from index | limit 4', []);
  });

  describe('keep', () => {
    testErrorsAndWarnings('from index | keep ', [
      `SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at '<EOF>'`,
    ]);
    testErrorsAndWarnings('from index | keep stringField, numberField, dateField', []);
    testErrorsAndWarnings('from index | keep `stringField`, `numberField`, `dateField`', []);
    testErrorsAndWarnings('from index | keep 4.5', [
      "SyntaxError: token recognition error at: '4'",
      "SyntaxError: token recognition error at: '5'",
      "SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at '.'",
      "SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at '<EOF>'",
      'Unknown column [.]',
    ]);
    testErrorsAndWarnings('from index | keep `4.5`', ['Unknown column [4.5]']);
    testErrorsAndWarnings('from index | keep missingField, numberField, dateField', [
      'Unknown column [missingField]',
    ]);
    testErrorsAndWarnings('from index | keep `any#Char$ field`', []);
    testErrorsAndWarnings(
      'from index | project ',
      [`SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at '<EOF>'`],
      ['PROJECT command is no longer supported, please use KEEP instead']
    );
    testErrorsAndWarnings(
      'from index | project stringField, numberField, dateField',
      [],
      ['PROJECT command is no longer supported, please use KEEP instead']
    );
    testErrorsAndWarnings(
      'from index | PROJECT stringField, numberField, dateField',
      [],
      ['PROJECT command is no longer supported, please use KEEP instead']
    );
    testErrorsAndWarnings(
      'from index | project missingField, numberField, dateField',
      ['Unknown column [missingField]'],
      ['PROJECT command is no longer supported, please use KEEP instead']
    );
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
  });

  describe('drop', () => {
    testErrorsAndWarnings('from index | drop ', [
      `SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at '<EOF>'`,
    ]);
    testErrorsAndWarnings('from index | drop stringField, numberField, dateField', []);
    testErrorsAndWarnings('from index | drop 4.5', [
      "SyntaxError: token recognition error at: '4'",
      "SyntaxError: token recognition error at: '5'",
      "SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at '.'",
      "SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at '<EOF>'",
      'Unknown column [.]',
    ]);
    testErrorsAndWarnings('from index | drop missingField, numberField, dateField', [
      'Unknown column [missingField]',
    ]);
    testErrorsAndWarnings('from index | drop `any#Char$ field`', []);
    testErrorsAndWarnings('from index | drop s*', []);
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
  });

  describe('mv_expand', () => {
    testErrorsAndWarnings('from a | mv_expand ', [
      "SyntaxError: missing {UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} at '<EOF>'",
    ]);
    testErrorsAndWarnings('from a | mv_expand stringField', [
      'Mv_expand only supports list type values, found [stringField] of type string',
    ]);

    testErrorsAndWarnings(`from a | mv_expand listField`, []);

    testErrorsAndWarnings('from a | mv_expand listField, b', [
      "SyntaxError: token recognition error at: ','",
      "SyntaxError: extraneous input 'b' expecting <EOF>",
    ]);

    testErrorsAndWarnings('row a = "a" | mv_expand a', [
      'Mv_expand only supports list type values, found [a] of type string',
    ]);
    testErrorsAndWarnings('row a = [1, 2, 3] | mv_expand a', []);
  });

  describe('rename', () => {
    testErrorsAndWarnings('from a | rename', [
      "SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at '<EOF>'",
    ]);
    testErrorsAndWarnings('from a | rename stringField', [
      'SyntaxError: expected {DOT, AS} but found "<EOF>"',
    ]);
    testErrorsAndWarnings('from a | rename a', [
      'SyntaxError: expected {DOT, AS} but found "<EOF>"',
      'Unknown column [a]',
    ]);
    testErrorsAndWarnings('from a | rename stringField as', [
      "SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at '<EOF>'",
    ]);
    testErrorsAndWarnings('from a | rename missingField as', [
      "SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at '<EOF>'",
      'Unknown column [missingField]',
    ]);
    testErrorsAndWarnings('from a | rename stringField as b', []);
    testErrorsAndWarnings('from a | rename stringField AS b', []);
    testErrorsAndWarnings('from a | rename stringField As b', []);
    testErrorsAndWarnings('from a | rename stringField As b, b AS c', []);
    testErrorsAndWarnings('from a | rename fn() as a', [
      "SyntaxError: token recognition error at: '('",
      "SyntaxError: token recognition error at: ')'",
      'Unknown column [fn]',
      'Unknown column [a]',
    ]);
    testErrorsAndWarnings('from a | eval numberField + 1 | rename `numberField + 1` as a', []);
    testErrorsAndWarnings(
      'from a | stats avg(numberField) | rename `avg(numberField)` as avg0',
      []
    );
    testErrorsAndWarnings('from a | eval numberField + 1 | rename `numberField + 1` as ', [
      "SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at '<EOF>'",
    ]);
    testErrorsAndWarnings('from a | rename s* as strings', [
      'Using wildcards (*) in rename is not allowed [s*]',
      'Unknown column [strings]',
    ]);
  });

  describe('dissect', () => {
    testErrorsAndWarnings('from a | dissect', [
      'SyntaxError: expected {STRING, INTEGER_LITERAL, DECIMAL_LITERAL, FALSE, LP, NULL, PARAM, TRUE, PLUS, MINUS, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} but found "<EOF>"',
    ]);
    testErrorsAndWarnings('from a | dissect stringField', [
      "SyntaxError: missing STRING at '<EOF>'",
    ]);
    testErrorsAndWarnings('from a | dissect stringField 2', [
      'SyntaxError: expected {STRING, DOT} but found "2"',
    ]);
    testErrorsAndWarnings('from a | dissect stringField .', [
      "SyntaxError: missing {UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} at '<EOF>'",
      'Unknown column [stringField.]',
    ]);
    testErrorsAndWarnings('from a | dissect stringField %a', [
      "SyntaxError: missing STRING at '%'",
    ]);
    // Do not try to validate the dissect pattern string
    testErrorsAndWarnings('from a | dissect stringField "%{a}"', []);
    testErrorsAndWarnings('from a | dissect numberField "%{a}"', [
      'Dissect only supports string type values, found [numberField] of type number',
    ]);
    testErrorsAndWarnings('from a | dissect stringField "%{a}" option ', [
      'SyntaxError: expected {ASSIGN} but found "<EOF>"',
    ]);
    testErrorsAndWarnings('from a | dissect stringField "%{a}" option = ', [
      'SyntaxError: expected {STRING, INTEGER_LITERAL, DECIMAL_LITERAL, FALSE, NULL, PARAM, TRUE, PLUS, MINUS, OPENING_BRACKET} but found "<EOF>"',
      'Invalid option for dissect: [option]',
    ]);
    testErrorsAndWarnings('from a | dissect stringField "%{a}" option = 1', [
      'Invalid option for dissect: [option]',
    ]);
    testErrorsAndWarnings('from a | dissect stringField "%{a}" append_separator = "-"', []);
    testErrorsAndWarnings('from a | dissect stringField "%{a}" ignore_missing = true', [
      'Invalid option for dissect: [ignore_missing]',
    ]);
    testErrorsAndWarnings('from a | dissect stringField "%{a}" append_separator = true', [
      'Invalid value for dissect append_separator: expected a string, but was [true]',
    ]);
    // testErrorsAndWarnings('from a | dissect s* "%{a}"', [
    //   'Using wildcards (*) in dissect is not allowed [s*]',
    // ]);
  });

  describe('grok', () => {
    testErrorsAndWarnings('from a | grok', [
      'SyntaxError: expected {STRING, INTEGER_LITERAL, DECIMAL_LITERAL, FALSE, LP, NULL, PARAM, TRUE, PLUS, MINUS, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} but found "<EOF>"',
    ]);
    testErrorsAndWarnings('from a | grok stringField', ["SyntaxError: missing STRING at '<EOF>'"]);
    testErrorsAndWarnings('from a | grok stringField 2', [
      'SyntaxError: expected {STRING, DOT} but found "2"',
    ]);
    testErrorsAndWarnings('from a | grok stringField .', [
      "SyntaxError: missing {UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} at '<EOF>'",
      'Unknown column [stringField.]',
    ]);
    testErrorsAndWarnings('from a | grok stringField %a', ["SyntaxError: missing STRING at '%'"]);
    // Do not try to validate the grok pattern string
    testErrorsAndWarnings('from a | grok stringField "%{a}"', []);
    testErrorsAndWarnings('from a | grok numberField "%{a}"', [
      'Grok only supports string type values, found [numberField] of type number',
    ]);
    // testErrorsAndWarnings('from a | grok s* "%{a}"', [
    //   'Using wildcards (*) in grok is not allowed [s*]',
    // ]);
  });

  describe('where', () => {
    testErrorsAndWarnings('from a | where b', ['Unknown column [b]']);
    for (const cond of ['true', 'false']) {
      testErrorsAndWarnings(`from a | where ${cond}`, []);
      testErrorsAndWarnings(`from a | where NOT ${cond}`, []);
    }
    for (const nValue of ['1', '+1', '1 * 1', '-1', '1 / 1']) {
      testErrorsAndWarnings(`from a | where ${nValue} > 0`, []);
      testErrorsAndWarnings(`from a | where NOT ${nValue} > 0`, []);
    }
    for (const op of ['>', '>=', '<', '<=', '==']) {
      testErrorsAndWarnings(`from a | where numberField ${op} 0`, []);
      testErrorsAndWarnings(`from a | where NOT numberField ${op} 0`, []);
      testErrorsAndWarnings(`from a | where (numberField ${op} 0)`, []);
      testErrorsAndWarnings(`from a | where (NOT (numberField ${op} 0))`, []);
      testErrorsAndWarnings(`from a | where 1 ${op} 0`, []);
      testErrorsAndWarnings(`from a | eval stringField ${op} 0`, [
        `Argument of [${op}] must be [number], found value [stringField] type [string]`,
      ]);
    }
    for (const op of ['like', 'rlike']) {
      testErrorsAndWarnings(`from a | where stringField ${op} "?a"`, []);
      testErrorsAndWarnings(`from a | where stringField NOT ${op} "?a"`, []);
      testErrorsAndWarnings(`from a | where NOT stringField ${op} "?a"`, []);
      testErrorsAndWarnings(`from a | where NOT stringField NOT ${op} "?a"`, []);
      testErrorsAndWarnings(`from a | where numberField ${op} "?a"`, [
        `Argument of [${op}] must be [string], found value [numberField] type [number]`,
      ]);
      testErrorsAndWarnings(`from a | where numberField NOT ${op} "?a"`, [
        `Argument of [not_${op}] must be [string], found value [numberField] type [number]`,
      ]);
      testErrorsAndWarnings(`from a | where NOT numberField ${op} "?a"`, [
        `Argument of [${op}] must be [string], found value [numberField] type [number]`,
      ]);
      testErrorsAndWarnings(`from a | where NOT numberField NOT ${op} "?a"`, [
        `Argument of [not_${op}] must be [string], found value [numberField] type [number]`,
      ]);
    }

    testErrorsAndWarnings(`from a | where cidr_match(ipField)`, [
      `Error building [cidr_match]: expects exactly 2 arguments, passed 1 instead.`,
    ]);
    testErrorsAndWarnings(
      `from a | eval cidr = "172.0.0.1/30" | where cidr_match(ipField, "172.0.0.1/30", cidr)`,
      []
    );

    // Test that all functions work in where
    const numericOrStringFunctions = evalFunctionsDefinitions.filter(({ name, signatures }) => {
      return signatures.some(
        ({ returnType, params }) =>
          ['number', 'string'].includes(returnType) &&
          params.every(({ type }) => ['number', 'string'].includes(type))
      );
    });
    for (const { name, signatures, ...rest } of numericOrStringFunctions) {
      const supportedSignatures = signatures.filter(({ returnType }) =>
        ['number', 'string'].includes(returnType)
      );
      for (const { params, returnType } of supportedSignatures) {
        const correctMapping = params
          .filter(({ optional }) => !optional)
          .map(({ type }) =>
            ['number', 'string'].includes(Array.isArray(type) ? type.join(', ') : type)
              ? { name: `${type}Field`, type }
              : { name: `numberField`, type }
          );
        testErrorsAndWarnings(
          `from a | where ${returnType !== 'number' ? 'length(' : ''}${
            // hijacking a bit this function to produce a function call
            getFunctionSignatures(
              { name, ...rest, signatures: [{ params: correctMapping, returnType }] },
              { withTypes: false }
            )[0].declaration
          }${returnType !== 'number' ? ')' : ''} > 0`,
          []
        );

        // now test that validation is working also inside each function
        // put a number field where a string is expected and viceversa
        // then test an error is returned
        const incorrectMapping = params
          .filter(({ optional }) => !optional)
          .map(({ type }) =>
            type === 'string' ? { name: `numberField`, type } : { name: 'stringField', type }
          );

        const expectedErrors = params
          .filter(({ optional }) => !optional)
          .map(({ name: argName, type }) => {
            const actualValue =
              type === 'string'
                ? { name: `numberField`, type: 'number' }
                : { name: 'stringField', type: 'string' };
            return `Argument of [${name}] must be [${type}], found value [${actualValue.name}] type [${actualValue.type}]`;
          });
        testErrorsAndWarnings(
          `from a | where ${returnType !== 'number' ? 'length(' : ''}${
            // hijacking a bit this function to produce a function call
            getFunctionSignatures(
              { name, ...rest, signatures: [{ params: incorrectMapping, returnType }] },
              { withTypes: false }
            )[0].declaration
          }${returnType !== 'number' ? ')' : ''} > 0`,
          expectedErrors
        );
      }
    }
  });

  describe('eval', () => {
    testErrorsAndWarnings('from a | eval ', [
      'SyntaxError: expected {STRING, INTEGER_LITERAL, DECIMAL_LITERAL, FALSE, LP, NOT, NULL, PARAM, TRUE, PLUS, MINUS, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} but found "<EOF>"',
    ]);
    testErrorsAndWarnings('from a | eval stringField ', []);
    testErrorsAndWarnings('from a | eval b = stringField', []);
    testErrorsAndWarnings('from a | eval numberField + 1', []);
    testErrorsAndWarnings('from a | eval numberField + ', [
      'SyntaxError: expected {STRING, INTEGER_LITERAL, DECIMAL_LITERAL, FALSE, LP, NOT, NULL, PARAM, TRUE, PLUS, MINUS, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} but found "<EOF>"',
    ]);
    testErrorsAndWarnings('from a | eval stringField + 1', [
      'Argument of [+] must be [number], found value [stringField] type [string]',
    ]);
    testErrorsAndWarnings('from a | eval a=b', ['Unknown column [b]']);
    testErrorsAndWarnings('from a | eval a=b, ', [
      'SyntaxError: expected {STRING, INTEGER_LITERAL, DECIMAL_LITERAL, FALSE, LP, NOT, NULL, PARAM, TRUE, PLUS, MINUS, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} but found "<EOF>"',
      'Unknown column [b]',
    ]);
    testErrorsAndWarnings('from a | eval a=round', ['Unknown column [round]']);
    testErrorsAndWarnings('from a | eval a=round(', [
      'SyntaxError: expected {STRING, INTEGER_LITERAL, DECIMAL_LITERAL, FALSE, LP, NOT, NULL, PARAM, TRUE, PLUS, MINUS, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} but found "<EOF>"',
    ]);
    testErrorsAndWarnings('from a | eval a=round(numberField) ', []);
    testErrorsAndWarnings('from a | eval a=round(numberField), ', [
      'SyntaxError: expected {STRING, INTEGER_LITERAL, DECIMAL_LITERAL, FALSE, LP, NOT, NULL, PARAM, TRUE, PLUS, MINUS, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} but found "<EOF>"',
    ]);
    testErrorsAndWarnings('from a | eval a=round(numberField) + round(numberField) ', []);
    testErrorsAndWarnings('from a | eval a=round(numberField) + round(stringField) ', [
      'Argument of [round] must be [number], found value [stringField] type [string]',
    ]);
    testErrorsAndWarnings(
      'from a | eval a=round(numberField) + round(stringField), numberField  ',
      ['Argument of [round] must be [number], found value [stringField] type [string]']
    );
    testErrorsAndWarnings(
      'from a | eval a=round(numberField) + round(numberField), numberField  ',
      []
    );
    testErrorsAndWarnings(
      'from a | eval a=round(numberField) + round(numberField), b = numberField  ',
      []
    );

    for (const { name, alias, signatures, ...defRest } of evalFunctionsDefinitions) {
      for (const { params, returnType } of signatures) {
        const fieldMapping = getFieldMapping(params);
        testErrorsAndWarnings(
          `from a | eval var = ${
            getFunctionSignatures(
              { name, ...defRest, signatures: [{ params: fieldMapping, returnType }] },
              { withTypes: false }
            )[0].declaration
          }`
        );
        testErrorsAndWarnings(
          `from a | eval ${
            getFunctionSignatures(
              { name, ...defRest, signatures: [{ params: fieldMapping, returnType }] },
              { withTypes: false }
            )[0].declaration
          }`
        );

        if (alias) {
          for (const otherName of alias) {
            const signatureStringWithAlias = getFunctionSignatures(
              { name: otherName, ...defRest, signatures: [{ params: fieldMapping, returnType }] },
              { withTypes: false }
            )[0].declaration;

            testErrorsAndWarnings(`from a | eval var = ${signatureStringWithAlias}`, []);
          }
        }

        // Skip functions that have only arguments of type "any", as it is not possible to pass "the wrong type".
        // auto_bucket and to_version functions are a bit harder to test exactly a combination of argument and predict the
        // the right error message
        if (
          params.every(({ type }) => type !== 'any') &&
          !['auto_bucket', 'to_version'].includes(name)
        ) {
          // now test nested functions
          const fieldMappingWithNestedFunctions = getFieldMapping(params, {
            useNestedFunction: true,
            useLiterals: true,
          });
          testErrorsAndWarnings(
            `from a | eval var = ${
              getFunctionSignatures(
                {
                  name,
                  ...defRest,
                  signatures: [{ params: fieldMappingWithNestedFunctions, returnType }],
                },
                { withTypes: false }
              )[0].declaration
            }`
          );

          const wrongFieldMapping = params.map(({ name: _name, type, ...rest }) => {
            const typeString = type;
            const canBeFieldButNotString = ['number', 'date', 'boolean', 'ip'].includes(typeString);
            const isLiteralType = /literal$/.test(typeString);
            // pick a field name purposely wrong
            const nameValue =
              canBeFieldButNotString || isLiteralType ? 'stringField' : 'numberField';
            return { name: nameValue, type, ...rest };
          });
          const expectedErrors = params.map(
            ({ type }, i) =>
              `Argument of [${name}] must be [${type}], found value [${
                wrongFieldMapping[i].name
              }] type [${wrongFieldMapping[i].name.replace('Field', '')}]`
          );
          testErrorsAndWarnings(
            `from a | eval ${
              getFunctionSignatures(
                { name, ...defRest, signatures: [{ params: wrongFieldMapping, returnType }] },
                { withTypes: false }
              )[0].declaration
            }`,
            expectedErrors
          );
        }

        // test that wildcard won't work as arg
        if (fieldMapping.length === 1) {
          const fieldMappingWithWildcard = [...fieldMapping];
          fieldMappingWithWildcard[0].name = '*';

          testErrorsAndWarnings(
            `from a | eval var = ${
              getFunctionSignatures(
                {
                  name,
                  ...defRest,
                  signatures: [{ params: fieldMappingWithWildcard, returnType }],
                },
                { withTypes: false }
              )[0].declaration
            }`,
            [`Using wildcards (*) in ${name} is not allowed`]
          );
        }
      }
    }
    for (const op of ['>', '>=', '<', '<=', '==']) {
      testErrorsAndWarnings(`from a | eval numberField ${op} 0`, []);
      testErrorsAndWarnings(`from a | eval NOT numberField ${op} 0`, []);
      testErrorsAndWarnings(`from a | eval (numberField ${op} 0)`, []);
      testErrorsAndWarnings(`from a | eval (NOT (numberField ${op} 0))`, []);
      testErrorsAndWarnings(`from a | eval 1 ${op} 0`, []);
      testErrorsAndWarnings(`from a | eval stringField ${op} 0`, [
        `Argument of [${op}] must be [number], found value [stringField] type [string]`,
      ]);
    }
    for (const op of ['+', '-', '*', '/', '%']) {
      testErrorsAndWarnings(`from a | eval numberField ${op} 1`, []);
      testErrorsAndWarnings(`from a | eval (numberField ${op} 1)`, []);
      testErrorsAndWarnings(`from a | eval 1 ${op} 1`, []);
    }
    for (const divideByZeroExpr of ['1/0', 'var = 1/0', '1 + 1/0']) {
      testErrorsAndWarnings(
        `from a | eval ${divideByZeroExpr}`,
        [],
        ['Cannot divide by zero: 1/0']
      );
    }
    for (const divideByZeroExpr of ['1%0', 'var = 1%0', '1 + 1%0']) {
      testErrorsAndWarnings(
        `from a | eval ${divideByZeroExpr}`,
        [],
        ['Module by zero can return null value: 1/0']
      );
    }
    for (const op of ['like', 'rlike']) {
      testErrorsAndWarnings(`from a | eval stringField ${op} "?a"`, []);
      testErrorsAndWarnings(`from a | eval stringField NOT ${op} "?a"`, []);
      testErrorsAndWarnings(`from a | eval NOT stringField ${op} "?a"`, []);
      testErrorsAndWarnings(`from a | eval NOT stringField NOT ${op} "?a"`, []);
      testErrorsAndWarnings(`from a | eval numberField ${op} "?a"`, [
        `Argument of [${op}] must be [string], found value [numberField] type [number]`,
      ]);
      testErrorsAndWarnings(`from a | eval numberField NOT ${op} "?a"`, [
        `Argument of [not_${op}] must be [string], found value [numberField] type [number]`,
      ]);
      testErrorsAndWarnings(`from a | eval NOT numberField ${op} "?a"`, [
        `Argument of [${op}] must be [string], found value [numberField] type [number]`,
      ]);
      testErrorsAndWarnings(`from a | eval NOT numberField NOT ${op} "?a"`, [
        `Argument of [not_${op}] must be [string], found value [numberField] type [number]`,
      ]);
    }
    // test lists
    testErrorsAndWarnings('from a | eval 1 in (1, 2, 3)', []);
    testErrorsAndWarnings('from a | eval numberField in (1, 2, 3)', []);
    testErrorsAndWarnings('from a | eval numberField not in (1, 2, 3)', []);
    testErrorsAndWarnings('from a | eval numberField not in (1, 2, 3, numberField)', []);
    testErrorsAndWarnings('from a | eval 1 in (1, 2, 3, round(numberField))', []);
    testErrorsAndWarnings('from a | eval "a" in ("a", "b", "c")', []);
    testErrorsAndWarnings('from a | eval stringField in ("a", "b", "c")', []);
    testErrorsAndWarnings('from a | eval stringField not in ("a", "b", "c")', []);
    testErrorsAndWarnings('from a | eval stringField not in ("a", "b", "c", stringField)', []);
    testErrorsAndWarnings('from a | eval 1 in ("a", "b", "c")', [
      'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
    ]);
    testErrorsAndWarnings('from a | eval numberField in ("a", "b", "c")', [
      'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
    ]);
    testErrorsAndWarnings('from a | eval numberField not in ("a", "b", "c")', [
      'Argument of [not_in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
    ]);
    testErrorsAndWarnings('from a | eval numberField not in (1, 2, 3, stringField)', [
      'Argument of [not_in] must be [number[]], found value [(1, 2, 3, stringField)] type [(number, number, number, string)]',
    ]);

    testErrorsAndWarnings('from a | eval avg(numberField)', ['Eval does not support function avg']);
    testErrorsAndWarnings('from a | stats avg(numberField) | eval `avg(numberField)` + 1', []);

    describe('date math', () => {
      testErrorsAndWarnings('from a | eval 1 anno', [
        'Eval does not support [date_period] in expression [1 anno]',
      ]);
      testErrorsAndWarnings('from a | eval var = 1 anno', [
        "Unexpected time interval qualifier: 'anno'",
      ]);
      testErrorsAndWarnings('from a | eval now() + 1 anno', [
        "Unexpected time interval qualifier: 'anno'",
      ]);
      for (const timeLiteral of timeLiterals) {
        testErrorsAndWarnings(`from a | eval 1 ${timeLiteral.name}`, [
          `Eval does not support [date_period] in expression [1 ${timeLiteral.name}]`,
        ]);
        testErrorsAndWarnings(`from a | eval 1                ${timeLiteral.name}`, [
          `Eval does not support [date_period] in expression [1 ${timeLiteral.name}]`,
        ]);

        // this is not possible for now
        // testErrorsAndWarnings(`from a | eval var = 1 ${timeLiteral.name}`, [
        //   `Eval does not support [date_period] in expression [1 ${timeLiteral.name}]`,
        // ]);
        testErrorsAndWarnings(`from a | eval var = now() - 1 ${timeLiteral.name}`, []);
        testErrorsAndWarnings(`from a | eval var = dateField - 1 ${timeLiteral.name}`, []);
        testErrorsAndWarnings(
          `from a | eval var = dateField - 1 ${timeLiteral.name.toUpperCase()}`,
          []
        );
        testErrorsAndWarnings(
          `from a | eval var = dateField - 1 ${capitalize(timeLiteral.name)}`,
          []
        );
        testErrorsAndWarnings(`from a | eval var = dateField + 1 ${timeLiteral.name}`, []);
        testErrorsAndWarnings(`from a | eval 1 ${timeLiteral.name} + 1 year`, [
          `Argument of [+] must be [date], found value [1 ${timeLiteral.name}] type [duration]`,
        ]);
        for (const op of ['*', '/', '%']) {
          testErrorsAndWarnings(`from a | eval var = now() ${op} 1 ${timeLiteral.name}`, [
            `Argument of [${op}] must be [number], found value [now()] type [date]`,
            `Argument of [${op}] must be [number], found value [1 ${timeLiteral.name}] type [duration]`,
          ]);
        }
      }
    });
  });

  describe('stats', () => {
    testErrorsAndWarnings('from a | stats ', []);
    testErrorsAndWarnings('from a | stats numberField ', [
      'Stats expects an aggregate function, found [numberField]',
    ]);
    testErrorsAndWarnings('from a | stats numberField=', [
      'SyntaxError: expected {STRING, INTEGER_LITERAL, DECIMAL_LITERAL, FALSE, LP, NOT, NULL, PARAM, TRUE, PLUS, MINUS, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} but found "<EOF>"',
    ]);
    testErrorsAndWarnings('from a | stats numberField=5 by ', [
      "SyntaxError: missing {UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} at '<EOF>'",
    ]);
    testErrorsAndWarnings('from a | stats numberField=5 by ', [
      "SyntaxError: missing {UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} at '<EOF>'",
    ]);

    testErrorsAndWarnings('from a | stats avg(numberField) by wrongField', [
      'Unknown column [wrongField]',
    ]);
    testErrorsAndWarnings('from a | stats avg(numberField) by 1', [
      'SyntaxError: expected {UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} but found "1"',
      'Unknown column [1]',
    ]);
    testErrorsAndWarnings('from a | stats avg(numberField) by percentile(numberField)', [
      'SyntaxError: expected {<EOF>, PIPE, COMMA, DOT} but found "("',
      'Unknown column [percentile]',
    ]);
    testErrorsAndWarnings('from a | stats count(`numberField`)', []);

    for (const subCommand of ['keep', 'drop', 'eval']) {
      testErrorsAndWarnings(
        `from a | stats count(\`numberField\`) | ${subCommand} \`count(\`\`numberField\`\`)\` `,
        []
      );
    }

    testErrorsAndWarnings(
      'from a | stats avg(numberField) by stringField, percentile(numberField) by ipField',
      [
        'SyntaxError: expected {<EOF>, PIPE, COMMA, DOT} but found "("',
        'Unknown column [percentile]',
      ]
    );

    testErrorsAndWarnings(
      'from a | stats avg(numberField), percentile(numberField, 50) by ipField',
      []
    );

    testErrorsAndWarnings(
      'from a | stats avg(numberField), percentile(numberField, 50) BY ipField',
      []
    );

    testErrorsAndWarnings('from a | stats numberField + 1', ['Stats does not support function +']);

    testErrorsAndWarnings('from a | stats numberField + 1 by ipField', [
      'Stats does not support function +',
    ]);

    testErrorsAndWarnings(
      'from a | stats avg(numberField), percentile(numberField, 50) + 1 by ipField',
      ['Stats does not support function +']
    );

    testErrorsAndWarnings('from a | stats avg(numberField) by avg(numberField)', [
      'SyntaxError: expected {<EOF>, PIPE, COMMA, DOT} but found "("',
      'Unknown column [avg]',
    ]);

    testErrorsAndWarnings('from a | stats count(*)', []);
    testErrorsAndWarnings('from a | stats var0 = count(*)', []);
    testErrorsAndWarnings('from a | stats var0 = avg(numberField), count(*)', []);

    for (const { name, alias, signatures, ...defRest } of statsAggregationFunctionDefinitions) {
      for (const { params, returnType } of signatures) {
        const fieldMapping = getFieldMapping(params);
        testErrorsAndWarnings(
          `from a | stats var = ${
            getFunctionSignatures(
              { name, ...defRest, signatures: [{ params: fieldMapping, returnType }] },
              { withTypes: false }
            )[0].declaration
          }`
        );
        testErrorsAndWarnings(
          `from a | stats ${
            getFunctionSignatures(
              { name, ...defRest, signatures: [{ params: fieldMapping, returnType }] },
              { withTypes: false }
            )[0].declaration
          }`
        );

        if (alias) {
          for (const otherName of alias) {
            const signatureStringWithAlias = getFunctionSignatures(
              { name: otherName, ...defRest, signatures: [{ params: fieldMapping, returnType }] },
              { withTypes: false }
            )[0].declaration;

            testErrorsAndWarnings(`from a | stats var = ${signatureStringWithAlias}`, []);
          }
        }

        // Skip functions that have only arguments of type "any", as it is not possible to pass "the wrong type".
        // auto_bucket and to_version functions are a bit harder to test exactly a combination of argument and predict the
        // the right error message
        if (
          params.every(({ type }) => type !== 'any') &&
          !['auto_bucket', 'to_version'].includes(name)
        ) {
          // now test nested functions
          const fieldMappingWithNestedFunctions = getFieldMapping(params, {
            useNestedFunction: true,
            useLiterals: false,
          });
          testErrorsAndWarnings(
            `from a | stats var = ${
              getFunctionSignatures(
                {
                  name,
                  ...defRest,
                  signatures: [{ params: fieldMappingWithNestedFunctions, returnType }],
                },
                { withTypes: false }
              )[0].declaration
            }`,
            params.map(
              (_) =>
                `Aggregate function's parameters must be an attribute or literal; found [avg(numberField)] of type [number]`
            )
          );
          // and the message is case of wrong argument type is passed
          const wrongFieldMapping = params.map(({ name: _name, type, ...rest }) => {
            const typeString = type;
            const canBeFieldButNotString = ['number', 'date', 'boolean', 'ip'].includes(typeString);
            const isLiteralType = /literal$/.test(typeString);
            // pick a field name purposely wrong
            const nameValue =
              canBeFieldButNotString || isLiteralType ? 'stringField' : 'numberField';
            return { name: nameValue, type, ...rest };
          });

          const expectedErrors = params.map(
            ({ type }, i) =>
              `Argument of [${name}] must be [${type}], found value [${
                wrongFieldMapping[i].name
              }] type [${wrongFieldMapping[i].name.replace('Field', '')}]`
          );
          testErrorsAndWarnings(
            `from a | stats ${
              getFunctionSignatures(
                { name, ...defRest, signatures: [{ params: wrongFieldMapping, returnType }] },
                { withTypes: false }
              )[0].declaration
            }`,
            expectedErrors
          );

          // test that only count() accepts wildcard as arg
          // just check that the function accepts only 1 arg as the parser cannot handle multiple args with * as start arg
          if (fieldMapping.length === 1) {
            const fieldMappingWithWildcard = [...fieldMapping];
            fieldMappingWithWildcard[0].name = '*';

            testErrorsAndWarnings(
              `from a | stats var = ${
                getFunctionSignatures(
                  {
                    name,
                    ...defRest,
                    signatures: [{ params: fieldMappingWithWildcard, returnType }],
                  },
                  { withTypes: false }
                )[0].declaration
              }`,
              name === 'count' ? [] : [`Using wildcards (*) in ${name} is not allowed`]
            );
          }
        }
      }
    }
  });

  describe('sort', () => {
    testErrorsAndWarnings('from a | sort ', [
      'SyntaxError: expected {STRING, INTEGER_LITERAL, DECIMAL_LITERAL, FALSE, LP, NOT, NULL, PARAM, TRUE, PLUS, MINUS, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} but found "<EOF>"',
    ]);
    testErrorsAndWarnings('from a | sort "field" ', []);
    testErrorsAndWarnings('from a | sort wrongField ', ['Unknown column [wrongField]']);
    testErrorsAndWarnings('from a | sort numberField, ', [
      'SyntaxError: expected {STRING, INTEGER_LITERAL, DECIMAL_LITERAL, FALSE, LP, NOT, NULL, PARAM, TRUE, PLUS, MINUS, OPENING_BRACKET, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER} but found "<EOF>"',
    ]);
    testErrorsAndWarnings('from a | sort numberField, stringField', []);
    for (const dir of ['desc', 'asc']) {
      testErrorsAndWarnings(`from a | sort "field" ${dir} `, []);
      testErrorsAndWarnings(`from a | sort numberField ${dir} `, []);
      testErrorsAndWarnings(`from a | sort numberField ${dir} nulls `, [
        "SyntaxError: missing {FIRST, LAST} at '<EOF>'",
      ]);
      for (const nullDir of ['first', 'last']) {
        testErrorsAndWarnings(`from a | sort numberField ${dir} nulls ${nullDir}`, []);
        testErrorsAndWarnings(`from a | sort numberField ${dir} ${nullDir}`, [
          `SyntaxError: extraneous input '${nullDir}' expecting <EOF>`,
        ]);
      }
    }
    for (const nullDir of ['first', 'last']) {
      testErrorsAndWarnings(`from a | sort numberField nulls ${nullDir}`, []);
      testErrorsAndWarnings(`from a | sort numberField ${nullDir}`, [
        `SyntaxError: extraneous input '${nullDir}' expecting <EOF>`,
      ]);
    }
  });

  describe('enrich', () => {
    testErrorsAndWarnings(`from a | enrich`, [
      "SyntaxError: missing {QUOTED_IDENTIFIER, FROM_UNQUOTED_IDENTIFIER} at '<EOF>'",
    ]);
    testErrorsAndWarnings(`from a | enrich policy `, []);
    testErrorsAndWarnings(`from a | enrich missing-policy `, ['Unknown policy [missing-policy]']);
    testErrorsAndWarnings(`from a | enrich policy on `, [
      "SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at '<EOF>'",
    ]);
    testErrorsAndWarnings(`from a | enrich policy on b `, ['Unknown column [b]']);
    testErrorsAndWarnings(`from a | enrich policy on numberField with `, [
      'SyntaxError: expected {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} but found "<EOF>"',
    ]);
    testErrorsAndWarnings(`from a | enrich policy on numberField with var0 `, [
      'Unknown column [var0]',
    ]);
    testErrorsAndWarnings(`from a | enrich policy on numberField with var0 = `, [
      "SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at '<EOF>'",
      'Unknown column [var0]',
    ]);
    testErrorsAndWarnings(`from a | enrich policy on numberField with var0 = c `, [
      'Unknown column [var0]',
      `Unknown column [c]`,
    ]);
    // need to re-enable once the fields/variables become location aware
    // testErrorsAndWarnings(`from a | enrich policy on numberField with var0 = stringField `, [
    //   `Unknown column [stringField]`,
    // ]);
    testErrorsAndWarnings(`from a | enrich policy on numberField with var0 = , `, [
      "SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at ','",
      'SyntaxError: expected {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} but found "<EOF>"',
      'Unknown column [var0]',
    ]);
    testErrorsAndWarnings(`from a | enrich policy on numberField with var0 = otherField, var1 `, [
      'Unknown column [var1]',
    ]);
    testErrorsAndWarnings(`from a | enrich policy on numberField with var0 = otherField `, []);
    testErrorsAndWarnings(
      `from a | enrich policy on numberField with var0 = otherField, yetAnotherField `,
      []
    );
    testErrorsAndWarnings(`from a | enrich policy on numberField with var0 = otherField, var1 = `, [
      "SyntaxError: missing {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} at '<EOF>'",
      'Unknown column [var1]',
    ]);

    testErrorsAndWarnings(
      `from a | enrich policy on numberField with var0 = otherField, var1 = yetAnotherField`,
      []
    );
    testErrorsAndWarnings(`from a | enrich policy with `, [
      'SyntaxError: expected {QUOTED_IDENTIFIER, PROJECT_UNQUOTED_IDENTIFIER} but found "<EOF>"',
    ]);
    testErrorsAndWarnings(`from a | enrich policy with otherField`, []);
    testErrorsAndWarnings(`from a | enrich policy | eval otherField`, []);
    testErrorsAndWarnings(`from a | enrich policy with var0 = otherField | eval var0`, []);
    testErrorsAndWarnings('from a | enrich my-pol*', [
      'Using wildcards (*) in enrich is not allowed [my-pol*]',
    ]);
  });

  describe('shadowing', () => {
    testErrorsAndWarnings(
      'from a | eval stringField = 5',
      [],
      ['Column [stringField] of type string has been overwritten as new type: number']
    );
    testErrorsAndWarnings(
      'from a | eval numberField = "5"',
      [],
      ['Column [numberField] of type number has been overwritten as new type: string']
    );
  });

  describe('callbacks', () => {
    it(`should not fetch source and fields list when a row command is set`, async () => {
      const callbackMocks = getCallbackMocks();
      await validateAst(`row a = 1 | eval a`, getAstAndErrors, callbackMocks);
      expect(callbackMocks.getFieldsFor).not.toHaveBeenCalled();
      expect(callbackMocks.getSources).not.toHaveBeenCalled();
    });

    it(`should fetch policies if no enrich command is found`, async () => {
      const callbackMocks = getCallbackMocks();
      await validateAst(`row a = 1 | eval a`, getAstAndErrors, callbackMocks);
      expect(callbackMocks.getPolicies).not.toHaveBeenCalled();
    });

    it(`should not fetch source and fields for empty command`, async () => {
      const callbackMocks = getCallbackMocks();
      await validateAst(` `, getAstAndErrors, callbackMocks);
      expect(callbackMocks.getFieldsFor).not.toHaveBeenCalled();
      expect(callbackMocks.getSources).not.toHaveBeenCalled();
    });

    it(`should skip initial source and fields call but still call fields for enriched policy`, async () => {
      const callbackMocks = getCallbackMocks();
      await validateAst(`row a = 1 | eval b  = a | enrich policy`, getAstAndErrors, callbackMocks);
      expect(callbackMocks.getSources).not.toHaveBeenCalled();
      expect(callbackMocks.getPolicies).toHaveBeenCalled();
      expect(callbackMocks.getFieldsFor).toHaveBeenCalledTimes(1);
      expect(callbackMocks.getFieldsFor).toHaveBeenLastCalledWith({
        query: `from enrichIndex1 | keep otherField, yetAnotherField`,
      });
    });

    it('should call fields callbacks also for show command', async () => {
      const callbackMocks = getCallbackMocks();
      await validateAst(`show functions | keep name`, getAstAndErrors, callbackMocks);
      expect(callbackMocks.getSources).not.toHaveBeenCalled();
      expect(callbackMocks.getPolicies).not.toHaveBeenCalled();
      expect(callbackMocks.getFieldsFor).toHaveBeenCalledTimes(1);
      expect(callbackMocks.getFieldsFor).toHaveBeenLastCalledWith({
        query: 'show functions',
      });
    });

    it(`should fetch additional fields if an enrich command is found`, async () => {
      const callbackMocks = getCallbackMocks();
      await validateAst(`from a | eval b  = a | enrich policy`, getAstAndErrors, callbackMocks);
      expect(callbackMocks.getSources).toHaveBeenCalled();
      expect(callbackMocks.getPolicies).toHaveBeenCalled();
      expect(callbackMocks.getFieldsFor).toHaveBeenCalledTimes(2);
      expect(callbackMocks.getFieldsFor).toHaveBeenLastCalledWith({
        query: `from enrichIndex1 | keep otherField, yetAnotherField`,
      });
    });
  });
});
