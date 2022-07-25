/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { constant, trimEnd, trimStart, get } from 'lodash';
import { FieldFormat } from './field_format';
import { asPrettyString } from './utils';
import { FieldFormatParams, TextContextTypeOptions } from './types';

const getTestFormat = (
  _params?: FieldFormatParams,
  textConvert = (val: string, options?: TextContextTypeOptions) => asPrettyString(val, options),
  htmlConvert?: (val: string) => string
) =>
  new (class TestFormat extends FieldFormat {
    static id = 'test-format';
    static title = 'Test Format';

    textConvert = textConvert;
    htmlConvert = htmlConvert;
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

      expect(get(f.type, 'id')).toBe('test-format');
      expect(get(f.type, 'title')).toBe('Test Format');
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
      test('returns a converter for a specific content type', () => {
        const f = getTestFormat();
        const htmlConverter = f.getConverterFor('html');
        const textConverter = f.getConverterFor('text');

        expect(htmlConverter && typeof htmlConverter('')).toBe('string');
        expect(textConverter && typeof textConverter('')).toBe('string');
      });
    });

    describe('#_convert, the instance method or methods used to format values', () => {
      test('can be a function, which gets converted to a text and html converter', () => {
        const f = getTestFormat(undefined, () => 'formatted');
        const text = f.getConverterFor('text');
        const html = f.getConverterFor('html');

        expect(text).not.toBe(html);
        expect(text && text('formatted')).toBe('formatted');
        expect(html && html('formatted')).toBe('formatted');
      });

      test('can be an object, with separate text and html converter', () => {
        const f = getTestFormat(undefined, constant('formatted text'), constant('formatted html'));
        const text = f.getConverterFor('text');
        const html = f.getConverterFor('html');

        expect(text).not.toBe(html);
        expect(text && text('formatted text')).toBe('formatted text');
        expect(html && html('formatted html')).toBe('formatted html');
      });

      test('does not escape the output of the text converter', () => {
        const f = getTestFormat(undefined, constant('<script>alert("xxs");</script>'));

        expect(f.convert('', 'text')).toContain('<');
      });

      test('does escape the output of the text converter if used in an html context', () => {
        const f = getTestFormat(undefined, constant('<script>alert("xxs");</script>'));

        const expected = trimEnd(trimStart(f.convert('', 'html'), '<span>'), '</span>');

        expect(expected).not.toContain('<');
      });

      test('does not escape the output of an html specific converter', () => {
        const f = getTestFormat(undefined, constant('<img>'), constant('<img>'));

        expect(f.convert('', 'text')).toBe('<img>');
        expect(f.convert('', 'html')).toBe('<img>');
      });
    });

    describe('#convert', () => {
      test('formats a value, defaulting to text content type', () => {
        const f = getTestFormat(undefined, constant('text'), constant('html'));

        expect(f.convert('val')).toBe('text');
      });

      test('formats a value as html, when specified via second param', () => {
        const f = getTestFormat(undefined, constant('text'), constant('html'));

        expect(f.convert('val', 'html')).toBe('html');
      });

      test('formats a value as " - " when no value is specified', () => {
        const f = getTestFormat();

        expect(f.convert(undefined)).toBe(' - ');
      });

      test('formats a list of values as text', () => {
        const f = getTestFormat();

        expect(f.convert(['one', 'two', 'three'])).toBe('["one","two","three"]');
      });

      test('formats a list of values as html', () => {
        const f = getTestFormat();

        expect(f.convert([123, 456, 789], 'html')).toMatchInlineSnapshot(
          `"<span class=\\"ffArray__highlight\\">[</span>123<span class=\\"ffArray__highlight\\">,</span> 456<span class=\\"ffArray__highlight\\">,</span> 789<span class=\\"ffArray__highlight\\">]</span>"`
        );
      });

      test('formats a list of values containing newlines as html', () => {
        const f = getTestFormat();
        const newlineList = [
          '{\n  "foo": "bar",\n  "fizz": "buzz"\n}',
          '{\n  "bar": "foo",\n  "buzz": "fizz"\n}',
        ];

        expect(f.convert(newlineList, 'html')).toMatchInlineSnapshot(`
          "<span class=\\"ffArray__highlight\\">[</span>
            {
              &quot;foo&quot;: &quot;bar&quot;,
              &quot;fizz&quot;: &quot;buzz&quot;
            }<span class=\\"ffArray__highlight\\">,</span>
            {
              &quot;bar&quot;: &quot;foo&quot;,
              &quot;buzz&quot;: &quot;fizz&quot;
            }
          <span class=\\"ffArray__highlight\\">]</span>"
        `);
      });
    });
  });
});
