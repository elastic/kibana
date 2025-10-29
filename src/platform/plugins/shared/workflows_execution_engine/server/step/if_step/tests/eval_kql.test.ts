/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { evaluateKql } from '../eval_kql';

describe('evaluateKql', () => {
  it('should throw an error for invalid KQL', () => {
    expect(() => evaluateKql('invalid "kql', {})).toThrowError();
  });

  describe('"is" expressions', () => {
    it('should return false when field refers to object in property', () => {
      const kql = 'user: "John Doe"';
      expect(evaluateKql(kql, { user: { name: 'Jane Doe' } })).toBe(false);
    });

    it('should correctly evaluate a simple "is" KQL expression', () => {
      const kql = 'status: active';
      expect(evaluateKql(kql, { status: 'active' })).toBe(true);
      expect(evaluateKql(kql, { status: 'inactive' })).toBe(false);
    });

    it('should correctly evaluate a simple "is" KQL expression when key access nested field', () => {
      const kql = 'user.info.name: "Joe Doe"';
      expect(evaluateKql(kql, { user: { info: { name: 'Joe Doe' } } })).toBe(true);
      expect(evaluateKql(kql, { user: { info: { name: 'Jane Doe' } } })).toBe(false);
    });

    it('should correctly evaluate a simple "is" KQL expression with boolean', () => {
      const kql = 'isActive: true';
      expect(evaluateKql(kql, { isActive: true })).toBe(true);
      expect(evaluateKql(kql, { isActive: false })).toBe(false);
    });

    it('should correctly evaluate a simple "is" KQL expression with number', () => {
      const kql = 'matchesCount: 2339';
      expect(evaluateKql(kql, { matchesCount: 2339 })).toBe(true);
      expect(evaluateKql(kql, { matchesCount: 0 })).toBe(false);
    });

    describe('range expressions', () => {
      it('should correctly evaluate a simple "range" KQL expression with number', () => {
        const kql = 'matchesCount >= 1000 and matchesCount <= 5000';
        expect(evaluateKql(kql, { matchesCount: 2339 })).toBe(true);
        expect(evaluateKql(kql, { matchesCount: 999 })).toBe(false);
        expect(evaluateKql(kql, { matchesCount: 5001 })).toBe(false);
      });

      it('should correctly evaluate a "less than or equal" KQL expression', () => {
        const kql = 'matchesCount <= 1000';
        expect(evaluateKql(kql, { matchesCount: 1000 })).toBe(true);
        expect(evaluateKql(kql, { matchesCount: 999 })).toBe(true);
        expect(evaluateKql(kql, { matchesCount: 1001 })).toBe(false);
      });

      it('should correctly evaluate a "greater than" KQL expression', () => {
        const kql = 'matchesCount > 1000';
        expect(evaluateKql(kql, { matchesCount: 1001 })).toBe(true);
        expect(evaluateKql(kql, { matchesCount: 1000 })).toBe(false);
        expect(evaluateKql(kql, { matchesCount: 999 })).toBe(false);
      });

      it('should correctly evaluate a "less than" KQL expression', () => {
        const kql = 'matchesCount < 1000';
        expect(evaluateKql(kql, { matchesCount: 999 })).toBe(true);
        expect(evaluateKql(kql, { matchesCount: 1000 })).toBe(false);
        expect(evaluateKql(kql, { matchesCount: 1001 })).toBe(false);
      });

      it('should return false when field refers to object in property', () => {
        const kql = 'user < 90';
        expect(evaluateKql(kql, { user: { name: 'Jane Doe' } })).toBe(false);
      });
    });

    describe('wildcard expressions', () => {
      it('should correctly evaluate when checking if field exists using wildcard', () => {
        const kql = 'matchesCount:*'; // TODO: Figure out how to do "exist" operation in KQL
        expect(evaluateKql(kql, { matchesCount: 2339 })).toBe(true);
        expect(evaluateKql(kql, { nothing: 0 })).toBe(false);
      });

      it('should evaluate term* wildcard correctly', () => {
        const kql = 'user.name: "John*"';
        expect(evaluateKql(kql, { user: { name: 'John Doe' } })).toBe(true);
        expect(evaluateKql(kql, { user: { name: 'Jane Doe' } })).toBe(false);
      });

      it('should match escaped asterisk', () => {
        const kql = 'user.name:"John\\*"';
        expect(evaluateKql(kql, { user: { name: 'John*' } })).toBe(true);
        expect(evaluateKql(kql, { user: { name: 'John Doe' } })).toBe(false);
      });

      it('should evaluate *term wildcard correctly', () => {
        const kql = 'user.name: "*Doe"';
        expect(evaluateKql(kql, { user: { name: 'John Doe' } })).toBe(true);
        expect(evaluateKql(kql, { user: { name: 'John Smith' } })).toBe(false);
      });

      it('should evaluate *term* wildcard correctly', () => {
        const kql = 'txt: "*psu*"';
        expect(evaluateKql(kql, { txt: 'Lorem ipsum dolor' })).toBe(true);
        expect(evaluateKql(kql, { txt: 'Lorem ipsm dolor' })).toBe(false);
      });

      it('should evaluate a?c wildcard correctly', () => {
        const kql = 'user.name: "J??n Doe"';
        expect(evaluateKql(kql, { user: { name: 'John Doe' } })).toBe(true);
        expect(evaluateKql(kql, { user: { name: 'Jane Doe' } })).toBe(false);
      });

      it('should evaluate complex wildcard correctly', () => {
        const kql = 'user.name: "J??n D*"';
        expect(evaluateKql(kql, { user: { name: 'John Doe' } })).toBe(true);
        expect(evaluateKql(kql, { user: { name: 'Jane Doe' } })).toBe(false);
      });
    });
  });

  describe('logical expressions', () => {
    it('should evaluate AND expressions correctly', () => {
      const kql = 'status: active and isActive: true';
      expect(evaluateKql(kql, { status: 'active', isActive: true })).toBe(true);
      expect(evaluateKql(kql, { status: 'inactive', isActive: true })).toBe(false);
    });

    it('should evaluate OR expressions correctly', () => {
      const kql = 'status: active or status: inactive';
      expect(evaluateKql(kql, { status: 'inactive' })).toBe(true);
      expect(evaluateKql(kql, { status: 'pending' })).toBe(false);
    });

    it('should evaluate NOT expressions correctly', () => {
      const kql = 'not status: inactive';
      expect(evaluateKql(kql, { status: 'active' })).toBe(true);
      expect(evaluateKql(kql, { status: 'inactive' })).toBe(false);
    });

    it('should evaluate complex expressions with AND, OR, and NOT', () => {
      const kql = 'status: active and (isActive: true or isActive: false)';
      expect(evaluateKql(kql, { status: 'active', isActive: true })).toBe(true);
      expect(evaluateKql(kql, { status: 'active', isActive: false })).toBe(true);
      expect(evaluateKql(kql, { status: 'inactive', isActive: true })).toBe(false);
    });
  });
});
