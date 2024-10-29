/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getTranslatableValueFromString,
  geti18nIdentifierFromString,
  lowerCaseFirstLetter,
  upperCaseFirstLetter,
} from './utils';

describe('Utils', () => {
  describe('lowerCaseFirstLetter', () => {
    it('should lowercase the first letter', () => {
      expect(lowerCaseFirstLetter('Hello')).toBe('hello');
      expect(lowerCaseFirstLetter('GreatSuccessYes')).toBe('greatSuccessYes');
      expect(lowerCaseFirstLetter('How is it going?')).toBe('how is it going?');
    });

    it('should lowercase all letters if the passed string is in ALL CAPS', () => {
      expect(lowerCaseFirstLetter('HELLO')).toBe('hello');
      expect(lowerCaseFirstLetter('GREATSUCCESSYES')).toBe('greatsuccessyes');
    });
  });

  describe('upperCaseFirstLetter', () => {
    it('should uppercase the first letter', () => {
      expect(upperCaseFirstLetter('hello')).toBe('Hello');
      expect(upperCaseFirstLetter('greatSuccessYes')).toBe('GreatSuccessYes');
      expect(upperCaseFirstLetter('how is it going?')).toBe('How is it going?');
    });
  });

  describe('getTranslatableValueFromString', () => {
    it('should remove all numbers', () => {
      expect(getTranslatableValueFromString('123')).toBe('');
    });

    it('should remove all white spaces from beginning and end', () => {
      expect(getTranslatableValueFromString('  abc  ')).toBe('abc');
      expect(getTranslatableValueFromString('     This is a test    ')).toBe('This is a test');
    });

    it('should leave markdown alone', () => {
      expect(getTranslatableValueFromString('```hello```')).toBe('');
    });

    it('should remove all non alphabet characters unless they are incorporated in a sentence', () => {
      expect(getTranslatableValueFromString('1')).toBe('');
      expect(getTranslatableValueFromString('12')).toBe('');
      expect(getTranslatableValueFromString('123')).toBe('');
      expect(getTranslatableValueFromString('?')).toBe('');
      expect(getTranslatableValueFromString('!')).toBe('');
      expect(getTranslatableValueFromString('!!')).toBe('');
      expect(getTranslatableValueFromString('!!!')).toBe('');
      expect(getTranslatableValueFromString('!!!!')).toBe('');
      expect(getTranslatableValueFromString('@')).toBe('');
      expect(getTranslatableValueFromString('!@#$%^&*()_+{}|')).toBe('');
    });

    it('should leave special characters inside sentences alone', () => {
      expect(getTranslatableValueFromString('Hey, you.')).toBe('Hey, you.');
      expect(getTranslatableValueFromString('Hey, "you".')).toBe('Hey, "you".');
      expect(getTranslatableValueFromString('     Hey, you.   ')).toBe('Hey, you.');
      expect(
        getTranslatableValueFromString(`     Hey,
        
        
      you.   `)
      ).toBe(`Hey,
        
        
      you.`);
      expect(getTranslatableValueFromString('  Hey?  ')).toBe('Hey?');
      expect(getTranslatableValueFromString('Hey?')).toBe('Hey?');
      expect(getTranslatableValueFromString('Hey, this is great! Success.')).toBe(
        'Hey, this is great! Success.'
      );
      expect(getTranslatableValueFromString('   Hey, this is great! Success.   ')).toBe(
        'Hey, this is great! Success.'
      );
    });

    it('should escape single quotes', () => {
      expect(getTranslatableValueFromString("Hey, 'you'.")).toBe("Hey, \\'you\\'.");
    });
  });

  describe('geti18nIdentifierFromString', () => {
    it('should create a camel cased string which strips all non alphanumeric characters', () => {
      expect(geti18nIdentifierFromString('1')).toBe('');
      expect(geti18nIdentifierFromString('12')).toBe('');
      expect(geti18nIdentifierFromString('123')).toBe('');
      expect(geti18nIdentifierFromString('?')).toBe('');
      expect(geti18nIdentifierFromString('!')).toBe('');
      expect(geti18nIdentifierFromString('!!')).toBe('');
      expect(geti18nIdentifierFromString('!!!')).toBe('');
      expect(geti18nIdentifierFromString('!!!!')).toBe('');
      expect(geti18nIdentifierFromString('@')).toBe('');
      expect(geti18nIdentifierFromString('!@#$%^&*()_+{}|')).toBe('');
      expect(geti18nIdentifierFromString('!@#$%^&*()_+{}| 123 456 789')).toBe('');
      expect(geti18nIdentifierFromString('!@#$%^&*()_+{}|123456789')).toBe('');

      expect(geti18nIdentifierFromString('Hey, you.')).toBe('heyYou');
      expect(geti18nIdentifierFromString('Hey, "you".')).toBe('heyYou');
      expect(geti18nIdentifierFromString("Hey, 'you'.")).toBe('heyYou');
      expect(geti18nIdentifierFromString('     Hey, you.   ')).toBe('heyYou');
      expect(geti18nIdentifierFromString('  Hey?  ')).toBe('hey');
      expect(geti18nIdentifierFromString('Hey?')).toBe('hey');
      expect(geti18nIdentifierFromString('Hey, this is great! Success.')).toBe('heyThisIsGreat');
      expect(geti18nIdentifierFromString('1Hey, this is great! Success.')).toBe('heyThisIsGreat');
    });
  });
});
