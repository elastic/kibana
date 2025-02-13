/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getActions } from './actions';
import { validateQuery } from '../validation/validation';
import { getAllFunctions } from '../shared/helpers';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import type { CodeActionOptions } from './types';
import type { ESQLRealField } from '../validation/types';
import type { FieldType } from '../definitions/types';
import type { ESQLCallbacks, PartialFieldsMetadataClient } from '../shared/types';
import { FULL_TEXT_SEARCH_FUNCTIONS } from '../shared/constants';

function getCallbackMocks(): jest.Mocked<ESQLCallbacks> {
  return {
    getColumnsFor: jest.fn<Promise<ESQLRealField[]>, any>(async ({ query }) => {
      if (/enrich/.test(query)) {
        const fields: ESQLRealField[] = [
          { name: 'otherField', type: 'keyword' },
          { name: 'yetAnotherField', type: 'double' },
        ];
        return fields;
      }

      if (/unsupported_index/.test(query)) {
        const fields: ESQLRealField[] = [{ name: 'unsupported_field', type: 'unsupported' }];
        return fields;
      }

      const localDataTypes: FieldType[] = ['keyword', 'double', 'date', 'boolean', 'ip'];
      const fields: ESQLRealField[] = [
        ...localDataTypes.map((type) => ({
          name: `${type}Field`,
          type,
        })),
        { name: 'geoPointField', type: 'geo_point' },
        { name: 'any#Char$Field', type: 'double' },
        { name: 'kubernetes.something.something', type: 'double' },
        { name: '@timestamp', type: 'date' },
      ];

      return fields;
    }),
    getSources: jest.fn(async () =>
      ['index', '.secretIndex', 'my-index'].map((name) => ({
        name,
        hidden: name.startsWith('.'),
      }))
    ),
    getPolicies: jest.fn(async () => [
      {
        name: 'policy',
        sourceIndices: ['enrichIndex1'],
        matchField: 'otherStringField',
        enrichFields: ['other-field', 'yetAnotherField'],
      },
      {
        name: 'policy[]',
        sourceIndices: ['enrichIndex1'],
        matchField: 'otherStringField',
        enrichFields: ['other-field', 'yetAnotherField'],
      },
    ]),
    getFieldsMetadata: jest.fn(async () => ({
      find: jest.fn(async () => ({
        fields: {},
      })),
    })) as unknown as Promise<PartialFieldsMetadataClient>,
  };
}

export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

/**
 * There are different wats to test the code here: one is a direct unit test of the feature, another is
 * an integration test passing from the query statement validation. The latter is more realistic, but
 * a little bit more tricky to setup. This function will encapsulate all the complexity
 */
function testQuickFixesFn(
  statement: string,
  expectedFixes: string[] = [],
  options: Simplify<{ equalityCheck?: 'include' | 'equal' } & CodeActionOptions> = {},
  { only, skip }: { only?: boolean; skip?: boolean } = {}
) {
  const testFn = only ? it.only : skip ? it.skip : it;
  testFn(
    `${statement} => ["${expectedFixes.join('","')}"]${
      options.relaxOnMissingCallbacks != null
        ? ` (Relaxed = ${options.relaxOnMissingCallbacks})`
        : ''
    } `,
    async () => {
      const callbackMocks = getCallbackMocks();
      const { errors } = await validateQuery(
        statement,
        getAstAndSyntaxErrors,
        undefined,
        callbackMocks
      );
      const { equalityCheck, ...fnOptions } = options || {};

      const actions = await getActions(
        statement,
        errors,
        getAstAndSyntaxErrors,
        fnOptions,
        callbackMocks
      );
      const edits = actions.map(({ edits: actionEdits }) => actionEdits[0].text);
      expect(edits).toEqual(
        !equalityCheck || equalityCheck === 'equal'
          ? expectedFixes
          : expect.arrayContaining(expectedFixes)
      );
    }
  );
}

type TestArgs = [string, string[], { equalityCheck?: 'include' | 'equal' }?];

// Make only and skip work with our custom wrapper
const testQuickFixes = Object.assign(testQuickFixesFn, {
  skip: (...args: TestArgs) => {
    const paddingArgs = ['equal'].slice(args.length - 2);
    return testQuickFixesFn(...((args.length > 1 ? [...args, ...paddingArgs] : args) as TestArgs), {
      skip: true,
    });
  },
  only: (...args: TestArgs) => {
    const paddingArgs = ['equal'].slice(args.length - 2);
    return testQuickFixesFn(...((args.length > 1 ? [...args, ...paddingArgs] : args) as TestArgs), {
      only: true,
    });
  },
});

