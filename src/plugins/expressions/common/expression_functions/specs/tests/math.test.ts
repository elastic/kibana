/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { math, MathArguments, MathInput } from '../math';
import { errors } from '../math_fn';
import { emptyTable, functionWrapper, testTable } from './utils';

describe('math', () => {
  const fn = functionWrapper(math);

  it('evaluates math expressions without reference to context', async () => {
    expect(await fn(null as unknown as MathInput, { expression: '10.5345' })).toBe(10.5345);
    expect(await fn(null as unknown as MathInput, { expression: '123 + 456' })).toBe(579);
    expect(await fn(null as unknown as MathInput, { expression: '100 - 46' })).toBe(54);
    expect(await fn(1, { expression: '100 / 5' })).toBe(20);
    expect(await fn('foo' as unknown as MathInput, { expression: '100 / 5' })).toBe(20);
    expect(await fn(true as unknown as MathInput, { expression: '100 / 5' })).toBe(20);
    expect(await fn(testTable, { expression: '100 * 5' })).toBe(500);
    expect(await fn(emptyTable, { expression: '100 * 5' })).toBe(500);
  });

  it('evaluates math expressions with reference to the value of the context, must be a number', async () => {
    expect(await fn(-103, { expression: 'abs(value)' })).toBe(103);
  });

  it('evaluates math expressions with references to columns by id in a datatable', async () => {
    expect(await fn(testTable, { expression: 'unique(in_stock)' })).toBe(2);
    expect(await fn(testTable, { expression: 'sum(quantity)' })).toBe(2508);
    expect(await fn(testTable, { expression: 'mean(price)' })).toBe(320);
    expect(await fn(testTable, { expression: 'min(price)' })).toBe(67);
    expect(await fn(testTable, { expression: 'median(quantity)' })).toBe(256);
    expect(await fn(testTable, { expression: 'max(price)' })).toBe(605);
  });

  it('does not use the name for math', async () => {
    await expect(fn(testTable, { expression: 'unique("in_stock label")' })).rejects.toHaveProperty(
      'message',
      'Unknown variable: in_stock label'
    );

    await expect(fn(testTable, { expression: 'sum("quantity label")' })).rejects.toHaveProperty(
      'message',
      'Unknown variable: quantity label'
    );

    await expect(fn(testTable, { expression: 'mean("price label")' })).rejects.toHaveProperty(
      'message',
      'Unknown variable: price label'
    );
    await expect(fn(testTable, { expression: 'min("price label")' })).rejects.toHaveProperty(
      'message',
      'Unknown variable: price label'
    );

    await expect(fn(testTable, { expression: 'median("quantity label")' })).rejects.toHaveProperty(
      'message',
      'Unknown variable: quantity label'
    );

    await expect(fn(testTable, { expression: 'max("price label")' })).rejects.toHaveProperty(
      'message',
      'Unknown variable: price label'
    );
  });

  describe('args', () => {
    describe('expression', () => {
      it('sets the math expression to be evaluted', async () => {
        expect(await fn(null as unknown as MathInput, { expression: '10' })).toBe(10);
        expect(await fn(23.23, { expression: 'floor(value)' })).toBe(23);
        expect(await fn(testTable, { expression: 'count(price)' })).toBe(9);
        expect(await fn(testTable, { expression: 'count(name)' })).toBe(9);
      });
    });

    describe('onError', () => {
      it('should return the desired fallback value, for invalid expressions', async () => {
        expect(await fn(testTable, { expression: 'mean(name)', onError: 'zero' })).toBe(0);
        expect(await fn(testTable, { expression: 'mean(name)', onError: 'null' })).toBe(null);
        expect(await fn(testTable, { expression: 'mean(name)', onError: 'false' })).toBe(false);
      });
      it('should return the desired fallback value, for division by zero', async () => {
        expect(await fn(testTable, { expression: '1/0', onError: 'zero' })).toBe(0);
        expect(await fn(testTable, { expression: '1/0', onError: 'null' })).toBe(null);
        expect(await fn(testTable, { expression: '1/0', onError: 'false' })).toBe(false);
      });
    });
  });

  describe('invalid expressions', () => {
    it('throws when expression evaluates to an array', async () => {
      await expect(fn(testTable, { expression: 'multiply(price, 2)' })).rejects.toHaveProperty(
        'message',
        errors.tooManyResults().message
      );
    });

    it('throws when using an unknown context variable', async () => {
      await expect(fn(testTable, { expression: 'sum(foo)' })).rejects.toHaveProperty(
        'message',
        'Unknown variable: foo'
      );
    });

    it('throws when using non-numeric data', async () => {
      await expect(fn(testTable, { expression: 'mean(name)' })).rejects.toHaveProperty(
        'message',
        errors.executionFailed().message
      );

      await expect(fn(testTable, { expression: 'mean(in_stock)' })).rejects.toHaveProperty(
        'message',
        errors.executionFailed().message
      );
    });

    it('throws when missing expression', async () => {
      await expect(fn(testTable)).rejects.toHaveProperty(
        'message',
        errors.emptyExpression().message
      );

      await expect(
        fn(testTable, { expession: '' } as unknown as MathArguments)
      ).rejects.toHaveProperty('message', errors.emptyExpression().message);

      await expect(
        fn(testTable, { expession: ' ' } as unknown as MathArguments)
      ).rejects.toHaveProperty('message', errors.emptyExpression().message);
    });

    it('throws when passing a context variable from an empty datatable', async () => {
      await expect(() => fn(emptyTable, { expression: 'mean(foo)' })).rejects.toHaveProperty(
        'message',
        errors.emptyDatatable().message
      );
    });

    it('should not throw when requesting fallback values for invalid expression', async () => {
      await expect(
        fn(testTable, { expression: 'mean(name)', onError: 'zero' })
      ).resolves.toBeDefined();
      await expect(
        fn(testTable, { expression: 'mean(name)', onError: 'false' })
      ).resolves.toBeDefined();
      await expect(
        fn(testTable, { expression: 'mean(name)', onError: 'null' })
      ).resolves.toBeDefined();
    });

    it('should throw when declared in the onError argument', async () => {
      await expect(
        fn(testTable, { expression: 'mean(name)', onError: 'throw' })
      ).rejects.toHaveProperty('message', errors.executionFailed().message);
    });

    it('should throw when dividing by zero', async () => {
      await expect(fn(testTable, { expression: '1/0', onError: 'throw' })).rejects.toHaveProperty(
        'message',
        'Cannot divide by 0'
      );
    });
  });
});
