/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors, math } from '../math';
import { emptyTable, functionWrapper, testTable } from './utils';

describe('math', () => {
  const fn = functionWrapper<unknown>(math);

  it('evaluates math expressions without reference to context', () => {
    expect(fn(null, { expression: '10.5345' })).toBe(10.5345);
    expect(fn(null, { expression: '123 + 456' })).toBe(579);
    expect(fn(null, { expression: '100 - 46' })).toBe(54);
    expect(fn(1, { expression: '100 / 5' })).toBe(20);
    expect(fn('foo', { expression: '100 / 5' })).toBe(20);
    expect(fn(true, { expression: '100 / 5' })).toBe(20);
    expect(fn(testTable, { expression: '100 * 5' })).toBe(500);
    expect(fn(emptyTable, { expression: '100 * 5' })).toBe(500);
  });

  it('evaluates math expressions with reference to the value of the context, must be a number', () => {
    expect(fn(-103, { expression: 'abs(value)' })).toBe(103);
  });

  it('evaluates math expressions with references to columns by id in a datatable', () => {
    expect(fn(testTable, { expression: 'unique(in_stock)' })).toBe(2);
    expect(fn(testTable, { expression: 'sum(quantity)' })).toBe(2508);
    expect(fn(testTable, { expression: 'mean(price)' })).toBe(320);
    expect(fn(testTable, { expression: 'min(price)' })).toBe(67);
    expect(fn(testTable, { expression: 'median(quantity)' })).toBe(256);
    expect(fn(testTable, { expression: 'max(price)' })).toBe(605);
  });

  it('does not use the name for math', () => {
    expect(() => fn(testTable, { expression: 'unique("in_stock label")' })).toThrow(
      'Unknown variable'
    );
    expect(() => fn(testTable, { expression: 'sum("quantity label")' })).toThrow(
      'Unknown variable'
    );
    expect(() => fn(testTable, { expression: 'mean("price label")' })).toThrow('Unknown variable');
    expect(() => fn(testTable, { expression: 'min("price label")' })).toThrow('Unknown variable');
    expect(() => fn(testTable, { expression: 'median("quantity label")' })).toThrow(
      'Unknown variable'
    );
    expect(() => fn(testTable, { expression: 'max("price label")' })).toThrow('Unknown variable');
  });

  describe('args', () => {
    describe('expression', () => {
      it('sets the math expression to be evaluted', () => {
        expect(fn(null, { expression: '10' })).toBe(10);
        expect(fn(23.23, { expression: 'floor(value)' })).toBe(23);
        expect(fn(testTable, { expression: 'count(price)' })).toBe(9);
        expect(fn(testTable, { expression: 'count(name)' })).toBe(9);
      });
    });

    describe('onError', () => {
      it('should return the desired fallback value, for invalid expressions', () => {
        expect(fn(testTable, { expression: 'mean(name)', onError: 'zero' })).toBe(0);
        expect(fn(testTable, { expression: 'mean(name)', onError: 'null' })).toBe(null);
        expect(fn(testTable, { expression: 'mean(name)', onError: 'false' })).toBe(false);
      });
      it('should return the desired fallback value, for division by zero', () => {
        expect(fn(testTable, { expression: '1/0', onError: 'zero' })).toBe(0);
        expect(fn(testTable, { expression: '1/0', onError: 'null' })).toBe(null);
        expect(fn(testTable, { expression: '1/0', onError: 'false' })).toBe(false);
      });
    });
  });

  describe('invalid expressions', () => {
    it('throws when expression evaluates to an array', () => {
      expect(() => fn(testTable, { expression: 'multiply(price, 2)' })).toThrow(
        new RegExp(errors.tooManyResults().message.replace(/[()]/g, '\\$&'))
      );
    });

    it('throws when using an unknown context variable', () => {
      expect(() => fn(testTable, { expression: 'sum(foo)' })).toThrow('Unknown variable: foo');
    });

    it('throws when using non-numeric data', () => {
      expect(() => fn(testTable, { expression: 'mean(name)' })).toThrow(
        new RegExp(errors.executionFailed().message)
      );

      expect(() => fn(testTable, { expression: 'mean(in_stock)' })).toThrow(
        new RegExp(errors.executionFailed().message)
      );
    });

    it('throws when missing expression', () => {
      expect(() => fn(testTable)).toThrow(new RegExp(errors.emptyExpression().message));

      expect(() => fn(testTable, { expession: '' })).toThrow(
        new RegExp(errors.emptyExpression().message)
      );

      expect(() => fn(testTable, { expession: ' ' })).toThrow(
        new RegExp(errors.emptyExpression().message)
      );
    });

    it('throws when passing a context variable from an empty datatable', () => {
      expect(() => fn(emptyTable, { expression: 'mean(foo)' })).toThrow(
        new RegExp(errors.emptyDatatable().message)
      );
    });

    it('should not throw when requesting fallback values for invalid expression', () => {
      expect(() => fn(testTable, { expression: 'mean(name)', onError: 'zero' })).not.toThrow();
      expect(() => fn(testTable, { expression: 'mean(name)', onError: 'false' })).not.toThrow();
      expect(() => fn(testTable, { expression: 'mean(name)', onError: 'null' })).not.toThrow();
    });

    it('should throw when declared in the onError argument', () => {
      expect(() => fn(testTable, { expression: 'mean(name)', onError: 'throw' })).toThrow(
        new RegExp(errors.executionFailed().message)
      );
    });

    it('should throw when dividing by zero', () => {
      expect(() => fn(testTable, { expression: '1/0', onError: 'throw' })).toThrow(
        new RegExp('Cannot divide by 0')
      );
    });
  });
});
