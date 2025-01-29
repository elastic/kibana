/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { createEscapeValue } from './escape_value';

describe('escapeValue', function () {
  describe('quoteValues is true', function () {
    let escapeValue: (val: string) => string;
    beforeEach(function () {
      escapeValue = createEscapeValue({
        separator: ',',
        quoteValues: true,
        escapeFormulaValues: false,
      });
    });

    it('should escape value with spaces', function () {
      expect(escapeValue('baz qux')).to.be('"baz qux"');
    });

    it('should escape values with hyphens', function () {
      expect(escapeValue('baz-qux')).to.be('"baz-qux"');
    });

    it('should not escape small integers', function () {
      expect(escapeValue((1).toString())).to.be('1');
    });

    it('should not escape small whole numbers', function () {
      expect(escapeValue((1.0).toString())).to.be('1');
    });

    it('should escape decimal numbers', function () {
      expect(escapeValue((1.1).toString())).to.be('"1.1"');
    });

    it('should not comma-separate large integers', function () {
      expect(escapeValue((1000000).toString())).to.be('1000000');
    });

    it('should treat booleans like strings', function () {
      expect(escapeValue(true.toString())).to.be('true');
    });
  });

  describe('quoteValues is false', function () {
    let escapeValue: (val: string) => string;
    beforeEach(function () {
      escapeValue = createEscapeValue({
        separator: ',',
        quoteValues: false,
        escapeFormulaValues: false,
      });
    });

    it('should return the value unescaped', function () {
      const value = '"foo, bar & baz-qux"';
      expect(escapeValue(value)).to.be(value);
    });
  });

  describe('escapeFormulaValues', () => {
    describe('when true', () => {
      let escapeValue: (val: string) => string;
      beforeEach(function () {
        escapeValue = createEscapeValue({
          separator: ',',
          quoteValues: true,
          escapeFormulaValues: true,
        });
      });

      ['@', '+', '-', '='].forEach((badChar) => {
        it(`should escape ${badChar} injection values`, function () {
          expect(escapeValue(`${badChar}cmd|' /C calc'!A0`)).to.be(
            `"'${badChar}cmd|' /C calc'!A0"`
          );
        });
      });
    });

    describe('when false', () => {
      let escapeValue: (val: string) => string;
      beforeEach(function () {
        escapeValue = createEscapeValue({
          separator: ',',
          quoteValues: true,
          escapeFormulaValues: false,
        });
      });

      ['@', '+', '-', '='].forEach((badChar) => {
        it(`should not escape ${badChar} injection values`, function () {
          expect(escapeValue(`${badChar}cmd|' /C calc'!A0`)).to.be(`"${badChar}cmd|' /C calc'!A0"`);
        });
      });
    });
  });

  describe('csvSeparator', () => {
    it('should escape when text contains the separator char with quotes enabled', () => {
      const escapeValue = createEscapeValue({
        separator: ';',
        quoteValues: true,
        escapeFormulaValues: false,
      });
      expect(escapeValue('a;b')).to.be('"a;b"');
    });

    it('should not escape when text contains the separator char if quotes are disabled', () => {
      const escapeValue = createEscapeValue({
        separator: ';',
        quoteValues: false,
        escapeFormulaValues: false,
      });
      expect(escapeValue('a;b')).to.be('a;b');
    });

    it.each([', ', ' , ', ' ,'])(
      'should handle also delimiters that contains white spaces "%p"',
      (separator) => {
        const escapeValue = createEscapeValue({
          separator,
          quoteValues: true,
          escapeFormulaValues: false,
        });
        const nonStringValue = {
          toString() {
            return `a${separator}b`;
          },
        };
        expect(escapeValue(nonStringValue)).to.be(`"a${separator}b"`);
      }
    );

    it('should handle also non-string values (array)', () => {
      const escapeValue = createEscapeValue({
        separator: ',',
        quoteValues: true,
        escapeFormulaValues: true,
      });
      expect(escapeValue(['a', 'b'])).to.be('"a,b"');
    });

    it('should not quote non-string values, even if escapable, when separator is not in the quoted delimiters list', () => {
      const escapeValue = createEscapeValue({
        separator: ':',
        quoteValues: true,
        escapeFormulaValues: true,
      });
      const nonStringValue = {
        toString() {
          return 'a:b';
        },
      };
      expect(escapeValue(nonStringValue)).to.be('a:b');
    });
  });
});
