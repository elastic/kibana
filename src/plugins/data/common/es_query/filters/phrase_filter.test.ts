/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  buildInlineScriptForPhraseFilter,
  buildPhraseFilter,
  getPhraseFilterField,
} from './phrase_filter';
import { fields, getField } from '../../index_patterns/mocks';
import { IIndexPattern } from '../../index_patterns';

describe('Phrase filter builder', () => {
  let indexPattern: IIndexPattern;

  beforeEach(() => {
    indexPattern = {
      id: 'id',
    } as IIndexPattern;
  });

  it('should be a function', () => {
    expect(typeof buildPhraseFilter).toBe('function');
  });

  it('should return a match query filter when passed a standard field', () => {
    const field = getField('bytes');

    expect(buildPhraseFilter(field, 5, indexPattern)).toEqual({
      meta: {
        index: 'id',
      },
      query: {
        match_phrase: {
          bytes: 5,
        },
      },
    });
  });

  it('should return a script filter when passed a scripted field', () => {
    const field = getField('script number');

    expect(buildPhraseFilter(field, 5, indexPattern)).toEqual({
      meta: {
        index: 'id',
        field: 'script number',
      },
      script: {
        script: {
          lang: 'expression',
          params: {
            value: 5,
          },
          source: '(1234) == value',
        },
      },
    });
  });
});

describe('buildInlineScriptForPhraseFilter', () => {
  it('should wrap painless scripts in a lambda', () => {
    const field = {
      lang: 'painless',
      script: 'return foo;',
    };

    const expected =
      `boolean compare(Supplier s, def v) {return s.get() == v;}` +
      `compare(() -> { return foo; }, params.value);`;

    expect(buildInlineScriptForPhraseFilter(field)).toBe(expected);
  });

  it('should create a simple comparison for other langs', () => {
    const field = {
      lang: 'expression',
      script: 'doc[bytes].value',
    };

    const expected = `(doc[bytes].value) == value`;

    expect(buildInlineScriptForPhraseFilter(field)).toBe(expected);
  });
});

describe('getPhraseFilterField', function () {
  const indexPattern: IIndexPattern = ({
    fields,
  } as unknown) as IIndexPattern;

  it('should return the name of the field a phrase query is targeting', () => {
    const field = indexPattern.fields.find((patternField) => patternField.name === 'extension');
    const filter = buildPhraseFilter(field!, 'jpg', indexPattern);
    const result = getPhraseFilterField(filter);
    expect(result).toBe('extension');
  });
});
