/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { blankQuoted, hasFilter, scanReferenceSpans } from './reference_grammar';

describe('scanReferenceSpans', () => {
  it.each([
    ['nothing', ''],
    ['plain text', 'just text'],
    ['a single brace pair', '{ {'],
    ['an unclosed reference', '{{ unclosed'],
    ['a Liquid tag, which is not a reference', '{% if x %}y{% endif %}'],
  ])('finds nothing in %s', (_label, text) => {
    expect(scanReferenceSpans(text)).toEqual([]);
  });

  it('finds a text-form reference', () => {
    expect(scanReferenceSpans('{{ a.b }}')).toEqual([
      { start: 0, end: 9, openLength: 2, expression: 'a.b', form: 'text' },
    ]);
  });

  it('finds a value-form reference, whose opening delimiter is three characters', () => {
    expect(scanReferenceSpans('${{ a.b }}')).toEqual([
      { start: 0, end: 10, openLength: 3, expression: 'a.b', form: 'value' },
    ]);
  });

  it('reads the `$` only when it is right before the braces', () => {
    expect(scanReferenceSpans('$ {{ a }}')[0]).toMatchObject({ form: 'text', start: 2 });
  });

  it('reports where each reference sits in a sentence, in order', () => {
    expect(scanReferenceSpans('Hi {{ a }} and ${{ b }}!')).toEqual([
      { start: 3, end: 10, openLength: 2, expression: 'a', form: 'text' },
      { start: 15, end: 23, openLength: 3, expression: 'b', form: 'value' },
    ]);
  });

  it('trims the expression and accepts none of it being spaced', () => {
    expect(scanReferenceSpans('{{a}}')[0].expression).toBe('a');
    expect(scanReferenceSpans('{{   a   }}')[0].expression).toBe('a');
  });

  it('keeps an empty expression, for callers that must still see the span', () => {
    expect(scanReferenceSpans('{{ }}')).toEqual([
      { start: 0, end: 5, openLength: 2, expression: '', form: 'text' },
    ]);
  });

  describe('whitespace control', () => {
    it.each([
      ['{{- a -}}', 'a'],
      ['{{-a-}}', 'a'],
      ['{{- a }}', 'a'],
      ['{{ a -}}', 'a'],
    ])('does not make the dashes of %s part of the expression', (text, expression) => {
      expect(scanReferenceSpans(text)[0]).toMatchObject({ expression, start: 0, end: text.length });
    });

    it.each([
      ['{{ a - }}', 'a -'],
      ['{{ -1 }}', '-1'],
    ])('keeps a dash that is not whitespace control in %s', (text, expression) => {
      expect(scanReferenceSpans(text)[0].expression).toBe(expression);
    });
  });

  describe('quoted strings', () => {
    it('does not close on a `}}` inside double quotes', () => {
      const text = '{{ x | default: "}}" }}';
      expect(scanReferenceSpans(text)).toEqual([
        {
          start: 0,
          end: text.length,
          openLength: 2,
          expression: 'x | default: "}}"',
          form: 'text',
        },
      ]);
    });

    it('does not close on a `}}` inside single quotes', () => {
      const text = "{{ x | default: '}}' }}";
      expect(scanReferenceSpans(text)[0]).toMatchObject({ end: text.length });
    });

    it('does not start a reference on a `{{` inside quotes', () => {
      const text = '{{ x | append: "{{" }} tail';
      expect(scanReferenceSpans(text)).toHaveLength(1);
    });

    it('closes at the first `}}` when a quote is never closed, as it is while typing', () => {
      expect(scanReferenceSpans("{{ a | append: 'x }} rest")).toEqual([
        { start: 0, end: 20, openLength: 2, expression: "a | append: 'x", form: 'text' },
      ]);
    });
  });

  describe('malformed input is still scanned the way it always was', () => {
    it('ends a reference at the first `}}`, leaving a stray brace outside it', () => {
      expect(scanReferenceSpans('{{ a }}}')).toEqual([
        { start: 0, end: 7, openLength: 2, expression: 'a', form: 'text' },
      ]);
    });

    it('takes an inner `{{` as part of the expression', () => {
      expect(scanReferenceSpans('{{ a {{ b }}')).toEqual([
        { start: 0, end: 12, openLength: 2, expression: 'a {{ b', form: 'text' },
      ]);
    });
  });

  describe('cost', () => {
    const timed = (text: string) => {
      const started = performance.now();
      scanReferenceSpans(text);
      return performance.now() - started;
    };

    it('is linear on a long run of unclosed openings', () => {
      expect(timed('{{ '.repeat(50_000))).toBeLessThan(500);
    });

    it('is linear on many references each holding an unclosed quote', () => {
      expect(timed("{{ a | b: ' }} ".repeat(20_000))).toBeLessThan(500);
    });

    it('is linear on many well-formed references', () => {
      expect(timed('{{ a }} text '.repeat(50_000))).toBeLessThan(500);
    });
  });
});

describe('blankQuoted', () => {
  it('blanks the inside of quoted strings so operators and pipes in them do not count', () => {
    expect(blankQuoted(`a == "x|y"`)).toBe(`a == _____`);
    expect(blankQuoted(`a | default: 'p|q'`)).toBe(`a | default: _____`);
  });

  it('leaves text without quotes alone', () => {
    expect(blankQuoted('a.b | json')).toBe('a.b | json');
  });
});

describe('hasFilter', () => {
  it.each([
    ['a | json', true],
    ['a.b|size', true],
    ['a | default: "x|y"', true],
    ['a', false],
    ['a == "x|y"', false],
    ["a == 'p|q'", false],
  ])('%s -> %s', (expression, expected) => {
    expect(hasFilter(expression)).toBe(expected);
  });
});