describe('quick fixes logic', () => {
  describe('fixing index spellchecks', () => {
    for (const options of [
      undefined,
      { relaxOnMissingCallbacks: false },
      { relaxOnMissingCallbacks: false },
    ]) {
      // No error, no quick action
      testQuickFixes('FROM index', [], options);
      testQuickFixes('FROM index2', ['index'], options);
      testQuickFixes('FROM myindex', ['index', 'my-index'], options);
      // wildcards
      testQuickFixes('FROM index*', [], options);
      testQuickFixes('FROM ind*', [], options);
      testQuickFixes('FROM end*', ['ind*']);
      testQuickFixes('FROM endex*', ['index'], options);
      // Too far for the levenstein distance and should not fix with a hidden index
      testQuickFixes('FROM secretIndex', [], options);
      testQuickFixes('FROM secretIndex2', [], options);
      testQuickFixes('from index | stats var0 = aveg(bytes) | eval ab(var0) | limit 1', [
        'avg(bytes)',
        'abs(var0)',
        'e(var0)',
        'pi(var0)',
        'tan(var0)',
        'tau(var0)',
      ]);
    }
  });

  describe('fixing fields spellchecks', () => {
    for (const options of [
      undefined,
      { relaxOnMissingCallbacks: false },
      { relaxOnMissingCallbacks: false },
    ]) {
      for (const command of ['KEEP', 'DROP', 'EVAL']) {
        testQuickFixes(`FROM index | ${command} keywordField`, [], options);
        // koywordField => keywordField
        testQuickFixes(`FROM index | ${command} koywordField`, ['keywordField'], options);
        testQuickFixes(
          `FROM index | ${command} numberField, koywordField`,
          ['keywordField'],
          options
        );
      }
      testQuickFixes(`FROM index | EVAL round(koywordField)`, ['keywordField'], options);
      testQuickFixes(`FROM index | EVAL var0 = round(koywordField)`, ['keywordField'], options);
      testQuickFixes(`FROM index | WHERE round(koywordField) > 0`, ['keywordField'], options);
      testQuickFixes(`FROM index | WHERE 0 < round(koywordField)`, ['keywordField'], options);
      testQuickFixes(`FROM index | RENAME koywordField as newField`, ['keywordField'], options);
      // This levarage the knowledge of the enrich policy fields to suggest the right field
      testQuickFixes(
        `FROM index | ENRICH policy | KEEP yetAnotherField2`,
        ['yetAnotherField'],
        options
      );
      testQuickFixes(`FROM index | ENRICH policy ON koywordField`, ['keywordField'], options);
      testQuickFixes(
        `FROM index | ENRICH policy ON keywordField WITH yetAnotherField2`,
        ['yetAnotherField'],
        options
      );

      describe('metafields spellchecks', () => {
        testQuickFixes(`FROM index ${'metadata _i_ndex'}`, ['_index'], options);
        testQuickFixes(`FROM index ${'metadata _id, _i_ndex'}`, ['_index'], options);
        testQuickFixes(`FROM index ${'METADATA _id, _i_ndex'}`, ['_index'], options);
      });
    }
  });

  describe('fixing meta fields spellchecks', () => {
    for (const options of [
      undefined,
      { relaxOnMissingCallbacks: false },
      { relaxOnMissingCallbacks: false },
    ]) {
      for (const command of ['KEEP', 'DROP', 'EVAL']) {
        testQuickFixes(`FROM index | ${command} keywordField`, [], options);
        // koywordField => keywordField
        testQuickFixes(`FROM index | ${command} koywordField`, ['keywordField'], options);
        testQuickFixes(
          `FROM index | ${command} numberField, koywordField`,
          ['keywordField'],
          options
        );
      }
      testQuickFixes(`FROM index | EVAL round(koywordField)`, ['keywordField'], options);
      testQuickFixes(`FROM index | EVAL var0 = round(koywordField)`, ['keywordField'], options);
      testQuickFixes(`FROM index | WHERE round(koywordField) > 0`, ['keywordField'], options);
      testQuickFixes(`FROM index | WHERE 0 < round(koywordField)`, ['keywordField'], options);
      testQuickFixes(`FROM index | RENAME koywordField as newField`, ['keywordField'], options);
      // This levarage the knowledge of the enrich policy fields to suggest the right field
      testQuickFixes(
        `FROM index | ENRICH policy | KEEP yetAnotherField2`,
        ['yetAnotherField'],
        options
      );
      testQuickFixes(`FROM index | ENRICH policy ON koywordField`, ['keywordField'], options);
      testQuickFixes(
        `FROM index | ENRICH policy ON keywordField WITH yetAnotherField2`,
        ['yetAnotherField'],
        options
      );
    }
  });

  describe('fixing policies spellchecks', () => {
    for (const options of [
      undefined,
      { relaxOnMissingCallbacks: false },
      { relaxOnMissingCallbacks: false },
    ]) {
      testQuickFixes(`FROM index | ENRICH poli`, ['policy'], options);
      testQuickFixes(`FROM index | ENRICH mypolicy`, ['policy'], options);
      testQuickFixes(`FROM index | ENRICH policy[`, ['policy', 'policy[]'], options);

      describe('modes', () => {
        testQuickFixes(`FROM index | ENRICH _ann:policy`, ['_any'], options);
        const modes = ['_any', '_coordinator', '_remote'];
        for (const mode of modes) {
          testQuickFixes(`FROM index | ENRICH ${mode.replace('_', '@')}:policy`, [mode], options);
        }
        testQuickFixes(`FROM index | ENRICH unknown:policy`, modes, options);
      });
    }
  });

  describe('fixing function spellchecks', () => {
    function toFunctionSignature(name: string) {
      return `${name}()`;
    }
    // it should be strange enough to make the function invalid
    const BROKEN_PREFIX = 'Q';
    for (const options of [
      undefined,
      { relaxOnMissingCallbacks: false },
      { relaxOnMissingCallbacks: false },
    ]) {
      for (const fn of getAllFunctions({ type: 'scalar' })) {
        if (FULL_TEXT_SEARCH_FUNCTIONS.includes(fn.name)) {
          testQuickFixes(
            `FROM index | WHERE ${BROKEN_PREFIX}${fn.name}()`,
            [fn.name].map(toFunctionSignature),
            { equalityCheck: 'include', ...options }
          );
        }
      }
      for (const fn of getAllFunctions({ type: 'scalar' })) {
        if (FULL_TEXT_SEARCH_FUNCTIONS.includes(fn.name)) continue;
        // add an A to the function name to make it invalid
        testQuickFixes(
          `FROM index | EVAL ${BROKEN_PREFIX}${fn.name}()`,
          [fn.name].map(toFunctionSignature),
          { equalityCheck: 'include', ...options }
        );
        testQuickFixes(
          `FROM index | EVAL var0 = ${BROKEN_PREFIX}${fn.name}()`,
          [fn.name].map(toFunctionSignature),
          { equalityCheck: 'include', ...options }
        );
        testQuickFixes(
          `FROM index | STATS avg(${BROKEN_PREFIX}${fn.name}())`,
          [fn.name].map(toFunctionSignature),
          { equalityCheck: 'include', ...options }
        );
        testQuickFixes(
          `FROM index | STATS avg(numberField) BY ${BROKEN_PREFIX}${fn.name}()`,
          [fn.name].map(toFunctionSignature),
          { equalityCheck: 'include', ...options }
        );
        testQuickFixes(
          `FROM index | STATS avg(numberField) BY var0 = ${BROKEN_PREFIX}${fn.name}()`,
          [fn.name].map(toFunctionSignature),
          { equalityCheck: 'include', ...options }
        );
      }
      for (const fn of getAllFunctions({ type: 'agg' })) {
        if (FULL_TEXT_SEARCH_FUNCTIONS.includes(fn.name)) continue;

        // add an A to the function name to make it invalid
        testQuickFixes(
          `FROM index | STATS ${BROKEN_PREFIX}${fn.name}()`,
          [fn.name].map(toFunctionSignature),
          { equalityCheck: 'include', ...options }
        );
        testQuickFixes(
          `FROM index | STATS var0 = ${BROKEN_PREFIX}${fn.name}()`,
          [fn.name].map(toFunctionSignature),
          { equalityCheck: 'include', ...options }
        );
      }
      // it should preserve the arguments
      testQuickFixes(`FROM index | EVAL rAund(numberField)`, ['round(numberField)'], {
        equalityCheck: 'include',
        ...options,
      });
      testQuickFixes(`FROM index | STATS AVVG(numberField)`, ['avg(numberField)'], {
        equalityCheck: 'include',
        ...options,
      });
    }
  });

  describe('fixing wrong quotes', () => {
    for (const options of [
      undefined,
      { relaxOnMissingCallbacks: false },
      { relaxOnMissingCallbacks: false },
    ]) {
      testQuickFixes(`FROM index | WHERE keywordField like 'asda'`, ['"asda"'], options);
      testQuickFixes(`FROM index | WHERE keywordField not like 'asda'`, ['"asda"'], options);
    }
  });

  describe('fixing unquoted field names', () => {
    for (const options of [
      undefined,
      { relaxOnMissingCallbacks: false },
      { relaxOnMissingCallbacks: false },
    ]) {
      testQuickFixes('FROM index | DROP any#Char$Field', ['`any#Char$Field`'], options);
      testQuickFixes(
        'FROM index | DROP numberField, any#Char$Field',
        ['`any#Char$Field`'],
        options
      );
    }
    describe('with no callbacks', () => {
      describe('with no relaxed option', () => {
        it('return no result without callbacks and relaxed option', async () => {
          const statement = `FROM index | DROP any#Char$Field`;
          const { errors } = await validateQuery(statement, getAstAndSyntaxErrors);
          const edits = await getActions(statement, errors, getAstAndSyntaxErrors);
          expect(edits.length).toBe(0);
        });

        it('return no result without specific callback and relaxed option', async () => {
          const callbackMocks = getCallbackMocks();
          const statement = `FROM index | DROP any#Char$Field`;
          const { errors } = await validateQuery(statement, getAstAndSyntaxErrors, undefined, {
            ...callbackMocks,
            getColumnsFor: undefined,
          });
          const edits = await getActions(statement, errors, getAstAndSyntaxErrors, undefined, {
            ...callbackMocks,
            getColumnsFor: undefined,
          });
          expect(edits.length).toBe(0);
        });
      });
      describe('with relaxed option', () => {
        it('return a result without callbacks and relaxed option', async () => {
          const statement = `FROM index | DROP any#Char$Field`;
          const { errors } = await validateQuery(statement, getAstAndSyntaxErrors);
          const actions = await getActions(statement, errors, getAstAndSyntaxErrors, {
            relaxOnMissingCallbacks: true,
          });
          const edits = actions.map(({ edits: actionEdits }) => actionEdits[0].text);
          expect(edits).toEqual(['`any#Char$Field`']);
        });

        it('return a result without specific callback and relaxed option', async () => {
          const callbackMocks = getCallbackMocks();
          const statement = `FROM index | DROP any#Char$Field`;
          const { errors } = await validateQuery(statement, getAstAndSyntaxErrors, undefined, {
            ...callbackMocks,
            getColumnsFor: undefined,
            getFieldsMetadata: undefined,
          });
          const actions = await getActions(
            statement,
            errors,
            getAstAndSyntaxErrors,
            {
              relaxOnMissingCallbacks: true,
            },
            {
              ...callbackMocks,
              getColumnsFor: undefined,
              getFieldsMetadata: undefined,
            }
          );
          const edits = actions.map(({ edits: actionEdits }) => actionEdits[0].text);
          expect(edits).toEqual(['`any#Char$Field`']);
        });
      });
    });
  });

  describe('callbacks', () => {
    it('should not crash if specific callback functions are not passed', async () => {
      const callbackMocks = getCallbackMocks();
      const statement = `from a | eval b  = a | enrich policy | dissect keywordField "%{firstWord}"`;
      const { errors } = await validateQuery(
        statement,
        getAstAndSyntaxErrors,
        undefined,
        callbackMocks
      );
      try {
        await getActions(statement, errors, getAstAndSyntaxErrors, undefined, {
          getColumnsFor: undefined,
          getSources: undefined,
          getPolicies: undefined,
        });
      } catch {
        fail('Should not throw');
      }
    });

    it('should not crash if specific callback functions are not passed with relaxed option', async () => {
      const callbackMocks = getCallbackMocks();
      const statement = `from a | eval b  = a | enrich policy | dissect keywordField "%{firstWord}"`;
      const { errors } = await validateQuery(
        statement,
        getAstAndSyntaxErrors,
        undefined,
        callbackMocks
      );
      try {
        await getActions(
          statement,
          errors,
          getAstAndSyntaxErrors,
          { relaxOnMissingCallbacks: true },
          {
            getColumnsFor: undefined,
            getSources: undefined,
            getPolicies: undefined,
            getFieldsMetadata: undefined,
          }
        );
      } catch {
        fail('Should not throw');
      }
    });

    it('should not crash no callbacks are passed', async () => {
      const callbackMocks = getCallbackMocks();
      const statement = `from a | eval b  = a | enrich policy | dissect keywordField "%{firstWord}"`;
      const { errors } = await validateQuery(
        statement,
        getAstAndSyntaxErrors,
        undefined,
        callbackMocks
      );
      try {
        await getActions(statement, errors, getAstAndSyntaxErrors);
      } catch {
        fail('Should not throw');
      }
    });

    it('should not crash no callbacks are passed with relaxed option', async () => {
      const callbackMocks = getCallbackMocks();
      const statement = `from a | eval b  = a | enrich policy | dissect keywordField "%{firstWord}"`;
      const { errors } = await validateQuery(
        statement,
        getAstAndSyntaxErrors,
        undefined,
        callbackMocks
      );
      try {
        await getActions(statement, errors, getAstAndSyntaxErrors, {
          relaxOnMissingCallbacks: true,
        });
      } catch {
        fail('Should not throw');
      }
    });
  });
});
