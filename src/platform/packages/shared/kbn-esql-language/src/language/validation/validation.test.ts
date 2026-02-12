/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { EsqlFieldType } from '@kbn/esql-types';
import type { SupportedDataType, FunctionDefinition, ESQLMessage, EditorError } from '../../..';
import { timeUnitsToSuggest, dataTypes, getNoValidCallSignatureError } from '../../..';
import { getFunctionSignatures } from '../../commands/definitions/utils';
import { scalarFunctionDefinitions } from '../../commands/definitions/generated/scalar_functions';
import { aggFunctionDefinitions } from '../../commands/definitions/generated/aggregation_functions';
import { readFile, writeFile } from 'fs/promises';
import { camelCase } from 'lodash';
import { join } from 'path';
import {
  enrichFields,
  fields,
  getCallbackMocks,
  indexes,
  policies,
  unsupported_field,
} from '../../__tests__/language/helpers';
import { setup } from './__tests__/helpers';
import { validateQuery } from './validation';

const NESTING_LEVELS = 4;
const NESTED_DEPTHS = Array(NESTING_LEVELS)
  .fill(0)
  .map((_, i) => i + 1);

const toAvgSignature = aggFunctionDefinitions.find(({ name }) => name === 'avg')!;
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
  time_duration: timeUnitsToSuggest[0].name,
};
function getLiteralType(typeString: 'time_duration') {
  return `1 ${literals[typeString]}`;
}

