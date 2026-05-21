/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file -- needs TestFormat (generic test double) + ConvertOverrideFormat (tests the convert()-override code path, as used by AggsTermsFieldFormat) */

import React from 'react';
import ReactDOM from 'react-dom/server';
import { constant } from 'lodash';
import { FieldFormat } from './field_format';
import { asPrettyString } from './utils';
import { highlightTags } from './utils/highlight/highlight_tags';
import type { FieldFormatParams, ReactContextTypeOptions, TextContextTypeOptions } from './types';
import { NULL_LABEL } from '@kbn/field-formats-common';
import { expectReactElementAsArray } from './test_utils';

const hl = (word: string) => `${highlightTags.pre}${word}${highlightTags.post}`;
const renderReact = (node: React.ReactNode) =>
  ReactDOM.renderToStaticMarkup(React.createElement(React.Fragment, null, node)).replace(
    /&quot;/g,
    '"'
  );

const getTestFormat = (
  _params?: FieldFormatParams,
  textConvert = (val: string, options?: TextContextTypeOptions) => asPrettyString(val, options)
) =>
  new (class TestFormat extends FieldFormat {
    static id = 'test-format';
    static title = 'Test Format';

    textConvert = textConvert;
  })(_params, jest.fn());

describe('FieldFormat class', () => {
  describe('params', () => {
    test('accepts its params via the constructor', () => {
      const f = getTestFormat({ foo: 'bar' });
      const fooParam = f.param('foo');

      expect(fooParam).toBe('bar');
    });

    test('allows reading a clone of the params', () => {
      const params = { foo: 'bar' };
      const f = getTestFormat(params);
      const output = f.params();

      expect(output).toEqual(params);
      expect(output).not.toBe(params);
    });
  });

  describe('type', () => {
    test('links the constructor class to instances as the `type`', () => {
      const f = getTestFormat();

      expect(f.type.id).toBe('test-format');
      expect(f.type.title).toBe('Test Format');
    });
  });

  describe('toJSON', () => {
    test('serializes to a version a basic id and param pair', () => {
      const f = getTestFormat({ foo: 'bar' });
      const ser = JSON.parse(JSON.stringify(f));

      expect(ser).toEqual({ id: 'test-format', params: { foo: 'bar' } });
    });

    test('removes the params entirely if they are empty', () => {
      const f = getTestFormat();
      const ser = JSON.parse(JSON.stringify(f));

      expect(ser).not.toHaveProperty('params');
    });
  });

  describe('converters', () => {
    describe('#getConverterFor', () => {
      test('returns a converter for text content type', () => {
        const f = getTestFormat();
        const textConverter = f.getConverterFor('text');

        expect(textConverter && typeof textConverter('')).toBe('string');
      });
    });

    describe('#_convert, the instance method or methods used to format values', () => {
      test('can be a function, which becomes the text converter', () => {
        const f = getTestFormat(undefined, () => 'formatted');
        const text = f.getConverterFor('text');

        expect(text && text('formatted')).toBe('formatted');
      });

      test('can be a constant function that always returns the same text', () => {
        const f = getTestFormat(undefined, constant('formatted text'));
        const text = f.getConverterFor('text');

        expect(text && text('formatted text')).toBe('formatted text');
      });

      test('does not escape the output of the text converter', () => {
        const f = getTestFormat(undefined, constant('<script>alert("xxs");</script>'));

        expect(f.convert('', 'text')).toContain('<');
      });
    });

    describe('#convert', () => {
      test('formats a value as text when specified via second param', () => {
        const f = getTestFormat(undefined, constant('text'));

        expect(f.convert('val', 'text')).toBe('text');
      });

      test('formats a value as NULL_LABEL when no value is specified', () => {
        const f = getTestFormat();

        expect(f.convert(undefined, 'text')).toBe(NULL_LABEL);
      });

      test('formats a list of values as text', () => {
        const f = getTestFormat();

        expect(f.convert(['one', 'two', 'three'], 'text')).toBe('["one","two","three"]');
      });
    });

    describe('default reactConvert array support', () => {
      test('returns empty string for an empty array', () => {
        const f = getTestFormat(undefined, (v) => String(v));
        expect(f.reactConvert([])).toBe('');
      });

      test('returns the single element without brackets for a one-element array', () => {
        const f = getTestFormat(undefined, (v) => String(v));
        expect(f.reactConvert(['hello'])).toBe('hello');
      });

      test('wraps multi-element arrays with styled brackets and comma separators', () => {
        const f = getTestFormat(undefined, (v) => String(v));
        expectReactElementAsArray(f.reactConvert([1, 2, 3]), ['1', '2', '3']);
      });

      test('uses newline separator and indentation when values contain newlines', () => {
        const f = getTestFormat(undefined, (v) => String(v));
        expect(renderReact(f.reactConvert(['{\n  "x": 1\n}', '{\n  "y": 2\n}']))).toBe(
          '<span class="ffArray__highlight">[</span>\n' +
            '  {\n    "x": 1\n  }' +
            '<span class="ffArray__highlight">,</span>\n' +
            '  {\n    "y": 2\n  }\n' +
            '<span class="ffArray__highlight">]</span>'
        );
      });

      test('HTML-escapes special characters inside array elements', () => {
        const f = getTestFormat(undefined, (v) => String(v));
        expectReactElementAsArray(f.reactConvert(['<a>', '<b>']), ['&lt;a&gt;', '&lt;b&gt;']);
      });
    });

    describe('default reactConvert highlight support', () => {
      const makeOptions = (fieldName: string, highlights: string[]): ReactContextTypeOptions => ({
        field: { name: fieldName },
        hit: { highlight: { [fieldName]: highlights } },
      });

      test('wraps matched text in <mark> via reactConvert when highlights are present', () => {
        const f = getTestFormat(undefined, constant('lorem ipsum dolor'));
        const result = renderReact(
          f.reactConvert(
            'lorem ipsum dolor',
            makeOptions('myField', [`lorem ${hl('ipsum')} dolor`])
          )
        );
        expect(result).toBe('lorem <mark class="ffSearch__highlight">ipsum</mark> dolor');
      });

      test('returns plain text from reactConvert when no highlights are present', () => {
        const f = getTestFormat(undefined, constant('lorem ipsum'));
        expect(f.reactConvert('lorem ipsum', { field: { name: 'myField' }, hit: {} })).toBe(
          'lorem ipsum'
        );
      });

      test('returns plain text from reactConvert when highlight is for a different field', () => {
        const f = getTestFormat(undefined, constant('lorem ipsum'));
        expect(
          f.reactConvert('lorem ipsum', {
            field: { name: 'myField' },
            hit: { highlight: { otherField: [`lorem ${hl('ipsum')}`] } },
          })
        ).toBe('lorem ipsum');
      });

      describe('for formatters that override convert() directly (mimics AggsTermsFieldFormat)', () => {
        class ConvertOverrideFormat extends FieldFormat {
          static id = 'convert-override-format';
          static title = 'Convert Override Format';
          convert = (val: unknown, type: 'text') => `formatted:${val}`;
          getConverterFor = (type: 'text') => (val: unknown) => this.convert(val, type);
        }

        test('wraps matched text in <mark> via reactConvert when highlights are present', () => {
          const f = new ConvertOverrideFormat(undefined, jest.fn());
          const result = renderReact(
            f.reactConvert('ipsum', makeOptions('myField', [`${hl('formatted:ipsum')}`]))
          );
          expect(result).toBe('<mark class="ffSearch__highlight">formatted:ipsum</mark>');
        });

        test('returns plain text when no highlights present', () => {
          const f = new ConvertOverrideFormat(undefined, jest.fn());
          expect(f.reactConvert('ipsum', { field: { name: 'myField' }, hit: {} })).toBe(
            'formatted:ipsum'
          );
        });
      });

      test('HTML-escapes special characters in highlighted output', () => {
        const f = getTestFormat(undefined, constant('<em>lorem</em>'));
        const result = renderReact(
          f.reactConvert('<em>lorem</em>', makeOptions('myField', [`${hl('<em>lorem</em>')}`]))
        );
        expect(result).toBe('<mark class="ffSearch__highlight">&lt;em&gt;lorem&lt;/em&gt;</mark>');
        expect(result).not.toContain('<em>');
      });

      test('does not apply highlights when options.field is absent', () => {
        const f = getTestFormat(undefined, constant('lorem ipsum'));
        // Without a field name the highlight lookup key is undefined, so highlights are skipped
        // even if hit.highlight contains data.
        const result = f.reactConvert('lorem ipsum', {
          hit: { highlight: { myField: [`lorem ${hl('ipsum')}`] } },
        });
        expect(result).toBe('lorem ipsum');
      });
    });
  });
});
