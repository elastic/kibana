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

const fieldTypes = ['number', 'date', 'boolean', 'ip', 'string', 'cartesian_point', 'geo_point'];
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
  };
  return params.map(({ name: _name, type, literalOnly, literalOptions, ...rest }) => {
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
        literalOnly && typeString in literalValues
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

function generateIncorrectlyTypedParameters(
  name: string,
  signatures: FunctionDefinition['signatures'],
  currentParams: FunctionDefinition['signatures'][number]['params'],
  values: { stringField: string; numberField: string; booleanField: string }
) {
  const literalValues = {
    string: `"a"`,
    number: '5',
  };
  const wrongFieldMapping = currentParams.map(
    ({ name: _name, literalOnly, literalOptions, type, ...rest }, i) => {
      // this thing is complex enough, let's not make it harder for constants
      if (literalOnly) {
        return { name: literalValues[type as keyof typeof literalValues], type, ...rest };
      }
      const canBeFieldButNotString = Boolean(
        fieldTypes.filter((t) => t !== 'string').includes(type) &&
          signatures.every(({ params: fnParams }) => fnParams[i].type !== 'string')
      );
      const canBeFieldButNotNumber =
        fieldTypes.filter((t) => t !== 'number').includes(type) &&
        signatures.every(({ params: fnParams }) => fnParams[i].type !== 'number');
      const isLiteralType = /literal$/.test(type);
      // pick a field name purposely wrong
      const nameValue =
        canBeFieldButNotString || isLiteralType
          ? values.stringField
          : canBeFieldButNotNumber
          ? values.numberField
          : values.booleanField;
      return { name: nameValue, type, ...rest };
    }
  );

  const generatedFieldTypes = {
    [values.stringField]: 'string',
    [values.numberField]: 'number',
    [values.booleanField]: 'boolean',
  };

  const expectedErrors = signatures[0].params
    .filter(({ literalOnly }) => !literalOnly)
    .map(({ type }, i) => {
      const fieldName = wrongFieldMapping[i].name;
      if (
        fieldName === 'numberField' &&
        signatures.every(({ params: fnParams }) => fnParams[i].type !== 'string')
      ) {
        return;
      }
      return `Argument of [${name}] must be [${type}], found value [${fieldName}] type [${generatedFieldTypes[fieldName]}]`;
    })
    .filter(nonNullable);

  return { wrongFieldMapping, expectedErrors };
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
      testErrorsAndWarnings(`from `, [
        "SyntaxError: missing {QUOTED_IDENTIFIER, FROM_UNQUOTED_IDENTIFIER} at '<EOF>'",
      ]);
      testErrorsAndWarnings(`from index,`, [
        "SyntaxError: missing {QUOTED_IDENTIFIER, FROM_UNQUOTED_IDENTIFIER} at '<EOF>'",
      ]);
      testErrorsAndWarnings(`from assignment = 1`, [
        "SyntaxError: mismatched input '=' expecting <EOF>",
        'Unknown index [assignment]',
      ]);
      testErrorsAndWarnings(`from index`, []);
      testErrorsAndWarnings(`FROM index`, []);
      testErrorsAndWarnings(`FrOm index`, []);
      testErrorsAndWarnings('from `index`', []);

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

      // test that "and" and "or" accept null... not sure if this is the best place or not...
      for (const op of ['and', 'or']) {
        for (const firstParam of ['true', 'null']) {
          for (const secondParam of ['false', 'null']) {
            testErrorsAndWarnings(`row bool_var = ${firstParam} ${op} ${secondParam}`, []);
          }
        }
      }

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
        for (const { params, ...signRest } of signatures) {
          const fieldMapping = getFieldMapping(params);
          const signatureStringCorrect = tweakSignatureForRowCommand(
            getFunctionSignatures(
              { name, ...defRest, signatures: [{ params: fieldMapping, ...signRest }] },
              { withTypes: false }
            )[0].declaration
          );

          testErrorsAndWarnings(`row var = ${signatureStringCorrect}`, []);
          testErrorsAndWarnings(`row ${signatureStringCorrect}`, []);

          if (alias) {
            for (const otherName of alias) {
              const signatureStringWithAlias = tweakSignatureForRowCommand(
                getFunctionSignatures(
                  {
                    name: otherName,
                    ...defRest,
                    signatures: [{ params: fieldMapping, ...signRest }],
                  },
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
            !['auto_bucket', 'to_version', 'mv_sort'].includes(name)
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
                  signatures: [{ params: fieldMappingWithNestedFunctions, ...signRest }],
                },
                { withTypes: false }
              )[0].declaration
            );

            testErrorsAndWarnings(`row var = ${signatureString}`, []);

            const { wrongFieldMapping, expectedErrors } = generateIncorrectlyTypedParameters(
              name,
              signatures,
              params,
              {
                stringField: '"a"',
                numberField: '5',
                booleanField: 'true',
              }
            );
            const wrongSignatureString = tweakSignatureForRowCommand(
              getFunctionSignatures(
                { name, ...defRest, signatures: [{ params: wrongFieldMapping, ...signRest }] },
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
        testErrorsAndWarnings(`row var = (numberField ${op} 0)`, ['Unknown column [numberField]']);
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
      for (const op of ['>', '>=', '<', '<=', '==']) {
        testErrorsAndWarnings(`from a_index | where numberField ${op} 0`, []);
        testErrorsAndWarnings(`from a_index | where NOT numberField ${op} 0`, []);
        testErrorsAndWarnings(`from a_index | where (numberField ${op} 0)`, []);
        testErrorsAndWarnings(`from a_index | where (NOT (numberField ${op} 0))`, []);
        testErrorsAndWarnings(`from a_index | where 1 ${op} 0`, []);
        testErrorsAndWarnings(`from a_index | eval stringField ${op} 0`, [
          `Argument of [${op}] must be [number], found value [stringField] type [string]`,
        ]);
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

      for (const {
        name,
        alias,
        signatures,
        ...defRest
      } of statsAggregationFunctionDefinitions.filter(
        ({ name: fnName, signatures: statsSignatures }) =>
          statsSignatures.some(({ returnType, params }) => ['number'].includes(returnType))
      )) {
        for (const { params, ...signRest } of signatures) {
          const fieldMapping = getFieldMapping(params);

          testErrorsAndWarnings(
            `from a_index | where ${
              getFunctionSignatures(
                {
                  name,
                  ...defRest,
                  signatures: [{ params: fieldMapping, ...signRest }],
                },
                { withTypes: false }
              )[0].declaration
            }`,
            [`WHERE does not support function ${name}`]
          );

          testErrorsAndWarnings(
            `from a_index | where ${
              getFunctionSignatures(
                {
                  name,
                  ...defRest,
                  signatures: [{ params: fieldMapping, ...signRest }],
                },
                { withTypes: false }
              )[0].declaration
            } > 0`,
            [`WHERE does not support function ${name}`]
          );
        }
      }

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
        for (const { params, returnType, ...restSign } of supportedSignatures) {
          const correctMapping = params
            .filter(({ optional }) => !optional)
            .map(({ type }) =>
              ['number', 'string'].includes(Array.isArray(type) ? type.join(', ') : type)
                ? { name: `${type}Field`, type }
                : { name: `numberField`, type }
            );
          testErrorsAndWarnings(
            `from a_index | where ${returnType !== 'number' ? 'length(' : ''}${
              // hijacking a bit this function to produce a function call
              getFunctionSignatures(
                {
                  name,
                  ...rest,
                  signatures: [{ params: correctMapping, returnType, ...restSign }],
                },
                { withTypes: false }
              )[0].declaration
            }${returnType !== 'number' ? ')' : ''} > 0`,
            []
          );

          const { wrongFieldMapping, expectedErrors } = generateIncorrectlyTypedParameters(
            name,
            signatures,
            params,
            { stringField: 'stringField', numberField: 'numberField', booleanField: 'booleanField' }
          );
          testErrorsAndWarnings(
            `from a_index | where ${returnType !== 'number' ? 'length(' : ''}${
              // hijacking a bit this function to produce a function call
              getFunctionSignatures(
                {
                  name,
                  ...rest,
                  signatures: [{ params: wrongFieldMapping, returnType, ...restSign }],
                },
                { withTypes: false }
              )[0].declaration
            }${returnType !== 'number' ? ')' : ''} > 0`,
            expectedErrors
          );
        }
      }
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

      for (const { name, alias, signatures, ...defRest } of statsAggregationFunctionDefinitions) {
        for (const { params, ...signRest } of signatures) {
          const fieldMapping = getFieldMapping(params);
          testErrorsAndWarnings(
            `from a_index | eval var = ${
              getFunctionSignatures(
                {
                  name,
                  ...defRest,
                  signatures: [{ params: fieldMapping, ...signRest }],
                },
                { withTypes: false }
              )[0].declaration
            }`,
            [`EVAL does not support function ${name}`]
          );

          testErrorsAndWarnings(
            `from a_index | eval var = ${
              getFunctionSignatures(
                {
                  name,
                  ...defRest,
                  signatures: [{ params: fieldMapping, ...signRest }],
                },
                { withTypes: false }
              )[0].declaration
            } > 0`,
            [`EVAL does not support function ${name}`]
          );

          testErrorsAndWarnings(
            `from a_index | eval ${
              getFunctionSignatures(
                {
                  name,
                  ...defRest,
                  signatures: [{ params: fieldMapping, ...signRest }],
                },
                { withTypes: false }
              )[0].declaration
            }`,
            [`EVAL does not support function ${name}`]
          );

          testErrorsAndWarnings(
            `from a_index | eval ${
              getFunctionSignatures(
                {
                  name,
                  ...defRest,
                  signatures: [{ params: fieldMapping, ...signRest }],
                },
                { withTypes: false }
              )[0].declaration
            } > 0`,
            [`EVAL does not support function ${name}`]
          );
        }
      }

      for (const { name, alias, signatures, ...defRest } of evalFunctionsDefinitions) {
        for (const { params, ...signRest } of signatures) {
          const fieldMapping = getFieldMapping(params);
          testErrorsAndWarnings(
            `from a_index | eval var = ${
              getFunctionSignatures(
                {
                  name,
                  ...defRest,
                  signatures: [{ params: fieldMapping, ...signRest }],
                },
                { withTypes: false }
              )[0].declaration
            }`,
            []
          );
          testErrorsAndWarnings(
            `from a_index | eval ${
              getFunctionSignatures(
                { name, ...defRest, signatures: [{ params: fieldMapping, ...signRest }] },
                { withTypes: false }
              )[0].declaration
            }`,
            []
          );
          if (params.some(({ literalOnly }) => literalOnly)) {
            const fieldReplacedType = params
              .filter(({ literalOnly }) => literalOnly)
              .map(({ type }) => type);
            // create the mapping without the literal flag
            // this will make the signature wrong on purpose where in place on constants
            // the arg will be a column of the same type
            const fieldMappingWithoutLiterals = getFieldMapping(
              params.map(({ literalOnly, ...rest }) => rest)
            );
            testErrorsAndWarnings(
              `from a_index | eval ${
                getFunctionSignatures(
                  {
                    name,
                    ...defRest,
                    signatures: [{ params: fieldMappingWithoutLiterals, ...signRest }],
                  },
                  { withTypes: false }
                )[0].declaration
              }`,
              fieldReplacedType.map(
                (type) => `Argument of [${name}] must be a constant, received [${type}Field]`
              )
            );
          }

          if (alias) {
            for (const otherName of alias) {
              const signatureStringWithAlias = getFunctionSignatures(
                {
                  name: otherName,
                  ...defRest,
                  signatures: [{ params: fieldMapping, ...signRest }],
                },
                { withTypes: false }
              )[0].declaration;

              testErrorsAndWarnings(`from a_index | eval var = ${signatureStringWithAlias}`, []);
            }
          }

          // Skip functions that have only arguments of type "any", as it is not possible to pass "the wrong type".
          // auto_bucket and to_version functions are a bit harder to test exactly a combination of argument and predict the
          // the right error message
          if (
            params.every(({ type }) => type !== 'any') &&
            !['auto_bucket', 'to_version', 'mv_sort'].includes(name)
          ) {
            // now test nested functions
            const fieldMappingWithNestedFunctions = getFieldMapping(params, {
              useNestedFunction: true,
              useLiterals: true,
            });
            testErrorsAndWarnings(
              `from a_index | eval var = ${
                getFunctionSignatures(
                  {
                    name,
                    ...defRest,
                    signatures: [{ params: fieldMappingWithNestedFunctions, ...signRest }],
                  },
                  { withTypes: false }
                )[0].declaration
              }`
            );

            const { wrongFieldMapping, expectedErrors } = generateIncorrectlyTypedParameters(
              name,
              signatures,
              params,
              {
                stringField: 'stringField',
                numberField: 'numberField',
                booleanField: 'booleanField',
              }
            );
            testErrorsAndWarnings(
              `from a_index | eval ${
                getFunctionSignatures(
                  { name, ...defRest, signatures: [{ params: wrongFieldMapping, ...signRest }] },
                  { withTypes: false }
                )[0].declaration
              }`,
              expectedErrors
            );

            if (!signRest.minParams) {
              // test that additional args are spotted
              const fieldMappingWithOneExtraArg = getFieldMapping(params).concat({
                name: 'extraArg',
                type: 'number',
              });
              const refSignature = signatures[0];
              // get the expected args from the first signature in case of errors
              const minNumberOfArgs = refSignature.params.filter(
                ({ optional }) => !optional
              ).length;
              const fullNumberOfArgs = refSignature.params.length;
              const hasOptionalArgs = minNumberOfArgs < fullNumberOfArgs;
              const hasTooManyArgs = fieldMappingWithOneExtraArg.length > fullNumberOfArgs;

              // the validation engine tries to be smart about signatures with optional args
              let messageQuantifier = 'exactly ';
              if (hasOptionalArgs && hasTooManyArgs) {
                messageQuantifier = 'no more than ';
              }
              if (!hasOptionalArgs && !hasTooManyArgs) {
                messageQuantifier = 'at least ';
              }
              testErrorsAndWarnings(
                `from a_index | eval ${
                  getFunctionSignatures(
                    {
                      name,
                      ...defRest,
                      signatures: [{ params: fieldMappingWithOneExtraArg, ...signRest }],
                    },
                    { withTypes: false }
                  )[0].declaration
                }`,
                [
                  `Error: [${name}] function expects ${messageQuantifier}${
                    fullNumberOfArgs === 1
                      ? 'one argument'
                      : fullNumberOfArgs === 0
                      ? '0 arguments'
                      : `${fullNumberOfArgs} arguments`
                  }, got ${fieldMappingWithOneExtraArg.length}.`,
                ]
              );
            }
          }

          // test that wildcard won't work as arg
          if (fieldMapping.length === 1 && !signRest.minParams) {
            const fieldMappingWithWildcard = [...fieldMapping];
            fieldMappingWithWildcard[0].name = '*';

            testErrorsAndWarnings(
              `from a_index | eval var = ${
                getFunctionSignatures(
                  {
                    name,
                    ...defRest,
                    signatures: [{ params: fieldMappingWithWildcard, ...signRest }],
                  },
                  { withTypes: false }
                )[0].declaration
              }`,
              [`Using wildcards (*) in ${name} is not allowed`]
            );
          }
        }
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
      for (const op of ['>', '>=', '<', '<=', '==']) {
        testErrorsAndWarnings(`from a_index | eval numberField ${op} 0`, []);
        testErrorsAndWarnings(`from a_index | eval NOT numberField ${op} 0`, []);
        testErrorsAndWarnings(`from a_index | eval (numberField ${op} 0)`, []);
        testErrorsAndWarnings(`from a_index | eval (NOT (numberField ${op} 0))`, []);
        testErrorsAndWarnings(`from a_index | eval 1 ${op} 0`, []);
        testErrorsAndWarnings(`from a_index | eval stringField ${op} 0`, [
          `Argument of [${op}] must be [number], found value [stringField] type [string]`,
        ]);
      }
      for (const op of ['+', '-', '*', '/', '%']) {
        testErrorsAndWarnings(`from a_index | eval numberField ${op} 1`, []);
        testErrorsAndWarnings(`from a_index | eval (numberField ${op} 1)`, []);
        testErrorsAndWarnings(`from a_index | eval 1 ${op} 1`, []);
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
        'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
      ]);
      testErrorsAndWarnings('from a_index | eval numberField in ("a", "b", "c")', [
        'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
      ]);
      testErrorsAndWarnings('from a_index | eval numberField not in ("a", "b", "c")', [
        'Argument of [not_in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
      ]);
      testErrorsAndWarnings('from a_index | eval numberField not in (1, 2, 3, stringField)', [
        'Argument of [not_in] must be [number[]], found value [(1, 2, 3, stringField)] type [(number, number, number, string)]',
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

      for (const { name, alias, signatures, ...defRest } of statsAggregationFunctionDefinitions) {
        for (const { params, ...signRest } of signatures) {
          const fieldMapping = getFieldMapping(params);

          const correctSignature = getFunctionSignatures(
            { name, ...defRest, signatures: [{ params: fieldMapping, ...signRest }] },
            { withTypes: false }
          )[0].declaration;
          testErrorsAndWarnings(`from a_index | stats var = ${correctSignature}`, []);
          testErrorsAndWarnings(`from a_index | stats ${correctSignature}`, []);

          if (signRest.returnType === 'number') {
            testErrorsAndWarnings(`from a_index | stats var = round(${correctSignature})`, []);
            testErrorsAndWarnings(`from a_index | stats round(${correctSignature})`, []);
            testErrorsAndWarnings(
              `from a_index | stats var = round(${correctSignature}) + ${correctSignature}`,
              []
            );
            testErrorsAndWarnings(
              `from a_index | stats round(${correctSignature}) + ${correctSignature}`,
              []
            );
          }

          if (params.some(({ literalOnly }) => literalOnly)) {
            const fieldReplacedType = params
              .filter(({ literalOnly }) => literalOnly)
              .map(({ type }) => type);
            // create the mapping without the literal flag
            // this will make the signature wrong on purpose where in place on constants
            // the arg will be a column of the same type
            const fieldMappingWithoutLiterals = getFieldMapping(
              params.map(({ literalOnly, ...rest }) => rest)
            );
            testErrorsAndWarnings(
              `from a_index | stats ${
                getFunctionSignatures(
                  {
                    name,
                    ...defRest,
                    signatures: [{ params: fieldMappingWithoutLiterals, ...signRest }],
                  },
                  { withTypes: false }
                )[0].declaration
              }`,
              fieldReplacedType.map(
                (type) => `Argument of [${name}] must be a constant, received [${type}Field]`
              )
            );
          }

          if (alias) {
            for (const otherName of alias) {
              const signatureStringWithAlias = getFunctionSignatures(
                {
                  name: otherName,
                  ...defRest,
                  signatures: [{ params: fieldMapping, ...signRest }],
                },
                { withTypes: false }
              )[0].declaration;

              testErrorsAndWarnings(`from a_index | stats var = ${signatureStringWithAlias}`, []);
            }
          }

          // test only numeric functions for now
          if (params[0].type === 'number') {
            const nestedBuiltin = 'numberField / 2';
            const fieldMappingWithNestedBuiltinFunctions = getFieldMapping(params);
            fieldMappingWithNestedBuiltinFunctions[0].name = nestedBuiltin;

            const fnSignatureWithBuiltinString = getFunctionSignatures(
              {
                name,
                ...defRest,
                signatures: [{ params: fieldMappingWithNestedBuiltinFunctions, ...signRest }],
              },
              { withTypes: false }
            )[0].declaration;
            // from a_index | STATS aggFn( numberField / 2 )
            testErrorsAndWarnings(`from a_index | stats ${fnSignatureWithBuiltinString}`, []);
            testErrorsAndWarnings(
              `from a_index | stats var0 = ${fnSignatureWithBuiltinString}`,
              []
            );
            testErrorsAndWarnings(
              `from a_index | stats avg(numberField), ${fnSignatureWithBuiltinString}`,
              []
            );
            testErrorsAndWarnings(
              `from a_index | stats avg(numberField), var0 = ${fnSignatureWithBuiltinString}`,
              []
            );

            const nestedEvalAndBuiltin = 'round(numberField / 2)';
            const fieldMappingWithNestedEvalAndBuiltinFunctions = getFieldMapping(params);
            fieldMappingWithNestedBuiltinFunctions[0].name = nestedEvalAndBuiltin;

            const fnSignatureWithEvalAndBuiltinString = getFunctionSignatures(
              {
                name,
                ...defRest,
                signatures: [
                  { params: fieldMappingWithNestedEvalAndBuiltinFunctions, ...signRest },
                ],
              },
              { withTypes: false }
            )[0].declaration;
            // from a_index | STATS aggFn( round(numberField / 2) )
            testErrorsAndWarnings(
              `from a_index | stats ${fnSignatureWithEvalAndBuiltinString}`,
              []
            );
            testErrorsAndWarnings(
              `from a_index | stats var0 = ${fnSignatureWithEvalAndBuiltinString}`,
              []
            );
            testErrorsAndWarnings(
              `from a_index | stats avg(numberField), ${fnSignatureWithEvalAndBuiltinString}`,
              []
            );
            testErrorsAndWarnings(
              `from a_index | stats avg(numberField), var0 = ${fnSignatureWithEvalAndBuiltinString}`,
              []
            );
            // from a_index | STATS aggFn(round(numberField / 2) ) BY round(numberField / 2)
            testErrorsAndWarnings(
              `from a_index | stats ${fnSignatureWithEvalAndBuiltinString} by ${nestedEvalAndBuiltin}`,
              []
            );
            testErrorsAndWarnings(
              `from a_index | stats var0 = ${fnSignatureWithEvalAndBuiltinString} by var1 = ${nestedEvalAndBuiltin}`,
              []
            );
            testErrorsAndWarnings(
              `from a_index | stats avg(numberField), ${fnSignatureWithEvalAndBuiltinString} by ${nestedEvalAndBuiltin}, ipField`,
              []
            );
            testErrorsAndWarnings(
              `from a_index | stats avg(numberField), var0 = ${fnSignatureWithEvalAndBuiltinString} by var1 = ${nestedEvalAndBuiltin}, ipField`,
              []
            );
            testErrorsAndWarnings(
              `from a_index | stats avg(numberField), ${fnSignatureWithEvalAndBuiltinString} by ${nestedEvalAndBuiltin}, ${nestedBuiltin}`,
              []
            );
            testErrorsAndWarnings(
              `from a_index | stats avg(numberField), var0 = ${fnSignatureWithEvalAndBuiltinString} by var1 = ${nestedEvalAndBuiltin}, ${nestedBuiltin}`,
              []
            );
          }

          // Skip functions that have only arguments of type "any", as it is not possible to pass "the wrong type".
          // auto_bucket and to_version functions are a bit harder to test exactly a combination of argument and predict the
          // the right error message
          if (
            params.every(({ type }) => type !== 'any') &&
            !['auto_bucket', 'to_version', 'mv_sort'].includes(name)
          ) {
            // now test nested functions
            const fieldMappingWithNestedAggsFunctions = getFieldMapping(params, {
              useNestedFunction: true,
              useLiterals: false,
            });
            const nestedAggsExpectedErrors = params
              .filter(({ literalOnly }) => !literalOnly)
              .map(
                (_) =>
                  `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [avg(numberField)] of type [number]`
              );
            testErrorsAndWarnings(
              `from a_index | stats var = ${
                getFunctionSignatures(
                  {
                    name,
                    ...defRest,
                    signatures: [{ params: fieldMappingWithNestedAggsFunctions, ...signRest }],
                  },
                  { withTypes: false }
                )[0].declaration
              }`,
              nestedAggsExpectedErrors
            );
            testErrorsAndWarnings(
              `from a_index | stats ${
                getFunctionSignatures(
                  {
                    name,
                    ...defRest,
                    signatures: [{ params: fieldMappingWithNestedAggsFunctions, ...signRest }],
                  },
                  { withTypes: false }
                )[0].declaration
              }`,
              nestedAggsExpectedErrors
            );
            const { wrongFieldMapping, expectedErrors } = generateIncorrectlyTypedParameters(
              name,
              signatures,
              params,
              {
                stringField: 'stringField',
                numberField: 'numberField',
                booleanField: 'booleanField',
              }
            );
            // and the message is case of wrong argument type is passed
            testErrorsAndWarnings(
              `from a_index | stats ${
                getFunctionSignatures(
                  { name, ...defRest, signatures: [{ params: wrongFieldMapping, ...signRest }] },
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
                `from a_index | stats var = ${
                  getFunctionSignatures(
                    {
                      name,
                      ...defRest,
                      signatures: [{ params: fieldMappingWithWildcard, ...signRest }],
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
