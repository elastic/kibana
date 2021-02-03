/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  isDeclaringField,
  isConstructorInstance,
  hasDeclaredType,
  isAccessingProperty,
  showStaticSuggestions,
  isDefiningString,
  isDefiningBoolean,
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

  describe('isDefiningBoolean()', () => {
    test('returns true or false depending if an array contains a boolean type and "=" token at a specific index', () => {
      expect(isDefiningBoolean(['boolean', 'myBoolean', '=', 't'])).toEqual(true);
      expect(isDefiningBoolean(['double', 'myBoolean', '=', 't'])).toEqual(false);
      expect(isDefiningBoolean(['boolean', '='])).toEqual(false);
    });
  });

  describe('isDefiningString()', () => {
    test('returns true or false depending if active typing contains a single or double quotation mark', () => {
      expect(isDefiningString(`'mystring'`)).toEqual(true);
      expect(isDefiningString(`"mystring"`)).toEqual(true);
      expect(isDefiningString(`'`)).toEqual(true);
      expect(isDefiningString(`"`)).toEqual(true);
      expect(isDefiningString('mystring')).toEqual(false);
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
