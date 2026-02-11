/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import {
  getTranslatableValueFromString,
  geti18nIdentifierFromString,
  getStringValue,
  getValueFromJSXAttribute,
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

  describe('getStringValue', () => {
    it('should return the string value from a string Literal node', () => {
      const node = {
        type: AST_NODE_TYPES.Literal,
        value: 'hello world',
      } as TSESTree.StringLiteral;

      expect(getStringValue(node)).toBe('hello world');
    });

    it('should return false for a number Literal node', () => {
      const node = {
        type: AST_NODE_TYPES.Literal,
        value: 42,
      } as TSESTree.NumberLiteral;

      expect(getStringValue(node)).toBe(false);
    });

    it('should return false for a boolean Literal node', () => {
      const node = {
        type: AST_NODE_TYPES.Literal,
        value: true,
      } as TSESTree.BooleanLiteral;

      expect(getStringValue(node)).toBe(false);
    });

    it('should return false for non-Literal nodes', () => {
      const identifierNode = {
        type: AST_NODE_TYPES.Identifier,
        name: 'myVar',
      } as TSESTree.Identifier;

      expect(getStringValue(identifierNode)).toBe(false);

      const callExpressionNode = {
        type: AST_NODE_TYPES.CallExpression,
      } as TSESTree.CallExpression;

      expect(getStringValue(callExpressionNode)).toBe(false);
    });
  });

  describe('getValueFromJSXAttribute', () => {
    it('should return empty string for null value', () => {
      expect(getValueFromJSXAttribute(null)).toBe('');
    });

    it('should extract string from direct string literal (label="foo")', () => {
      const attrValue = {
        type: AST_NODE_TYPES.Literal,
        value: 'hello world',
      } as TSESTree.StringLiteral;

      expect(getValueFromJSXAttribute(attrValue)).toBe('hello world');
    });

    it("should extract string from JSX expression container with string literal (label={'foo'})", () => {
      const attrValue = {
        type: AST_NODE_TYPES.JSXExpressionContainer,
        expression: {
          type: AST_NODE_TYPES.Literal,
          value: 'hello world',
        },
      } as TSESTree.JSXExpressionContainer;

      expect(getValueFromJSXAttribute(attrValue)).toBe('hello world');
    });

    it('should return empty string for JSX expression container with non-string literal', () => {
      const attrValue = {
        type: AST_NODE_TYPES.JSXExpressionContainer,
        expression: {
          type: AST_NODE_TYPES.Literal,
          value: 42,
        },
      } as TSESTree.JSXExpressionContainer;

      expect(getValueFromJSXAttribute(attrValue)).toBe('');
    });

    it('should return empty string for JSX expression container with identifier', () => {
      const attrValue = {
        type: AST_NODE_TYPES.JSXExpressionContainer,
        expression: {
          type: AST_NODE_TYPES.Identifier,
          name: 'myVar',
        },
      } as TSESTree.JSXExpressionContainer;

      expect(getValueFromJSXAttribute(attrValue)).toBe('');
    });

    it('should escape single quotes in the extracted string', () => {
      const attrValue = {
        type: AST_NODE_TYPES.Literal,
        value: "it's working",
      } as TSESTree.StringLiteral;

      expect(getValueFromJSXAttribute(attrValue)).toBe("it\\'s working");
    });

    it('should return empty string for single character strings', () => {
      const attrValue = {
        type: AST_NODE_TYPES.Literal,
        value: 'x',
      } as TSESTree.StringLiteral;

      expect(getValueFromJSXAttribute(attrValue)).toBe('');
    });
  });
});
