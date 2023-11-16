/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../../../monaco_imports';
import { CharStreams } from 'antlr4ts';
import { suggest } from './autocomplete';
import { getParser, ROOT_STATEMENT } from '../../antlr_facade';
import { ESQLErrorListener } from '../../monaco/esql_error_listener';
import { AstListener } from '../ast_factory';
import { evalFunctionsDefinitions } from '../definitions/functions';
import { builtinFunctions } from '../definitions/builtin';
import { getFunctionSignatures } from '../definitions/helpers';
import { statsAggregationFunctionDefinitions } from '../definitions/aggs';

const triggerCharacters = [',', '(', '=', ' '];

const fields = [
  ...['string', 'number', 'date', 'boolean', 'ip'].map((type) => ({
    name: `${type}Field`,
    type,
  })),
  { name: 'any#Char$ field', type: 'number' },
  { name: 'kubernetes.something.something', type: 'number' },
  {
    name: `listField`,
    type: `list`,
  },
];

const indexes = ['a', 'index', 'otherIndex'];
const policies = [
  {
    name: 'policy',
    sourceIndices: ['enrichIndex1'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField'],
  },
];

/**
 * Utility to filter down the function list for the given type
 * It is mainly driven by the return type, but it can be filtered upon with the last optional argument "paramsTypes"
 * jsut make sure to pass the arguments in the right order
 * @param command current command context
 * @param expectedReturnType the expected type returned by the function
 * @param functionCategories
 * @param paramsTypes the function argument types (optional)
 * @returns
 */
function getFunctionSignaturesByReturnType(
  command: string,
  expectedReturnType: string,
  { agg, evalMath, builtin }: { agg?: boolean; evalMath?: boolean; builtin?: boolean } = {},
  paramsTypes?: string[]
) {
  const list = [];
  if (agg) {
    list.push(...statsAggregationFunctionDefinitions);
  }
  // eval functions (eval is a special keyword in JS)
  if (evalMath) {
    list.push(...evalFunctionsDefinitions);
  }
  if (builtin) {
    list.push(...builtinFunctions);
  }
  return list
    .filter(({ signatures, ignoreAsSuggestion, supportedCommands }) => {
      if (ignoreAsSuggestion) {
        return false;
      }
      if (!supportedCommands.includes(command)) {
        return false;
      }
      const filteredByReturnType = signatures.some(
        ({ returnType }) => expectedReturnType === 'any' || returnType === expectedReturnType
      );
      if (!filteredByReturnType) {
        return false;
      }
      if (paramsTypes?.length) {
        return signatures.some(({ params }) =>
          paramsTypes.every(
            (expectedType, i) => expectedType === 'any' || expectedType === params[i].type
          )
        );
      }
      return true;
    })
    .map(({ builtin: isBuiltinFn, name, signatures, ...defRest }) =>
      isBuiltinFn ? name : getFunctionSignatures({ name, ...defRest, signatures })[0].declaration
    );
}

function getFieldNamesByType(requestedType: string) {
  return fields
    .filter(({ type }) => requestedType === 'any' || type === requestedType)
    .map(({ name }) => name);
}

function createCustomCallbackMocks(
  customFields: Array<{ name: string; type: string }> | undefined,
  customSources: string[] | undefined,
  customPolicies:
    | Array<{
        name: string;
        sourceIndices: string[];
        matchField: string;
        enrichFields: string[];
      }>
    | undefined
) {
  const finalFields = customFields || fields;
  const finalSources = customSources || indexes;
  const finalPolicies = customPolicies || policies;
  return {
    getFieldsFor: jest.fn(async () => finalFields),
    getSources: jest.fn(async () => finalSources),
    getPolicies: jest.fn(async () => finalPolicies),
  };
}

function createModelAndPosition(text: string, offset: number) {
  return {
    model: { getValue: () => text } as monaco.editor.ITextModel,
    position: { lineNumber: 1, column: offset } as monaco.Position,
  };
}

function createSuggestContext(text: string, triggerCharacter?: string) {
  if (triggerCharacter) {
    return { triggerCharacter, triggerKind: 1 }; // any number is fine here
  }
  const foundTriggerCharIndexes = triggerCharacters.map((char) => text.lastIndexOf(char));
  const maxIndex = Math.max(...foundTriggerCharIndexes);
  return {
    triggerCharacter: text[maxIndex],
    triggerKind: 1,
  };
}

describe('autocomplete', () => {
  const getAstAndErrors = async (text: string) => {
    const errorListener = new ESQLErrorListener();
    const parseListener = new AstListener();
    const parser = getParser(CharStreams.fromString(text), errorListener, parseListener);

    parser[ROOT_STATEMENT]();

    return { ...parseListener.getAst() };
  };

  type TestArgs = [string, string[], string?, Parameters<typeof createCustomCallbackMocks>?];

  const testSuggestionsFn = (
    statement: string,
    expected: string[],
    triggerCharacter: string = '',
    customCallbacksArgs: Parameters<typeof createCustomCallbackMocks> = [
      undefined,
      undefined,
      undefined,
    ],
    { only, skip }: { only?: boolean; skip?: boolean } = {}
  ) => {
    const context = createSuggestContext(statement, triggerCharacter);
    const offset = statement.lastIndexOf(context.triggerCharacter) + 2;
    const testFn = only ? test.only : skip ? test.skip : test;

    testFn(
      `${statement} (triggerChar: "${context.triggerCharacter}")=> ["${expected.join('","')}"]`,
      async () => {
        const callbackMocks = createCustomCallbackMocks(...customCallbacksArgs);
        const { model, position } = createModelAndPosition(statement, offset);
        const suggestions = await suggest(
          model,
          position,
          context,
          async (text) => (text ? await getAstAndErrors(text) : { ast: [] }),
          callbackMocks
        );
        expect(suggestions.map((i) => i.label)).toEqual(expected);
      }
    );
  };

  // Enrich the function to work with .only and .skip as regular test function
  const testSuggestions = Object.assign(testSuggestionsFn, {
    skip: (...args: TestArgs) => {
      const paddingArgs = ['', [undefined, undefined, undefined]].slice(args.length - 2);
      return testSuggestionsFn(
        ...((args.length > 1 ? [...args, ...paddingArgs] : args) as TestArgs),
        {
          skip: true,
        }
      );
    },
    only: (...args: TestArgs) => {
      const paddingArgs = ['', [undefined, undefined, undefined]].slice(args.length - 2);
      return testSuggestionsFn(
        ...((args.length > 1 ? [...args, ...paddingArgs] : args) as TestArgs),
        {
          only: true,
        }
      );
    },
  });

  describe('from', () => {
    // Monaco will filter further down here
    testSuggestions('f', ['row', 'from', 'show']);
    testSuggestions('from ', indexes);
    testSuggestions('from a,', indexes);
    testSuggestions('from a, b ', ['metadata', '|', ',']);
    testSuggestions('from *,', indexes);
  });

  describe('where', () => {
    const allEvalFns = getFunctionSignaturesByReturnType('where', 'any', {
      evalMath: true,
    });
    testSuggestions('from a | where ', [...getFieldNamesByType('any'), ...allEvalFns]);
    testSuggestions('from a | eval var0 = 1 | where ', [
      ...getFieldNamesByType('any'),
      ...allEvalFns,
      'var0',
    ]);
    testSuggestions('from a | where stringField ', [
      // all functions compatible with a stringField type
      ...getFunctionSignaturesByReturnType(
        'where',
        'boolean',
        {
          builtin: true,
        },
        ['string']
      ),
    ]);
    testSuggestions('from a | where stringField >= ', [
      ...getFieldNamesByType('string'),
      ...getFunctionSignaturesByReturnType('where', 'string', { evalMath: true }),
    ]);
    testSuggestions('from a | where stringField >= stringField ', [
      ...getFunctionSignaturesByReturnType(
        'where',
        'boolean',
        {
          builtin: true,
        },
        ['boolean']
      ),
      '|',
      ',',
    ]);
    testSuggestions('from a | where stringField >= stringField and ', [
      ...getFieldNamesByType('boolean'),
      ...getFunctionSignaturesByReturnType('where', 'boolean', { evalMath: true }),
    ]);
    testSuggestions('from a | where stringField >= stringField and numberField ', [
      ...getFunctionSignaturesByReturnType('where', 'boolean', { builtin: true }, ['number']),
    ]);
    testSuggestions('from a | stats a=avg(numberField) | where a ', [
      ...getFunctionSignaturesByReturnType('where', 'any', { builtin: true }, ['number']),
    ]);
    // Mind this test: suggestion is aware of previous commands when checking for fields
    // in this case the numberField has been wiped by the STATS command and suggest cannot find it's type
    // @TODO: verify this is the correct behaviour in this case or if we want a "generic" suggestion anyway
    testSuggestions(
      'from a | stats a=avg(numberField) | where numberField ',
      [],
      '',
      // make the fields suggest aware of the previous STATS, leave the other callbacks untouched
      [[{ name: 'a', type: 'number' }], undefined, undefined]
    );
    testSuggestions('from a | where stringField >= stringField and numberField == ', [
      ...getFieldNamesByType('number'),
      ...getFunctionSignaturesByReturnType('where', 'number', { evalMath: true }),
    ]);
    // The editor automatically inject the final bracket, so it is not useful to test with just open bracket
    testSuggestions(
      'from a | where log10()',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('where', 'number', { evalMath: true }),
      ],
      '('
    );
    testSuggestions('from a | where log10(numberField) ', [
      ...getFunctionSignaturesByReturnType('where', 'number', { builtin: true }, ['number']),
      ...getFunctionSignaturesByReturnType('where', 'boolean', { builtin: true }, ['number']),
    ]);
    testSuggestions(
      'from a | WHERE pow(numberField, )',
      [
        ...getFieldNamesByType('number'),
        ...getFunctionSignaturesByReturnType('where', 'number', { evalMath: true }),
      ],
      ','
    );
  });

  describe('sort', () => {
    testSuggestions('from a | sort ', [...fields.map(({ name }) => name)]);
    testSuggestions('from a | sort stringField ', ['asc', 'desc', '|', ',']);
    testSuggestions('from a | sort stringField desc ', ['nulls first', 'nulls last', '|', ',']);
    // @TODO: improve here
    // testSuggestions('from a | sort stringField desc ', ['first', 'last']);
  });

  describe('limit', () => {
    testSuggestions('from a | limit ', ['10', '100', '1000']);
    testSuggestions('from a | limit 4 ', ['|']);
  });

  describe('mv_expand', () => {
    testSuggestions('from a | mv_expand ', ['listField']);
    testSuggestions('from a | mv_expand a ', ['|']);
  });

  describe('stats', () => {
    const allAggFunctions = getFunctionSignaturesByReturnType('stats', 'any', {
      agg: true,
    });
    testSuggestions('from a | stats ', ['var0', ...allAggFunctions]);
    testSuggestions('from a | stats a ', ['=']);
    testSuggestions('from a | stats a=', [...allAggFunctions]);
    testSuggestions('from a | stats a=max(b) by ', [...fields.map(({ name }) => name)]);
    testSuggestions('from a | stats a=c by d', ['|', ',']);
    testSuggestions('from a | stats a=max(b), ', ['var0', ...allAggFunctions, 'a']);
    testSuggestions(
      'from a | stats a=min()',
      [...fields.filter(({ type }) => type === 'number').map(({ name }) => name)],
      '('
    );
    testSuggestions('from a | stats a=min(b) ', ['by', '|', ',']);
    testSuggestions('from a | stats a=min(b) by ', [...fields.map(({ name }) => name)]);
    // @TODO: remove last 2 suggestions if possible
    testSuggestions('from a | stats a=min(b),', ['var0', ...allAggFunctions, 'a']);
    // @TODO: remove last 2 suggestions if possible
    testSuggestions('from a | stats var0=min(b),var1=c,', [
      'var2',
      ...allAggFunctions,
      'var0',
      'var1',
    ]);
    testSuggestions('from a | stats a=min(b), b=max()', [
      ...fields.filter(({ type }) => type === 'number').map(({ name }) => name),
    ]);
    // @TODO: remove last 2 suggestions if possible
    testSuggestions('from a | eval var0=round(b), var1=round(c) | stats ', [
      'var2',
      ...allAggFunctions,
      'var0',
      'var1',
    ]);
  });

  describe.skip('enrich', () => {
    for (const prevCommand of [
      '',
      '| enrich other-policy ',
      '| enrich other-policy on b ',
      '| enrich other-policy with c ',
    ]) {
      testSuggestions(`from a ${prevCommand}| enrich`, ['policy']);
      testSuggestions(`from a ${prevCommand}| enrich policy `, ['on', 'with', '|']);
      testSuggestions(`from a ${prevCommand}| enrich policy on `, [
        'stringField',
        'numberField',
        'dateField',
        'booleanField',
        'ipField',
        'any#Char$ field',
        'kubernetes.something.something',
        'listField',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b `, ['with', '|']);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with `, [
        'var0',
        'stringField',
        'numberField',
        'dateField',
        'booleanField',
        'ipField',
        'any#Char$ field',
        'kubernetes.something.something',
        'listField',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 `, ['=', '|']);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = `, [
        'stringField',
        'numberField',
        'dateField',
        'booleanField',
        'ipField',
        'any#Char$ field',
        'kubernetes.something.something',
        'listField',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = c `, ['|']);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = c, `, [
        'var1',
        'stringField',
        'numberField',
        'dateField',
        'booleanField',
        'ipField',
        'any#Char$ field',
        'kubernetes.something.something',
        'listField',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = c, var1 `, ['=', '|']);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = c, var1 = `, [
        'stringField',
        'numberField',
        'dateField',
        'booleanField',
        'ipField',
        'any#Char$ field',
        'kubernetes.something.something',
        'listField',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy with `, [
        'var0',
        'otherField',
        'yetAnotherField',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy with c`, ['=', '|', ',']);
    }
  });

  describe.skip('eval', () => {
    testSuggestions('from a | eval ', ['var0']);
    testSuggestions('from a | eval a ', [
      ...getFunctionSignaturesByReturnType('eval', 'any', { builtin: true }),
    ]);
    testSuggestions('from a | eval a=', [
      ...getFunctionSignaturesByReturnType('eval', 'any', { evalMath: true }),
    ]);
    testSuggestions('from a | eval a=b, ', ['var0']);
    testSuggestions('from a | eval a=round', ['(']);
    testSuggestions('from a | eval a=round(', ['FieldIdentifier']);
    testSuggestions('from a | eval a=round(b) ', ['|', '+', '-', '/', '*']);
    testSuggestions('from a | eval a=round(b),', ['var0']);
    testSuggestions('from a | eval a=round(b) + ', [
      'FieldIdentifier',
      ...getFunctionSignaturesByReturnType('eval', 'any', { evalMath: true }),
    ]);
    // NOTE: this is handled also partially in the suggestion wrapper with auto-injection of closing brackets
    testSuggestions('from a | eval a=round(b', [')', 'FieldIdentifier']);
    testSuggestions('from a | eval a=round(b), b=round(', ['FieldIdentifier']);
    testSuggestions('from a | stats a=round(b), b=round(', ['FieldIdentifier']);

    describe.skip('date math', () => {
      const dateSuggestions = [
        'year',
        'month',
        'week',
        'day',
        'hour',
        'minute',
        'second',
        'millisecond',
      ].flatMap((v) => [v, `${v}s`]);
      const dateMathSymbols = ['+', '-'];
      testSuggestions('from a | eval a = 1 ', dateMathSymbols.concat(dateSuggestions, ['|']));
      testSuggestions('from a | eval a = 1 year ', dateMathSymbols.concat(dateSuggestions, ['|']));
      testSuggestions(
        'from a | eval a = 1 day + 2 ',
        dateMathSymbols.concat(dateSuggestions, ['|'])
      );
      //   testSuggestions(
      //     'from a | eval var0=date_trunc(',
      //     ['FieldIdentifier'].concat(...getDurationItemsWithQuantifier().map(({ label }) => label))
      //   );
      testSuggestions(
        'from a | eval var0=date_trunc(2 ',
        [')', 'FieldIdentifier'].concat(dateSuggestions)
      );
    });
  });
});
