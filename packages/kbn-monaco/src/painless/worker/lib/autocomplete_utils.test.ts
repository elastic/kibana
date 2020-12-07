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

import {
  isDeclaringField,
  isConstructorInstance,
  hasDeclaredType,
  isAccessingProperty,
  showStaticSuggestions,
} from './autocomplete_utils';

const primitives = ['boolean', 'int', 'char', 'float', 'double'];

describe('Utils', () => {
  describe('isDeclaringField()', () => {
    test('returns true or false depending if a string contains the expected document syntax', () => {
      expect(isDeclaringField(`doc['`)).toEqual(true);
      expect(isDeclaringField(`i <doc['`)).toEqual(true);
      expect(isDeclaringField(`doc['foobar`)).toEqual(false);
      expect(isDeclaringField('randomstring')).toEqual(false);
    });
  });

  describe('isConstructorInstance()', () => {
    test('returns true or false depending if an array contains the "new" keyword at a specific index', () => {
      expect(isConstructorInstance(['int', 'myConstructor', '=', 'new', 'A'])).toEqual(true);
      expect(isConstructorInstance(['new', 'A'])).toEqual(true);
      expect(isConstructorInstance(['int', 'new', '=', 'a'])).toEqual(false);
    });
  });

  describe('hasDeclaredType()', () => {
    test('returns true or false depending if an array contains a primitive type at a specific index', () => {
      expect(hasDeclaredType(['boolean', 'a'], primitives)).toEqual(true);
      expect(hasDeclaredType(['foobar', 'a'], primitives)).toEqual(false);
    });
  });

  describe('isAccessingProperty()', () => {
    test('returns true or false depending if a string contains a "."', () => {
      expect(isAccessingProperty('Math.')).toEqual(true);
      expect(isAccessingProperty('Math.E')).toEqual(true);
      expect(isAccessingProperty('Math.E.foobar')).toEqual(false);
      expect(isAccessingProperty('foobar')).toEqual(false);
      expect(isAccessingProperty('Math.floor(')).toEqual(false);
    });
  });

  describe('showStaticSuggestions()', () => {
    test('returns true or false depending if a type is declared or the string contains a "."', () => {
      expect(showStaticSuggestions('a', ['a'], primitives)).toEqual(true);
      expect(showStaticSuggestions('foobar a', ['foobar', 'a'], primitives)).toEqual(true);
      expect(showStaticSuggestions(`${primitives[0]} a`, [primitives[0], 'a'], primitives)).toEqual(
        false
      );
      expect(showStaticSuggestions('field1.field2.a', ['field1.field2.a'], primitives)).toEqual(
        false
      );
    });
  });
});
