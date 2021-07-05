/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  buildInlineScriptForPhraseFilter,
  buildPhraseFilter,
  getPhraseFilterField,
} from './phrase_filter';
import { fields, getField } from '../filters/stubs';
import { IndexPatternBase } from '../es_query';

describe('Phrase filter builder', () => {
  let indexPattern: IndexPatternBase;

  beforeEach(() => {
    indexPattern = {
      id: 'id',
      fields,
    };
  });

  it('should be a function', () => {
    expect(typeof buildPhraseFilter).toBe('function');
  });

  it('should return a match query filter when passed a standard string field', () => {
    const field = getField('extension');

    expect(buildPhraseFilter(field!, 'jpg', indexPattern)).toEqual({
      meta: {
        index: 'id',
      },
      query: {
        match_phrase: {
          extension: 'jpg',
        },
      },
    });
  });

  it('should return a match query filter when passed a standard numeric field', () => {
    const field = getField('bytes');

    expect(buildPhraseFilter(field!, '5', indexPattern)).toEqual({
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

  it('should return a match query filter when passed a standard bool field', () => {
    const field = getField('ssl');

    expect(buildPhraseFilter(field!, 'true', indexPattern)).toEqual({
      meta: {
        index: 'id',
      },
      query: {
        match_phrase: {
          ssl: true,
        },
      },
    });
  });

  it('should return a script filter when passed a scripted field', () => {
    const field = getField('script number');

    expect(buildPhraseFilter(field!, 5, indexPattern)).toEqual({
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

  it('should return a script filter when passed a scripted field with numeric conversion', () => {
    const field = getField('script number');

    expect(buildPhraseFilter(field!, '5', indexPattern)).toEqual({
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
  const indexPattern: IndexPatternBase = {
    fields,
  };

  it('should return the name of the field a phrase query is targeting', () => {
    const field = indexPattern.fields.find((patternField) => patternField.name === 'extension');
    const filter = buildPhraseFilter(field!, 'jpg', indexPattern);
    const result = getPhraseFilterField(filter);
    expect(result).toBe('extension');
  });
});
