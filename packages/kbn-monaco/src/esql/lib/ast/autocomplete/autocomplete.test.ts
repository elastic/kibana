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
import { mathCommandDefinition } from './complete_items';
import { evalFunctionsDefinitions } from '../definitions/functions';
import { getFunctionSignatures } from '../definitions/helpers';
import { statsAggregationFunctionDefinitions } from '../definitions/aggs';

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

function getCallbackMocks() {
  return {
    getFieldsFor: jest.fn(async () => fields),
    getSources: jest.fn(async () => indexes),
    getPolicies: jest.fn(async () => policies),
  };
}

function createModelAndPosition(text: string) {
  return {
    model: { getValue: () => text } as monaco.editor.ITextModel,
    position: { lineNumber: 1, column: text.length - 1 } as monaco.Position,
  };
}

function createSuggestContext(text: string, triggerCharacter?: string) {
  if (triggerCharacter) {
    return { triggerCharacter, triggerKind: 1 }; // any number is fine here
  }
  return {
    triggerCharacter: text[text.length - 1],
    triggerKind: 1,
  };
}

describe('autocomplete', () => {
  const getAstAndErrors = (text: string) => {
    const errorListener = new ESQLErrorListener();
    const parseListener = new AstListener();
    const parser = getParser(CharStreams.fromString(text), errorListener, parseListener);

    parser[ROOT_STATEMENT]();

    return { ...parseListener.getAst() };
  };

  const testSuggestions = (statement: string, expected: string[], triggerCharacter?: string) => {
    const context = createSuggestContext(statement, triggerCharacter);
    test(`${statement} (triggerChar: "${context.triggerCharacter}")=> [${expected.join(
      ','
    )}]`, async () => {
      const callbackMocks = getCallbackMocks();
      const { model, position } = createModelAndPosition(statement);
      const suggestions = await suggest(
        model,
        position,
        context,
        (text) => (text ? getAstAndErrors(text) : { ast: [] }),
        callbackMocks
      );
      expect(suggestions.map((i) => i.label)).toEqual(expected);
    });
  };

  describe('from', () => {
    // Monaco will filter further down here
    testSuggestions('f', ['row', 'from', 'show']);
    testSuggestions('from ', indexes);
    testSuggestions('from a,', indexes);
    testSuggestions('from a, b ', ['metadata', '|', ',']);
  });

  describe('where', () => {
    testSuggestions('from a | where ', [
      'var0',
      ...fields.map(({ name }) => name),
      ...evalFunctionsDefinitions.map(
        ({ name, signatures, ...defRest }) =>
          getFunctionSignatures({ name, ...defRest, signatures })[0].declaration
      ),
    ]);
    testSuggestions('from a | where stringField ', [
      '+',
      '-',
      '*',
      '/',
      '%',
      '==',
      '!=',
      '<',
      '>',
      '<=',
      '>=',
      'in',
      '|',
      ',',
    ]);
    testSuggestions('from a | where stringField >= ', [
      'var0',
      ...fields.map(({ name }) => name),
      ...evalFunctionsDefinitions.map(
        ({ name, signatures, ...defRest }) =>
          getFunctionSignatures({ name, ...defRest, signatures })[0].declaration
      ),
    ]);
    // // @TODO: improve here: suggest also AND, OR
    testSuggestions('from a | where stringField >= stringField ', ['|', ',']);
    // // @TODO: improve here: suggest here any type, not just boolean
    testSuggestions('from a | where stringField >= stringField and ', [
      ...fields.filter(({ type }) => type === 'boolean').map(({ name }) => name),
      ...evalFunctionsDefinitions
        .filter(({ signatures }) => signatures.some(({ returnType }) => returnType === 'boolean'))
        .map(
          ({ name, signatures, ...defRest }) =>
            getFunctionSignatures({ name, ...defRest, signatures })[0].declaration
        ),
    ]);
    // // @TODO: improve here: suggest comparison functions
    testSuggestions('from a | where stringField >= stringField and  numberField ', ['|', ',']);
    testSuggestions('from a | stats a=avg(numberField) | where a ', [
      '+',
      '-',
      '*',
      '/',
      '%',
      '==',
      '!=',
      '<',
      '>',
      '<=',
      '>=',
      'in',
      '|',
      ',',
    ]);
    testSuggestions('from a | stats a=avg(numberField) | where numberField ', [
      '+',
      '-',
      '*',
      '/',
      '%',
      '==',
      '!=',
      '<',
      '>',
      '<=',
      '>=',
      'in',
      '|',
      ',',
    ]);
    // @TODO improve here: suggest here also non-boolean functions
    testSuggestions('from a | where stringField >= stringField and  numberField == ', [
      ...fields.filter(({ type }) => type === 'boolean').map(({ name }) => name),
      ...evalFunctionsDefinitions
        .filter(({ signatures }) => signatures.some(({ returnType }) => returnType === 'boolean'))
        .map(
          ({ name, signatures, ...defRest }) =>
            getFunctionSignatures({ name, ...defRest, signatures })[0].declaration
        ),
    ]);
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

  describe.skip('stats', () => {
    testSuggestions('from a | stats ', ['var0']);
    testSuggestions('from a | stats a ', ['=']);
    testSuggestions('from a | stats a=', [
      'avg',
      'max',
      'min',
      'sum',
      'count',
      'count_distinct',
      'median',
      'median_absolute_deviation',
      'percentile',
    ]);
    testSuggestions('from a | stats a=b by ', ['FieldIdentifier']);
    testSuggestions('from a | stats a=c by d', ['|']);
    testSuggestions('from a | stats a=b, ', ['var0']);
    testSuggestions('from a | stats a=max', ['(']);
    testSuggestions('from a | stats a=min(', ['FieldIdentifier']);
    testSuggestions('from a | stats a=min(b', [')', 'FieldIdentifier']);
    testSuggestions('from a | stats a=min(b) ', ['|', 'by']);
    testSuggestions('from a | stats a=min(b) by ', ['FieldIdentifier']);
    testSuggestions('from a | stats a=min(b),', [
      'var0',
      ...fields.map(({ name }) => name),
      ...statsAggregationFunctionDefinitions.map(
        ({ name, signatures, ...defRest }) =>
          getFunctionSignatures({ name, ...defRest, signatures })[0].declaration
      ),
    ]);
    testSuggestions('from a | stats var0=min(b),var1=c,', [
      'var2',
      ...fields.map(({ name }) => name),
      ...statsAggregationFunctionDefinitions.map(
        ({ name, signatures, ...defRest }) =>
          getFunctionSignatures({ name, ...defRest, signatures })[0].declaration
      ),
    ]);
    testSuggestions('from a | stats a=min(b), b=max(', [
      ...fields.map(({ name }) => name),
      ...statsAggregationFunctionDefinitions.map(
        ({ name, signatures, ...defRest }) =>
          getFunctionSignatures({ name, ...defRest, signatures })[0].declaration
      ),
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
    const functionSuggestions = mathCommandDefinition.map(({ label }) => String(label));

    testSuggestions('from a | eval ', ['var0']);
    testSuggestions('from a | eval a ', ['=']);
    testSuggestions('from a | eval a=', functionSuggestions);
    testSuggestions('from a | eval a=b, ', ['var0']);
    testSuggestions('from a | eval a=round', ['(']);
    testSuggestions('from a | eval a=round(', ['FieldIdentifier']);
    testSuggestions('from a | eval a=round(b) ', ['|', '+', '-', '/', '*']);
    testSuggestions('from a | eval a=round(b),', ['var0']);
    testSuggestions('from a | eval a=round(b) + ', ['FieldIdentifier', ...functionSuggestions]);
    // NOTE: this is handled also partially in the suggestion wrapper with auto-injection of closing brackets
    testSuggestions('from a | eval a=round(b', [')', 'FieldIdentifier']);
    testSuggestions('from a | eval a=round(b), b=round(', ['FieldIdentifier']);
    testSuggestions('from a | stats a=round(b), b=round(', ['FieldIdentifier']);
    testSuggestions('from a | eval var0=round(b), var1=round(c) | stats ', ['var2']);

    describe('date math', () => {
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
