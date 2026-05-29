/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { EsqlFieldType, ESQLCallbacks } from '@kbn/esql-types';
import type { EditorError } from '@elastic/esql/types';
import type { SupportedDataType, FunctionDefinition, ESQLMessage } from '../../..';
import { timeUnitsToSuggest, dataTypes, getNoValidCallSignatureError } from '../../..';
import { getFunctionSignatures } from '../../commands/definitions/utils';
import { scalarFunctionDefinitions } from '../../commands/definitions/generated/scalar_functions';
import { aggFunctionDefinitions } from '../../commands/definitions/generated/aggregation_functions';
import { camelCase } from 'lodash';
import { getCallbackMocks } from '../../__tests__/language/helpers';
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
  describe('Full validation performed', () => {
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
    const getPartialCallbackMocks = (exclude?: string): ESQLCallbacks => ({
      ...getCallbackMocks(),
      ...(exclude ? { [exclude]: undefined } : {}),
    });

    const collectErrorCodes = async (query: string, callbacks: ESQLCallbacks) => {
      const { errors } = await validateQuery(query, callbacks);
      return errors.map((error) => error.code);
    };

    // Queries that produce errors which depend on a specific callback being available.
    // When that callback is missing, the validator must suppress the related error codes.
    const callbackScenarios = [
      {
        callback: 'getSources',
        codes: ['unknownIndex', 'unknownDataSource'],
        queries: ['FROM unknown_index', 'FROM index, unknown_index'],
      },
      {
        callback: 'getColumnsFor',
        codes: ['unknownColumn', 'wrongArgumentType', 'unsupportedFieldType'],
        queries: [
          'FROM index | KEEP unknownColumn',
          'FROM index | EVAL rounded = ROUND(keywordField)',
          'FROM index | KEEP unsupportedField',
        ],
      },
      {
        callback: 'getPolicies',
        codes: ['unknownPolicy'],
        queries: ['FROM index | ENRICH unknown_policy'],
      },
    ];

    it.each(callbackScenarios)(
      'suppresses $callback-dependent errors when $callback is missing',
      async ({ callback, codes, queries }) => {
        // Sanity: with all callbacks present, the scenario actually exercises its error codes.
        const codesWithAllCallbacks = (
          await Promise.all(queries.map((query) => collectErrorCodes(query, getCallbackMocks())))
        ).flat();
        expect(codes.some((code) => codesWithAllCallbacks.includes(code))).toBe(true);

        // With the callback removed, none of the related codes must be reported.
        const codesWithoutCallback = (
          await Promise.all(
            queries.map((query) => collectErrorCodes(query, getPartialCallbackMocks(callback)))
          )
        ).flat();
        for (const code of codes) {
          expect(codesWithoutCallback).not.toContain(code);
        }
      }
    );

    it('suppresses all callback-dependent errors when no callback is passed', async () => {
      const allCodes = callbackScenarios.flatMap(({ codes }) => codes);
      const reportedCodes = (
        await Promise.all(
          callbackScenarios.flatMap(({ queries }) =>
            queries.map((query) => collectErrorCodes(query, {}))
          )
        )
      ).flat();
      for (const code of allCodes) {
        expect(reportedCodes).not.toContain(code);
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

      const hasUnknownDataSourceError = errors.some(
        (e) => e.code === 'unknownIndex' || e.code === 'unknownDataSource'
      );
      expect(hasUnknownDataSourceError).toBe(false);
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

      expect(
        errorsNoSources.some((e) => e.code === 'unknownIndex' || e.code === 'unknownDataSource')
      ).toBe(false);
      expect(errorsNoSources.some((e) => e.code === 'unknownPolicy')).toBe(true);

      const callbacksNoPolicies = {
        ...getCallbackMocks(),
        getPolicies: undefined,
      };

      const { errors: errorsNoPolicies } = await validateQuery(
        'FROM unknown_index | ENRICH unknown_policy',
        callbacksNoPolicies
      );

      expect(
        errorsNoPolicies.some((e) => e.code === 'unknownIndex' || e.code === 'unknownDataSource')
      ).toBe(true);
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
