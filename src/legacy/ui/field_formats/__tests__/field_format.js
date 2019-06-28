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

import _ from 'lodash';
import expect from '@kbn/expect';
import { asPrettyString } from '../../../core_plugins/kibana/common/utils/as_pretty_string';
import { FieldFormat } from '../field_format';

describe('FieldFormat class', function () {

  let TestFormat;

  beforeEach(function () {
    TestFormat = class _TestFormat extends FieldFormat {
      static id = 'test-format';
      static title = 'Test Format';
      _convert(val) {
        return asPrettyString(val);
      }
    };
  });

  describe('params', function () {
    it('accepts its params via the constructor', function () {
      const f = new TestFormat({ foo: 'bar' });
      expect(f.param('foo')).to.be('bar');
    });

    it('allows reading a clone of the params', function () {
      const params = { foo: 'bar' };
      const f = new TestFormat(params);
      const output = f.params();
      expect(output).to.eql(params);
      expect(output).to.not.be(params);
    });
  });

  describe('type', function () {
    it('links the constructor class to instances as the `type`', function () {
      const f = new TestFormat();
      expect(f.type).to.be(TestFormat);
    });
  });

  describe('toJSON', function () {
    it('serializes to a version a basic id and param pair', function () {
      const f = new TestFormat({ foo: 'bar' });
      const ser = JSON.parse(JSON.stringify(f));
      expect(ser).to.eql({ id: 'test-format', params: { foo: 'bar' } });
    });

    it('removes param values that match the defaults', function () {
      TestFormat.prototype.getParamDefaults = function () {
        return { foo: 'bar' };
      };

      const f = new TestFormat({ foo: 'bar', baz: 'bar' });
      const ser = JSON.parse(JSON.stringify(f));
      expect(ser.params).to.eql({ baz: 'bar' });
    });

    it('removes the params entirely if they are empty', function () {
      const f = new TestFormat();
      const ser = JSON.parse(JSON.stringify(f));
      expect(ser).to.not.have.property('params');
    });
  });

  describe('converters', function () {
    describe('#getConverterFor', function () {
      it('returns a converter for a specific content type', function () {
        const f = new TestFormat();
        expect(f.getConverterFor('html')()).to.be.a('string');
        expect(f.getConverterFor('text')()).to.be.a('string');
      });
    });

    describe('#_convert, the instance method or methods used to format values', function () {
      it('can be a function, which gets converted to a text and html converter', function () {
        TestFormat.prototype._convert = function () {
          return 'formatted';
        };

        const f = new TestFormat();
        const text = f.getConverterFor('text');
        const html = f.getConverterFor('html');
        expect(text).to.not.be(html);
        expect(text('formatted')).to.be('formatted');
        expect(html('formatted')).to.be('<span ng-non-bindable>formatted</span>');
      });

      it('can be an object, with separate text and html converter', function () {
        TestFormat.prototype._convert = {
          text: _.constant('formatted text'),
          html: _.constant('formatted html'),
        };

        const f = new TestFormat();
        const text = f.getConverterFor('text');
        const html = f.getConverterFor('html');
        expect(text).to.not.be(html);
        expect(text('formatted text')).to.be('formatted text');
        expect(html('formatted html')).to.be('<span ng-non-bindable>formatted html</span>');
      });

      it('does not escape the output of the text converter', function () {
        TestFormat.prototype._convert = _.constant('<script>alert("xxs");</script>');
        const f = new TestFormat();
        expect(f.convert('', 'text')).to.contain('<');
      });

      it('does escape the output of the text converter if used in an html context', function () {
        TestFormat.prototype._convert = _.constant('<script>alert("xxs");</script>');
        const f = new TestFormat();
        expect(_.trimRight(_.trimLeft(f.convert('', 'html'), '<span ng-non-bindable>'), '</span>'))
          .to.not.contain('<');
      });

      it('does not escape the output of an html specific converter', function () {
        TestFormat.prototype._convert = {
          text: _.constant('<img>'),
          html: _.constant('<img>'),
        };

        const f = new TestFormat();
        expect(f.convert('', 'text')).to.be('<img>');
        expect(f.convert('', 'html')).to.be('<span ng-non-bindable><img></span>');
      });
    });

    describe('#convert', function () {
      it('formats a value, defaulting to text content type', function () {
        TestFormat.prototype._convert = {
          text: _.constant('text'),
          html: _.constant('html'),
        };

        const f = new TestFormat();
        expect(f.convert('val')).to.be('text');
      });

      it('formats a value as html, when specified via second param', function () {
        TestFormat.prototype._convert = {
          text: _.constant('text'),
          html: _.constant('html'),
        };

        const f = new TestFormat();
        expect(f.convert('val', 'html')).to.be('<span ng-non-bindable>html</span>');
      });

      it('formats a value as " - " when no value is specified', function () {
        const f = new TestFormat();
        expect(f.convert()).to.be(' - ');
      });

      it('formats a list of values as text', function () {
        const f = new TestFormat();
        expect(f.convert(['one', 'two', 'three'])).to.be('["one","two","three"]');
      });
    });

  });
});
