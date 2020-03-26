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

import { inflector } from '../inflector';
import expect from '@kbn/expect';

describe('IndexedArray Inflector', function() {
  it('returns a function', function() {
    const getter = inflector();
    expect(getter).to.be.a('function');
  });

  describe('fn', function() {
    it('prepends a prefix', function() {
      const inflect = inflector('my');

      expect(inflect('Family')).to.be('myFamily');
      expect(inflect('family')).to.be('myFamily');
      expect(inflect('fAmIlY')).to.be('myFAmIlY');
    });

    it('adds both a prefix and suffix', function() {
      const inflect = inflector('foo', 'Bar');

      expect(inflect('box')).to.be('fooBoxBar');
      expect(inflect('box.car.MAX')).to.be('fooBoxCarMaxBar');
      expect(inflect('BaZzY')).to.be('fooBaZzYBar');
    });

    it('ignores prefix if it is already at the end of the inflected string', function() {
      const inflect = inflector('foo', 'Bar');
      expect(inflect('fooBox')).to.be('fooBoxBar');
      expect(inflect('FooBox')).to.be('FooBoxBar');
    });

    it('ignores postfix if it is already at the end of the inflected string', function() {
      const inflect = inflector('foo', 'Bar');
      expect(inflect('bar')).to.be('fooBar');
      expect(inflect('showBoxBar')).to.be('fooShowBoxBar');
    });

    it('works with "name"', function() {
      const inflect = inflector('in', 'Order');
      expect(inflect('name')).to.be('inNameOrder');
    });
  });
});
