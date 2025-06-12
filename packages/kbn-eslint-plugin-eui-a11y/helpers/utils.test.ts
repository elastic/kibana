/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lowerCaseFirstChar, upperCaseFirstChar, sanitizeEuiElementName } from './utils';

describe('Utils', () => {
  describe('lowerCaseFirstLetter', () => {
    it('should lowercase the first letter', () => {
      expect(lowerCaseFirstChar('Hello')).toBe('hello');
      expect(lowerCaseFirstChar('GreatSuccessYes')).toBe('greatSuccessYes');
      expect(lowerCaseFirstChar('How is it going?')).toBe('how is it going?');
    });

    it('should lowercase all letters if the passed string is in ALL CAPS', () => {
      expect(lowerCaseFirstChar('HELLO')).toBe('hello');
      expect(lowerCaseFirstChar('GREATSUCCESSYES')).toBe('greatsuccessyes');
    });
  });

  describe('upperCaseFirstLetter', () => {
    it('should uppercase the first letter', () => {
      expect(upperCaseFirstChar('hello')).toBe('Hello');
      expect(upperCaseFirstChar('greatSuccessYes')).toBe('GreatSuccessYes');
      expect(upperCaseFirstChar('how is it going?')).toBe('How is it going?');
    });
  });

  describe('sanitizeEuiElementName', () => {
    it('should remove Eui, Empty, Icon, WithWidth, Super from the element name', () => {
      expect(sanitizeEuiElementName('EuiButtonEmpty').elementName).toBe('Button');
      expect(sanitizeEuiElementName('EuiButtonIcon').elementName).toBe('Button');
      expect(sanitizeEuiElementName('EuiButtonSuper').elementName).toBe('Button');
      expect(sanitizeEuiElementName('EuiBetaBadge').elementName).toBe('BetaBadge');
    });

    it('should return the element name with spaces', () => {
      expect(sanitizeEuiElementName('EuiButtonEmpty').elementNameWithSpaces).toBe('Button');
      expect(sanitizeEuiElementName('EuiButtonIcon').elementNameWithSpaces).toBe('Button');
      expect(sanitizeEuiElementName('EuiButtonWithWidth').elementNameWithSpaces).toBe('Button');
      expect(sanitizeEuiElementName('EuiButtonSuper').elementNameWithSpaces).toBe('Button');
      expect(sanitizeEuiElementName('EuiBetaBadge').elementNameWithSpaces).toBe('Beta Badge');
    });
  });
});
