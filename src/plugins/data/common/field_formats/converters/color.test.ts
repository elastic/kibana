/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

      expect(colorer.convert(99, HTML_CONTEXT_TYPE)).toBe('<span ng-non-bindable>99</span>');
      expect(colorer.convert(100, HTML_CONTEXT_TYPE)).toBe(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">100</span></span>'
      );
      expect(colorer.convert(150, HTML_CONTEXT_TYPE)).toBe(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">150</span></span>'
      );
      expect(colorer.convert(151, HTML_CONTEXT_TYPE)).toBe('<span ng-non-bindable>151</span>');
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

      expect(colorer.convert(99, HTML_CONTEXT_TYPE)).toBe('<span ng-non-bindable>99</span>');
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

      expect(converter('B', HTML_CONTEXT_TYPE)).toBe('<span ng-non-bindable>B</span>');
      expect(converter('AAA', HTML_CONTEXT_TYPE)).toBe(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">AAA</span></span>'
      );
      expect(converter('AB', HTML_CONTEXT_TYPE)).toBe(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">AB</span></span>'
      );
      expect(converter('a', HTML_CONTEXT_TYPE)).toBe('<span ng-non-bindable>a</span>');

      expect(converter('B', HTML_CONTEXT_TYPE)).toBe('<span ng-non-bindable>B</span>');
      expect(converter('AAA', HTML_CONTEXT_TYPE)).toBe(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">AAA</span></span>'
      );
      expect(converter('AB', HTML_CONTEXT_TYPE)).toBe(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">AB</span></span>'
      );
      expect(converter('AB <', HTML_CONTEXT_TYPE)).toBe(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">AB &lt;</span></span>'
      );
      expect(converter('a', HTML_CONTEXT_TYPE)).toBe('<span ng-non-bindable>a</span>');
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

      expect(converter('<', HTML_CONTEXT_TYPE)).toBe('<span ng-non-bindable>&lt;</span>');
    });
  });
});