export const fieldNameFromType = (type: EsqlFieldType) => `${camelCase(type)}Field`;

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
    ({ name: _name, type, constantOnly, suggestedValues: literalOptions, ...rest }) => {
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
          name: getLiteralType(typeString as 'time_duration'),
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
              fields: fields.concat([
                { name: policies[0].matchField, type: 'keyword', userDefined: false },
              ]),
              enrichFields: enrichFields.concat([
                { name: policies[0].matchField, type: 'keyword', userDefined: false },
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
          const { warnings, errors } = await validateQuery(statement, callbackMocks);
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
    // by suppressing the parser error in src/platform/packages/shared/kbn-esql-language/src/parser/esql_error_listener.ts
    describe('EMPTY query does NOT produce syntax error', () => {
      testErrorsAndWarnings('', []);
      testErrorsAndWarnings(' ', []);
      testErrorsAndWarnings('     ', []);
    });

    describe('FROM <sources> [ METADATA <indices> ]', () => {
      test('errors on invalid command start', async () => {
        const { expectErrors } = await setup();

        await expectErrors('f', [expect.any(String)]);
        await expectErrors('from ', [
          "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, '(', UNQUOTED_SOURCE}",
        ]);
      });

      describe('... <sources> ...', () => {
        test('errors on trailing comma', async () => {
          const { expectErrors } = await setup();

          await expectErrors('from index,', [
            "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, '(', UNQUOTED_SOURCE}",
          ]);
          await expectErrors(`FROM index\n, \tother_index\t,\n \t `, [
            "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, '(', UNQUOTED_SOURCE}",
          ]);

          await expectErrors(`from assignment = 1`, [
            "SyntaxError: mismatched input '=' expecting <EOF>",
            'Unknown index "assignment"',
          ]);
        });

        test('errors on invalid syntax', async () => {
          const { expectErrors } = await setup();

          await expectErrors('FROM `index`', ['Unknown index "`index`"']);
          await expectErrors(`from assignment = 1`, [
            "SyntaxError: mismatched input '=' expecting <EOF>",
            'Unknown index "assignment"',
          ]);
        });
      });

      describe('... METADATA <indices>', () => {
        test('errors when wrapped in parentheses', async () => {
          const { expectErrors } = await setup();

          await expectErrors(`from index (metadata _id)`, [
            "SyntaxError: mismatched input '(' expecting <EOF>",
          ]);
        });

        describe('validates fields', () => {
          test('validates fields', async () => {
            const { expectErrors } = await setup();
            await expectErrors(`from index metadata _id, _source METADATA _id2`, [
              "SyntaxError: mismatched input 'METADATA' expecting <EOF>",
            ]);
          });
        });
      });
    });

    describe('row', () => {
      testErrorsAndWarnings('row', [expect.stringContaining('SyntaxError:')]);

      test('syntax error', async () => {
        const { expectErrors } = await setup();

        await expectErrors('row var = 1 in ', [expect.stringContaining('SyntaxError:')]);
        await expectErrors('row var = 1 in (', [expect.stringContaining('SyntaxError:')]);
        await expectErrors('row var = 1 not in ', [expect.stringContaining('SyntaxError:')]);
      });
    });

    describe('limit', () => {
      testErrorsAndWarnings('from index | limit ', [
        `SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, '['}`,
      ]);
      testErrorsAndWarnings('from index | limit 4 ', []);
      testErrorsAndWarnings('from index | limit a', [
        "SyntaxError: mismatched input 'a' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, '['}",
      ]);
      testErrorsAndWarnings('from index | limit doubleField', [
        "SyntaxError: mismatched input 'doubleField' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, '['}",
      ]);
      testErrorsAndWarnings('from index | limit textField', [
        "SyntaxError: mismatched input 'textField' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', 'null', '?', 'true', '+', '-', NAMED_OR_POSITIONAL_PARAM, '['}",
      ]);
      testErrorsAndWarnings('from index | limit 4', []);
    });

    describe('join', () => {
      testErrorsAndWarnings('ROW a=1::LONG | LOOKUP JOIN t ON a', [
        '"t" is not a valid JOIN index. Please use a "lookup" mode index.',
      ]);

      testErrorsAndWarnings(
        'FROM a_index | LEFT JOIN join_index ON textField == keywordField, booleanField',
        ['JOIN ON clause must be a comma separated list of fields or a single expression']
      );
    });

    describe('drop', () => {
      testErrorsAndWarnings('from index | drop ', [
        expect.stringContaining('SyntaxError: mismatched input'),
        'Unknown column ""',
      ]);
      testErrorsAndWarnings('from index | drop 4.5', [
        expect.stringContaining('SyntaxError:'),
        expect.stringContaining('SyntaxError:'),
        expect.stringContaining('SyntaxError:'),
        'Unknown column "."',
      ]);
      testErrorsAndWarnings('from index | drop missingField, doubleField, dateField', [
        'Unknown column "missingField"',
      ]);
    });

    describe('mv_expand', () => {
      testErrorsAndWarnings('from a_index | mv_expand ', [expect.stringContaining('SyntaxError:')]);

      testErrorsAndWarnings('from a_index | mv_expand doubleField, b', [
        expect.stringContaining('SyntaxError:'),
        expect.stringContaining('SyntaxError:'),
      ]);
    });

    describe('rename', () => {
      testErrorsAndWarnings('from a_index | rename', [expect.stringContaining('SyntaxError:')]);
      testErrorsAndWarnings('from a_index | rename textField', [
        "SyntaxError: no viable alternative at input 'textField'",
      ]);
      testErrorsAndWarnings('from a_index | rename a', [
        "SyntaxError: no viable alternative at input 'a'",
      ]);
      testErrorsAndWarnings('from a_index | rename textField as', [
        expect.stringContaining('SyntaxError:'),
        'AS expected 2 arguments, but got 1.',
      ]);
      testErrorsAndWarnings('row a = 10 | rename a as this is fine', [
        "SyntaxError: mismatched input 'is' expecting <EOF>",
      ]);
    });

    describe('dissect', () => {
      testErrorsAndWarnings('from a_index | dissect', [expect.stringContaining('SyntaxError:')]);
      testErrorsAndWarnings('from a_index | dissect textField', [
        "SyntaxError: missing QUOTED_STRING at '<EOF>'",
      ]);
      testErrorsAndWarnings('from a_index | dissect textField 2', [
        "SyntaxError: mismatched input '2' expecting QUOTED_STRING",
      ]);
      testErrorsAndWarnings('from a_index | dissect textField .', [
        "SyntaxError: mismatched input '<EOF>' expecting {'?', '??', NAMED_OR_POSITIONAL_PARAM, NAMED_OR_POSITIONAL_DOUBLE_PARAMS, UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
      ]);
      testErrorsAndWarnings('from a_index | dissect textField %a', [
        "SyntaxError: mismatched input '%' expecting QUOTED_STRING",
        "SyntaxError: mismatched input '<EOF>' expecting '='",
      ]);
    });

    describe('grok', () => {
      testErrorsAndWarnings('from a_index | grok', [expect.stringContaining('SyntaxError:')]);
      testErrorsAndWarnings('from a_index | grok textField', [
        expect.stringContaining('SyntaxError:'),
      ]);
      testErrorsAndWarnings('from a_index | grok textField 2', [
        expect.stringContaining('SyntaxError:'),
      ]);
      testErrorsAndWarnings('from a_index | grok textField .', [
        expect.stringContaining('SyntaxError:'),
      ]);
      testErrorsAndWarnings('from a_index | grok textField %a', [
        expect.stringContaining('SyntaxError:'),
      ]);
      // testErrorsAndWarnings('from a_index | grok s* "%{a}"', [
      //   'Using wildcards (*) in grok is not allowed [s*]',
      // ]);
    });

    describe('where', () => {
      for (const wrongOp of ['*', '/', '%']) {
        testErrorsAndWarnings(`from a_index | where ${wrongOp}+ doubleField`, [
          expect.stringContaining('SyntaxError:'),
        ]);
      }
    });

    describe('eval', () => {
      testErrorsAndWarnings('from a_index | eval ', [expect.stringContaining('SyntaxError:')]);
      testErrorsAndWarnings('from a_index | eval doubleField + ', [
        expect.stringContaining('SyntaxError:'),
      ]);

      testErrorsAndWarnings('from a_index | eval a=round(', [
        expect.stringContaining('SyntaxError:'),
      ]);
      testErrorsAndWarnings('from a_index | eval a=round(doubleField) ', []);
      testErrorsAndWarnings('from a_index | eval a=round(doubleField), ', [
        expect.stringContaining('SyntaxError:'),
      ]);

      for (const wrongOp of ['*', '/', '%']) {
        testErrorsAndWarnings(`from a_index | eval ${wrongOp}+ doubleField`, [
          expect.stringContaining('SyntaxError:'),
        ]);
      }
    });

    describe('sort', () => {
      testErrorsAndWarnings('from a_index | sort ', [expect.stringContaining('SyntaxError:')]);
      testErrorsAndWarnings('from a_index | sort doubleField, ', [
        expect.stringContaining('SyntaxError:'),
      ]);

      for (const dir of ['desc', 'asc']) {
        testErrorsAndWarnings(`from a_index | sort doubleField ${dir} nulls `, [
          "SyntaxError: missing {'first', 'last'} at '<EOF>'",
        ]);
        for (const nullDir of ['first', 'last']) {
          testErrorsAndWarnings(`from a_index | sort doubleField ${dir} ${nullDir}`, [
            `SyntaxError: extraneous input '${nullDir}' expecting <EOF>`,
          ]);
        }
      }
      for (const nullDir of ['first', 'last']) {
        testErrorsAndWarnings(`from a_index | sort doubleField ${nullDir}`, [
          `SyntaxError: extraneous input '${nullDir}' expecting <EOF>`,
        ]);
      }
    });

    describe('enrich', () => {
      testErrorsAndWarnings(`from a_index | enrich`, [
        "SyntaxError: missing {ENRICH_POLICY_NAME, QUOTED_STRING} at '<EOF>'",
      ]);
      testErrorsAndWarnings(`from a_index | enrich _:`, [
        "SyntaxError: token recognition error at: ':'",
        'Unknown policy "_"',
      ]);
      testErrorsAndWarnings(`from a_index | enrich :policy`, [
        "SyntaxError: token recognition error at: ':'",
      ]);

      testErrorsAndWarnings(`from a_index | enrich policy on textField with `, [
        expect.stringContaining('SyntaxError:'),
      ]);
      testErrorsAndWarnings(`from a_index | enrich policy with `, [
        expect.stringContaining('SyntaxError:'),
      ]);
    });

    describe('settings', () => {
      // Should return error if there is no query following SET
      testErrorsAndWarnings(`SET time_zone = "CEST";`, [expect.stringContaining('SyntaxError:')]);
      testErrorsAndWarnings(`SET invalid_setting = "_alias:_origin"; FROM index`, [
        expect.stringContaining('Unknown setting invalid_setting'),
      ]);
    });

    describe('shadowing', () => {
      // fields shadowing validation removed
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
        await validateQuery(`row a = 1 | eval a`, callbackMocks);
        expect(callbackMocks.getColumnsFor).not.toHaveBeenCalled();
        expect(callbackMocks.getSources).not.toHaveBeenCalled();
      });

      it(`should not fetch policies if no enrich command is found`, async () => {
        const callbackMocks = getCallbackMocks();
        await validateQuery(`row a = 1 | eval a`, callbackMocks);
        expect(callbackMocks.getPolicies).not.toHaveBeenCalled();
      });

      it(`should not fetch source and fields for empty command`, async () => {
        const callbackMocks = getCallbackMocks();
        await validateQuery(` `, callbackMocks);
        expect(callbackMocks.getColumnsFor).not.toHaveBeenCalled();
        expect(callbackMocks.getSources).not.toHaveBeenCalled();
      });

      it(`should skip initial source and fields call but still call fields for enriched policy`, async () => {
        const callbackMocks = getCallbackMocks();
        await validateQuery(`row a = 1 | eval b  = a | enrich policy`, callbackMocks);
        expect(callbackMocks.getSources).not.toHaveBeenCalled();
        expect(callbackMocks.getPolicies).toHaveBeenCalled();
        expect(callbackMocks.getColumnsFor).toHaveBeenCalledTimes(0);
      });

      it(`should fetch additional fields if an enrich command is found`, async () => {
        const callbackMocks = getCallbackMocks();
        await validateQuery(`from a_index | eval b  = a | enrich policy`, callbackMocks);
        expect(callbackMocks.getSources).toHaveBeenCalled();
        expect(callbackMocks.getPolicies).toHaveBeenCalled();
        expect(callbackMocks.getColumnsFor).toHaveBeenCalledTimes(0);
      });

      it(`should not crash if no callbacks are available`, async () => {
        try {
          await validateQuery(
            `from a_index | eval b  = a | enrich policy | dissect textField "%{firstWord}"`,
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
            `from a_index | eval b  = a | enrich policy | dissect textField "%{firstWord}"`
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
        getNoValidCallSignatureError('trim', ['double']),
      ]);
      testErrorsAndWarnings('from a_index | eval trim(23::keyword)', []);
      testErrorsAndWarnings('from a_index | eval 1 + "2"::long', []);
      testErrorsAndWarnings('from a_index | eval 1 + "2"::LONG', []);
      testErrorsAndWarnings('from a_index | eval 1 + "2"::Long', []);
      testErrorsAndWarnings('from a_index | eval 1 + "2"::LoNg', []);

      testErrorsAndWarnings('from a_index | eval 1 + "2"', [
        getNoValidCallSignatureError('+', ['integer', 'keyword']),
      ]);
      testErrorsAndWarnings(
        'from a_index | eval trim(to_double("23")::keyword::double::long::keyword::double)',
        [getNoValidCallSignatureError('trim', ['double'])]
      );

      testErrorsAndWarnings('from a_index | eval CEIL(23::long)', []);
      testErrorsAndWarnings('from a_index | eval CEIL(23::unsigned_long)', []);
      testErrorsAndWarnings('from a_index | eval CEIL(23::int)', []);
      testErrorsAndWarnings('from a_index | eval CEIL(23::integer)', []);
      testErrorsAndWarnings('from a_index | eval CEIL(23::Integer)', []);
      testErrorsAndWarnings('from a_index | eval CEIL(23::double)', []);
      testErrorsAndWarnings('from a_index | eval CEIL(23::DOUBLE)', []);

      testErrorsAndWarnings('from a_index | eval TRIM(23::keyword)', []);
      testErrorsAndWarnings('from a_index | eval TRIM(23::string)', []);
      testErrorsAndWarnings('from a_index | eval TRIM(23::keyword)', []);

      testErrorsAndWarnings('from a_index | eval true AND 0::boolean', []);
      testErrorsAndWarnings('from a_index | eval true AND 0::bool', []);
      testErrorsAndWarnings('from a_index | eval true AND 0', [
        // just a counter-case to make sure the previous tests are meaningful
        getNoValidCallSignatureError('and', ['boolean', 'integer']),
      ]);

      // enforces strings for cartesian_point conversion
      // testErrorsAndWarnings('from a_index | eval 23::cartesian_point', ['wrong type!']);

      // still validates nested functions when they are casted
      testErrorsAndWarnings('from a_index | eval to_lower(trim(doubleField)::keyword)', [
        getNoValidCallSignatureError('trim', ['double']),
      ]);
      testErrorsAndWarnings(
        'from a_index | eval to_upper(trim(doubleField)::keyword::keyword::keyword::keyword)',
        [getNoValidCallSignatureError('trim', ['double'])]
      );
      testErrorsAndWarnings(
        'from a_index | eval to_lower(to_upper(trim(doubleField)::keyword)::keyword)',
        [getNoValidCallSignatureError('trim', ['double'])]
      );
    });

    describe('unsupported fields', () => {
      testErrorsAndWarnings(
        `from a_index | keep unsupportedField`,
        [],
        [
          'Field "unsupportedField" cannot be retrieved, it is unsupported or not indexed; returning null',
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
      const localTestCases: Array<{ query: string; error: string[] }> = [];
      if (localTestCases.length) {
        return { testCases: localTestCases };
      }
      const json = await readFile(join(__dirname, 'esql_validation_meta_tests.json'), 'utf8');
      const esqlPackage = JSON.parse(json);
      return esqlPackage as Fixtures;
    }

    function excludeErrorsByContent(excludedCallback: string[]) {
      const contentByCallback = {
        getSources: /Unknown index/,
        getPolicies: /Unknown policy/,
        getColumnsFor: /Unknown column|Argument of|it is unsupported or not indexed/,
        getPreferences: /Unknown/,
        getFieldsMetadata: /Unknown/,
        getVariables: /Unknown/,
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
          .map(({ query }) => validateQuery(query, getCallbackMocks()))
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
    it.each(['getSources', 'getColumnsFor', 'getPolicies'])(
      `should not error if %s is missing`,
      async (excludedCallback) => {
        const filteredTestCases = fixtures.testCases.filter((t) =>
          t.error.some((message) =>
            excludeErrorsByContent([excludedCallback]).every((regexp) => regexp?.test(message))
          )
        );
        const allErrors = await Promise.all(
          filteredTestCases.map(({ query }) =>
            validateQuery(query, getPartialCallbackMocks(excludedCallback))
          )
        );
        for (const { errors } of allErrors) {
          const errorCodes = errors.map((e) => e.code);
          // Verify errors related to excluded callback are not present
          if (excludedCallback === 'getSources') {
            expect(errorCodes.every((code) => code !== 'unknownIndex')).toBe(true);
          } else if (excludedCallback === 'getColumnsFor') {
            expect(
              errorCodes.every(
                (code) =>
                  code !== 'unknownColumn' &&
                  code !== 'wrongArgumentType' &&
                  code !== 'unsupportedFieldType'
              )
            ).toBe(true);
          } else if (excludedCallback === 'getPolicies') {
            expect(errorCodes.every((code) => code !== 'unknownPolicy')).toBe(true);
          }
        }
      }
    );

    it('should work if no callback passed', async () => {
      const excludedCallbacks = ['getSources', 'getPolicies', 'getColumnsFor'];
      for (const testCase of fixtures.testCases.filter((t) =>
        t.error.some((message) =>
          excludeErrorsByContent(excludedCallbacks).every((regexp) => regexp?.test(message))
        )
      )) {
        const { errors } = await validateQuery(testCase.query, {});
        // Verify no callback-dependent errors are present
        const errorCodes = errors.map((e) => e.code);
        expect(
          errorCodes.every(
            (code) =>
              code !== 'unknownIndex' &&
              code !== 'unknownColumn' &&
              code !== 'wrongArgumentType' &&
              code !== 'unsupportedFieldType' &&
              code !== 'unknownPolicy'
          )
        ).toBe(true);
      }
    });
  });

  describe('Error Tagging behavior', () => {
    // Helper to get error text from either ESQLMessage or EditorError
    const getErrorText = (error: ESQLMessage | EditorError): string => {
      if ('text' in error) {
        return (error as ESQLMessage).text;
      } else {
        return (error as EditorError).message;
      }
    };

    it('should preserve syntax errors regardless of missing callbacks', async () => {
      const { errors } = await validateQuery('FROM index | WHERE field ==', {});

      // ANTLR parser should still catch basic syntax errors
      expect(errors.length).toBeGreaterThan(0);
      const hasSyntaxError = errors.some((e) => {
        const errorText = getErrorText(e);
        return (
          errorText?.includes('mismatched input') ||
          errorText?.includes('missing') ||
          errorText?.includes('==')
        );
      });
      expect(hasSyntaxError).toBe(true);
    });

    it('should filter semantic errors when required callback is missing', async () => {
      const callbacks = {
        ...getCallbackMocks(),
        getColumnsFor: undefined, // Missing this callback
      };

      const { errors } = await validateQuery('FROM index | WHERE unknownField > 10', callbacks);

      const hasUnknownColumnError = errors.some((e) => e.code === 'unknownColumn');
      expect(hasUnknownColumnError).toBe(false);
    });

    it('should show semantic errors when required callback is available', async () => {
      const callbacks = getCallbackMocks(); // All callbacks available

      const { errors } = await validateQuery('FROM index | WHERE unknownField > 10', callbacks);

      const unknownColumnError = errors.find((e) => e.code === 'unknownColumn');
      expect(unknownColumnError).toBeDefined();
      if (unknownColumnError) {
        const errorText = getErrorText(unknownColumnError);
        expect(errorText).toContain('unknownField');
      }
    });

    it('should handle mixed syntax and semantic errors correctly', async () => {
      const callbacks = {
        ...getCallbackMocks(),
        getSources: undefined, // Missing source callback
      };

      const { errors } = await validateQuery(
        'FROM unknown_index | LIMIT abc', // unknown_index (semantic) + invalid limit (syntax)
        callbacks
      );

      expect(errors.length).toBeGreaterThan(0);

      const hasUnknownIndexError = errors.some((e) => e.code === 'unknownIndex');
      expect(hasUnknownIndexError).toBe(false);
    });

    it('should filter errors based on specific callback requirements', async () => {
      const callbacksNoSources = {
        ...getCallbackMocks(),
        getSources: undefined,
      };

      const { errors: errorsNoSources } = await validateQuery(
        'FROM unknown_index | ENRICH unknown_policy',
        callbacksNoSources
      );

      expect(errorsNoSources.some((e) => e.code === 'unknownIndex')).toBe(false);
      expect(errorsNoSources.some((e) => e.code === 'unknownPolicy')).toBe(true);

      const callbacksNoPolicies = {
        ...getCallbackMocks(),
        getPolicies: undefined,
      };

      const { errors: errorsNoPolicies } = await validateQuery(
        'FROM unknown_index | ENRICH unknown_policy',
        callbacksNoPolicies
      );

      expect(errorsNoPolicies.some((e) => e.code === 'unknownIndex')).toBe(true);
      expect(errorsNoPolicies.some((e) => e.code === 'unknownPolicy')).toBe(false);
    });

    it('should no flag Promql metrics/labels as unknown after a pipe', async () => {
      const callbacks = getCallbackMocks();
      const { errors } = await validateQuery(
        'Promql step="5m" sum(doubleField) | KEEP step',
        callbacks
      );

      expect(errors.some((e) => e.code === 'unknownColumn')).toBe(false);
    });
  });
});
