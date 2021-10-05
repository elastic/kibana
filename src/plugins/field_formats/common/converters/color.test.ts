/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorFormat } from './color';
import { HTML_CONTEXT_TYPE } from '../content_types';

describe('Color Format', () => {
  describe('field is a number', () => {
    test('should add colors if the value is in range', () => {
      const colorer = new ColorFormat(
        {
          fieldType: 'number',
          colors: [
            {
              range: '100:150',
              text: 'blue',
              background: 'yellow',
            },
          ],
        },
        jest.fn()
      );

      expect(colorer.convert(99, HTML_CONTEXT_TYPE)).toBe('<span>99</span>');
      expect(colorer.convert(100, HTML_CONTEXT_TYPE)).toBe(
        '<span><span style="color:blue;background-color:yellow">100</span></span>'
      );
      expect(colorer.convert(150, HTML_CONTEXT_TYPE)).toBe(
        '<span><span style="color:blue;background-color:yellow">150</span></span>'
      );
      expect(colorer.convert(151, HTML_CONTEXT_TYPE)).toBe('<span>151</span>');
    });

    test('should not convert invalid ranges', () => {
      const colorer = new ColorFormat(
        {
          fieldType: 'number',
          colors: [
            {
              range: '100150',
              text: 'blue',
              background: 'yellow',
            },
          ],
        },
        jest.fn()
      );

      expect(colorer.convert(99, HTML_CONTEXT_TYPE)).toBe('<span>99</span>');
    });
  });

  describe('field is a string', () => {
    test('should add colors if the regex matches', () => {
      const colorer = new ColorFormat(
        {
          fieldType: 'string',
          colors: [
            {
              regex: 'A.*',
              text: 'blue',
              background: 'yellow',
            },
          ],
        },
        jest.fn()
      );
      const converter = colorer.getConverterFor(HTML_CONTEXT_TYPE) as Function;

      expect(converter('B', HTML_CONTEXT_TYPE)).toBe('<span>B</span>');
      expect(converter('AAA', HTML_CONTEXT_TYPE)).toBe(
        '<span><span style="color:blue;background-color:yellow">AAA</span></span>'
      );
      expect(converter('AB', HTML_CONTEXT_TYPE)).toBe(
        '<span><span style="color:blue;background-color:yellow">AB</span></span>'
      );
      expect(converter('a', HTML_CONTEXT_TYPE)).toBe('<span>a</span>');

      expect(converter('B', HTML_CONTEXT_TYPE)).toBe('<span>B</span>');
      expect(converter('AAA', HTML_CONTEXT_TYPE)).toBe(
        '<span><span style="color:blue;background-color:yellow">AAA</span></span>'
      );
      expect(converter('AB', HTML_CONTEXT_TYPE)).toBe(
        '<span><span style="color:blue;background-color:yellow">AB</span></span>'
      );
      expect(converter('AB <', HTML_CONTEXT_TYPE)).toBe(
        '<span><span style="color:blue;background-color:yellow">AB &lt;</span></span>'
      );
      expect(converter('a', HTML_CONTEXT_TYPE)).toBe('<span>a</span>');
    });

    test('returns original value (escaped) when regex is invalid', () => {
      const colorer = new ColorFormat(
        {
          fieldType: 'string',
          colors: [
            {
              regex: 'A.*',
              text: 'blue',
              background: 'yellow',
            },
          ],
        },
        jest.fn()
      );
      const converter = colorer.getConverterFor(HTML_CONTEXT_TYPE) as Function;

      expect(converter('<', HTML_CONTEXT_TYPE)).toBe('<span>&lt;</span>');
    });
  });
});
