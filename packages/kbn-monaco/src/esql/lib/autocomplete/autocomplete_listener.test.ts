/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CharStreams } from 'antlr4ts';
import { AutocompleteListener } from './autocomplete_listener';
import { ANTLREErrorListener } from '../../../common/error_listener';

import { getParser, ROOT_STATEMENT } from '../antlr_facade';

import { isDynamicAutocompleteItem } from './dymanic_item';
import { getDurationItemsWithQuantifier } from './helpers';
import { mathCommandDefinition } from './autocomplete_definitions/functions_commands';

describe('autocomplete_listener', () => {
  const getAutocompleteSuggestions = (text: string) => {
    const errorListener = new ANTLREErrorListener();
    const parseListener = new AutocompleteListener();
    const parser = getParser(CharStreams.fromString(text), errorListener, parseListener);

    parser[ROOT_STATEMENT]();

    return parseListener.getAutocompleteSuggestions();
  };

  const testSuggestions = (text: string, expected: string[]) => {
    test(`${text} => [${expected.join(',')}]`, () => {
      const { suggestions } = getAutocompleteSuggestions(text);
      expect(suggestions.map((i) => (isDynamicAutocompleteItem(i) ? i : i.label))).toEqual(
        expected
      );
    });
  };

  describe('from', () => {
    testSuggestions('f', ['from']);
    testSuggestions('from ', ['SourceIdentifier']);
    testSuggestions('from a,', ['SourceIdentifier']);
    testSuggestions('from a, b ', ['SourceIdentifier']);
  });

  describe('where', () => {
    testSuggestions('from a | where ', ['cidr_match', 'FieldIdentifier']);
    testSuggestions('from a | where "field" ', [
      '==',
      '!=',
      '<',
      '>',
      '<=',
      '>=',
      'like',
      'rlike',
      'in',
    ]);
    testSuggestions('from a | where "field" >= ', ['FieldIdentifier']);
    testSuggestions('from a | where "field" >= "field1" ', ['or', 'and', '|']);
    testSuggestions('from a | where "field" >= "field1" and ', ['FieldIdentifier']);
    testSuggestions('from a | where "field" >= "field1" and  "field2" ', [
      '==',
      '!=',
      '<',
      '>',
      '<=',
      '>=',
      'like',
      'rlike',
      'in',
    ]);
    testSuggestions('from a | stats a=avg("field") | where a ', [
      '==',
      '!=',
      '<',
      '>',
      '<=',
      '>=',
      'like',
      'rlike',
      'in',
    ]);
    testSuggestions('from a | stats a=avg("b") | where "c" ', [
      '==',
      '!=',
      '<',
      '>',
      '<=',
      '>=',
      'like',
      'rlike',
      'in',
    ]);
    testSuggestions('from a | where "field" >= "field1" and  "field2 == ', ['FieldIdentifier']);
  });

  describe('sort', () => {
    testSuggestions('from a | sort ', ['FieldIdentifier']);
    testSuggestions('from a | sort "field" ', ['asc', 'desc']);
    testSuggestions('from a | sort "field" desc ', ['nulls']);
    testSuggestions('from a | sort "field" desc nulls ', ['first', 'last']);
  });

  describe('limit', () => {
    testSuggestions('from a | limit ', ['1000']);
    testSuggestions('from a | limit 4 ', ['|']);
  });

  describe('mv_expand', () => {
    testSuggestions('from a | mv_expand ', ['FieldIdentifier']);
    testSuggestions('from a | mv_expand a ', ['|']);
  });

  describe('stats', () => {
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
    testSuggestions('from a | stats a=min(b),', ['var0']);
    testSuggestions('from a | stats var0=min(b),var1=c,', ['var2']);
    testSuggestions('from a | stats a=min(b), b=max(', ['FieldIdentifier']);
  });

  describe('enrich', () => {
    for (const prevCommand of [
      '',
      '| enrich other-policy ',
      '| enrich other-policy on b ',
      '| enrich other-policy with c ',
    ]) {
      testSuggestions(`from a ${prevCommand}| enrich`, ['PolicyIdentifier']);
      testSuggestions(`from a ${prevCommand}| enrich policy `, ['|', 'on', 'with']);
      testSuggestions(`from a ${prevCommand}| enrich policy on `, [
        'PolicyMatchingFieldIdentifier',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b `, ['|', 'with']);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with `, [
        'var0',
        'PolicyFieldIdentifier',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 `, ['=', '|']);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = `, [
        'PolicyFieldIdentifier',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = c `, ['|']);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = c, `, [
        'var1',
        'PolicyFieldIdentifier',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = c, var1 `, ['=', '|']);
      testSuggestions(`from a ${prevCommand}| enrich policy on b with var0 = c, var1 = `, [
        'PolicyFieldIdentifier',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy with `, [
        'var0',
        'PolicyFieldIdentifier',
      ]);
      testSuggestions(`from a ${prevCommand}| enrich policy with c`, ['=', '|']);
    }
  });

  describe('eval', () => {
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
      testSuggestions(
        'from a | eval var0=date_trunc(',
        ['FieldIdentifier'].concat(...getDurationItemsWithQuantifier().map(({ label }) => label))
      );
      testSuggestions(
        'from a | eval var0=date_trunc(2 ',
        [')', 'FieldIdentifier'].concat(dateSuggestions)
      );
    });
  });
});
