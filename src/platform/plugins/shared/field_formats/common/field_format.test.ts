/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file -- needs TestFormat (generic test double) + ConvertOverrideFormat (tests convertToText/textConvert override path, as used by AggsTermsFieldFormat) */

import React from 'react';
import ReactDOM from 'react-dom/server';
import { constant } from 'lodash';
import { FieldFormat } from './field_format';
import { asPrettyString, getHighlightReact } from './utils';
import { highlightTags } from './utils/highlight/highlight_tags';
import type {
  FieldFormatParams,
  ReactContextTypeOptions,
  RenderConvertFunction,
  TextContextTypeOptions,
} from './types';
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
    describe('#convertToText', () => {
      test('returns a string for empty string input', () => {
        const f = getTestFormat();

        expect(typeof f.convertToText('')).toBe('string');
      });

      test('can use textConvert that returns a constant', () => {
        const f = getTestFormat(undefined, () => 'formatted');

        expect(f.convertToText('formatted')).toBe('formatted');
      });

      test('can be a constant function that always returns the same text', () => {
        const f = getTestFormat(undefined, constant('formatted text'));

        expect(f.convertToText('formatted text')).toBe('formatted text');
      });

      test('does not escape the output of the text converter', () => {
        const f = getTestFormat(undefined, constant('<script>alert("xxs");</script>'));

        expect(f.convertToText('')).toContain('<');
      });

      test('formats a value as text', () => {
        const f = getTestFormat(undefined, constant('text'));

        expect(f.convertToText('val')).toBe('text');
      });

      test('formats a value as NULL_LABEL when no value is specified', () => {
        const f = getTestFormat();

        expect(f.convertToText(undefined)).toBe(NULL_LABEL);
      });

      test('formats a list of values as text', () => {
        const f = getTestFormat();

        expect(f.convertToText(['one', 'two', 'three'])).toBe('["one","two","three"]');
      });
    });

    describe('default convertToReact array support', () => {
      test('returns empty string for an empty array', () => {
        const f = getTestFormat(undefined, (v) => String(v));
        expect(f.convertToReact([])).toBe('');
      });

      test('returns the single element without brackets for a one-element array', () => {
        const f = getTestFormat(undefined, (v) => String(v));
        expect(f.convertToReact(['hello'])).toBe('hello');
      });

      test('wraps multi-element arrays with styled brackets and comma separators', () => {
        const f = getTestFormat(undefined, (v) => String(v));
        expectReactElementAsArray(f.convertToReact([1, 2, 3]), ['1', '2', '3']);
      });

      test('uses newline separator and indentation when values contain newlines', () => {
        const f = getTestFormat(undefined, (v) => String(v));
        expect(renderReact(f.convertToReact(['{\n  "x": 1\n}', '{\n  "y": 2\n}']))).toBe(
          '<span class="ffArray__highlight">[</span>\n' +
            '  {\n    "x": 1\n  }' +
            '<span class="ffArray__highlight">,</span>\n' +
            '  {\n    "y": 2\n  }\n' +
            '<span class="ffArray__highlight">]</span>'
        );
      });

      test('HTML-escapes special characters inside array elements', () => {
        const f = getTestFormat(undefined, (v) => String(v));
        expectReactElementAsArray(f.convertToReact(['<a>', '<b>']), ['&lt;a&gt;', '&lt;b&gt;']);
      });
    });

    describe('default convertToReact highlight support', () => {
      const makeOptions = (fieldName: string, highlights: string[]): ReactContextTypeOptions => ({
        field: { name: fieldName },
        hit: { highlight: { [fieldName]: highlights } },
      });

      test('wraps matched text in <mark> via convertToReact when highlights are present', () => {
        const f = getTestFormat(undefined, constant('lorem ipsum dolor'));
        const result = renderReact(
          f.convertToReact(
            'lorem ipsum dolor',
            makeOptions('myField', [`lorem ${hl('ipsum')} dolor`])
          )
        );
        expect(result).toBe('lorem <mark class="ffSearch__highlight">ipsum</mark> dolor');
      });

      test('returns plain text from convertToReact when no highlights are present', () => {
        const f = getTestFormat(undefined, constant('lorem ipsum'));
        expect(f.convertToReact('lorem ipsum', { field: { name: 'myField' }, hit: {} })).toBe(
          'lorem ipsum'
        );
      });

      test('returns plain text from convertToReact when highlight is for a different field', () => {
        const f = getTestFormat(undefined, constant('lorem ipsum'));
        expect(
          f.convertToReact('lorem ipsum', {
            field: { name: 'myField' },
            hit: { highlight: { otherField: [`lorem ${hl('ipsum')}`] } },
          })
        ).toBe('lorem ipsum');
      });

      describe('for formatters that override convertToText (mimics AggsTermsFieldFormat)', () => {
        class ConvertOverrideFormat extends FieldFormat {
          static id = 'convert-override-format';
          static title = 'Convert Override Format';
          convertToText = (val: unknown) => `formatted:${val}`;
          renderConvert: RenderConvertFunction = (val, options) => {
            const formatted = this.convertToText(val);
            const fieldName = options?.field?.name;
            const highlights = fieldName ? options?.hit?.highlight?.[fieldName] : undefined;
            return highlights && typeof formatted === 'string'
              ? getHighlightReact(formatted, highlights)
              : formatted;
          };
        }

        test('wraps matched text in <mark> via convertToReact when highlights are present', () => {
          const f = new ConvertOverrideFormat(undefined, jest.fn());
          const result = renderReact(
            f.convertToReact('ipsum', makeOptions('myField', [`${hl('formatted:ipsum')}`]))
          );
          expect(result).toBe('<mark class="ffSearch__highlight">formatted:ipsum</mark>');
        });

        test('returns plain text when no highlights present', () => {
          const f = new ConvertOverrideFormat(undefined, jest.fn());
          expect(f.convertToReact('ipsum', { field: { name: 'myField' }, hit: {} })).toBe(
            'formatted:ipsum'
          );
        });
      });

      test('HTML-escapes special characters in highlighted output', () => {
        const f = getTestFormat(undefined, constant('<em>lorem</em>'));
        const result = renderReact(
          f.convertToReact('<em>lorem</em>', makeOptions('myField', [`${hl('<em>lorem</em>')}`]))
        );
        expect(result).toBe('<mark class="ffSearch__highlight">&lt;em&gt;lorem&lt;/em&gt;</mark>');
        expect(result).not.toContain('<em>');
      });

      test('does not apply highlights when options.field is absent', () => {
        const f = getTestFormat(undefined, constant('lorem ipsum'));
        // Without a field name the highlight lookup key is undefined, so highlights are skipped
        // even if hit.highlight contains data.
        const result = f.convertToReact('lorem ipsum', {
          hit: { highlight: { myField: [`lorem ${hl('ipsum')}`] } },
        });
        expect(result).toBe('lorem ipsum');
      });
    });
  });
});
