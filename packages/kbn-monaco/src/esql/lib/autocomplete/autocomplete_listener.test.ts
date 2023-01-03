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
    testSuggestions('from a, b ', ['|']);
  });

  describe('where', () => {
    testSuggestions('from a | where ', ['FieldIdentifier']);
    testSuggestions('from a | where "field" ', ['==', '!=', '<', '>', '<=', '>=']);
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
    ]);
    testSuggestions('from a | stats a=avg("field") | where a ', ['==', '!=', '<', '>', '<=', '>=']);
    testSuggestions('from a | stats a=avg("b") | where "c" ', ['==', '!=', '<', '>', '<=', '>=']);
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

  describe('stats', () => {
    testSuggestions('from a | stats ', ['var0']);
    testSuggestions('from a | stats a ', ['=']);
    testSuggestions('from a | stats a=', ['round', 'avg', 'max', 'min', 'sum', 'FieldIdentifier']);
    testSuggestions('from a | stats a=b', ['|', 'by', '+', '-', '/', '*']);
    testSuggestions('from a | stats a=b by ', ['FieldIdentifier']);
    testSuggestions('from a | stats a=b * ', ['FieldIdentifier']);
    testSuggestions('from a | stats a=b * c', ['|', 'by', '+', '-', '/', '*']);
    testSuggestions('from a | stats a=c by d', ['|']);
    testSuggestions('from a | stats a=b, ', ['var0']);
    testSuggestions('from a | stats a=max', ['(']);
    testSuggestions('from a | stats a=min(', ['FieldIdentifier']);
    testSuggestions('from a | stats a=min(b', [')', 'FieldIdentifier']);
    testSuggestions('from a | stats a=min(b) ', ['|', 'by']);
    testSuggestions('from a | stats a=min(b) by ', ['FieldIdentifier']);
    testSuggestions('from a | stats a=min(b),', ['var0']);
    testSuggestions('from a | stats a=min(b), b=max(', ['FieldIdentifier']);
  });

  describe('eval', () => {
    testSuggestions('from a | eval ', ['var0']);
    testSuggestions('from a | eval a ', ['=']);
    testSuggestions('from a | eval a=', ['round', 'avg', 'max', 'min', 'sum', 'FieldIdentifier']);
    testSuggestions('from a | eval a=b', ['|', '+', '-', '/', '*']);
    testSuggestions('from a | eval a=b, ', ['var0']);
    testSuggestions('from a | eval a=avg', ['(']);
    testSuggestions('from a | eval a=min(', ['FieldIdentifier']);
    testSuggestions('from a | eval a=min(b) ', ['|']);
    testSuggestions('from a | eval a=min(b),', ['var0']);
    testSuggestions('from a | eval a=avg(b', [')', 'FieldIdentifier']);
    testSuggestions('from a | eval a=min(b), b=max(', ['FieldIdentifier']);
    testSuggestions('from a | stats a=min(b), b=max(', ['FieldIdentifier']);
    testSuggestions('from a | eval var0=min(b), var1=max(c) | stats ', ['var2']);
  });
});
