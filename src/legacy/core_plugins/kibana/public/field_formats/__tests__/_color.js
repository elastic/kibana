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

import expect from '@kbn/expect';
import { fieldFormats } from 'ui/registry/field_formats';
describe('Color Format', function() {
  const ColorFormat = fieldFormats.getType('color');

  describe('field is a number', () => {
    it('should add colors if the value is in range', function() {
      const colorer = new ColorFormat({
        fieldType: 'number',
        colors: [
          {
            range: '100:150',
            text: 'blue',
            background: 'yellow',
          },
        ],
      });
      expect(colorer.convert(99, 'html')).to.eql('<span ng-non-bindable>99</span>');
      expect(colorer.convert(100, 'html')).to.eql(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">100</span></span>'
      );
      expect(colorer.convert(150, 'html')).to.eql(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">150</span></span>'
      );
      expect(colorer.convert(151, 'html')).to.eql('<span ng-non-bindable>151</span>');
    });

    it('should not convert invalid ranges', function() {
      const colorer = new ColorFormat({
        fieldType: 'number',
        colors: [
          {
            range: '100150',
            text: 'blue',
            background: 'yellow',
          },
        ],
      });
      expect(colorer.convert(99, 'html')).to.eql('<span ng-non-bindable>99</span>');
    });
  });

  describe('field is a string', () => {
    it('should add colors if the regex matches', function() {
      const colorer = new ColorFormat({
        fieldType: 'string',
        colors: [
          {
            regex: 'A.*',
            text: 'blue',
            background: 'yellow',
          },
        ],
      });

      const converter = colorer.getConverterFor('html');
      expect(converter('B', 'html')).to.eql('<span ng-non-bindable>B</span>');
      expect(converter('AAA', 'html')).to.eql(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">AAA</span></span>'
      );
      expect(converter('AB', 'html')).to.eql(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">AB</span></span>'
      );
      expect(converter('a', 'html')).to.eql('<span ng-non-bindable>a</span>');

      expect(converter('B', 'html')).to.eql('<span ng-non-bindable>B</span>');
      expect(converter('AAA', 'html')).to.eql(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">AAA</span></span>'
      );
      expect(converter('AB', 'html')).to.eql(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">AB</span></span>'
      );
      expect(converter('a', 'html')).to.eql('<span ng-non-bindable>a</span>');
    });
  });
});
