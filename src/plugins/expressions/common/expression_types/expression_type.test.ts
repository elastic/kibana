/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionType } from './expression_type';
import { ExpressionTypeDefinition } from './types';
import { ExpressionValueRender } from './specs';

export const boolean: ExpressionTypeDefinition<'boolean', boolean> = {
  name: 'boolean',
  from: {
    null: () => false,
    number: (n) => Boolean(n),
    string: (s) => Boolean(s),
  },
  to: {
    render: (value): ExpressionValueRender<{ text: string }> => {
      const text = `${value}`;
      return {
        type: 'render',
        as: 'text',
        value: { text },
      };
    },
  },
};

export const render: ExpressionTypeDefinition<'render', ExpressionValueRender<unknown>> = {
  name: 'render',
  from: {
    '*': <T>(v: T): ExpressionValueRender<T> => ({
      type: 'render',
      as: 'debug',
      value: v,
    }),
  },
};

const emptyDatatableValue = {
  type: 'datatable',
  columns: [],
  rows: [],
};

describe('ExpressionType', () => {
  test('can create a boolean type', () => {
    new ExpressionType(boolean);
  });

  describe('castsFrom()', () => {
    describe('when "from" definition specifies "*" as one of its from types', () => {
      test('returns true for any value', () => {
        const type = new ExpressionType(render);
        expect(type.castsFrom(123)).toBe(true);
        expect(type.castsFrom('foo')).toBe(true);
        expect(type.castsFrom(true)).toBe(true);
        expect(
          type.castsFrom({
            type: 'datatable',
            columns: [],
            rows: [],
          })
        ).toBe(true);
      });
    });
  });

  describe('castsTo()', () => {
    describe('when "to" definition is not specified', () => {
      test('returns false for any value', () => {
        const type = new ExpressionType(render);
        expect(type.castsTo(123)).toBe(false);
        expect(type.castsTo('foo')).toBe(false);
        expect(type.castsTo(true)).toBe(false);
        expect(type.castsTo(emptyDatatableValue)).toBe(false);
      });
    });
  });

  describe('from()', () => {
    test('can cast from any type specified in definition', () => {
      const type = new ExpressionType(boolean);
      expect(type.from(1, {})).toBe(true);
      expect(type.from(0, {})).toBe(false);
      expect(type.from('foo', {})).toBe(true);
      expect(type.from('', {})).toBe(false);
      expect(type.from(null, {})).toBe(false);

      // undefined is used like null in legacy interpreter
      expect(type.from(undefined, {})).toBe(false);
    });

    test('throws when casting from type that is not supported', async () => {
      const type = new ExpressionType(boolean);
      expect(() => type.from(emptyDatatableValue, {})).toThrowError();
      expect(() => type.from(emptyDatatableValue, {})).toThrowErrorMatchingInlineSnapshot(
        `"Can not cast 'boolean' from datatable"`
      );
    });
  });

  describe('to()', () => {
    test('can cast to type specified in definition', () => {
      const type = new ExpressionType(boolean);

      expect(type.to(true, 'render', {})).toMatchObject({
        as: 'text',
        type: 'render',
        value: {
          text: 'true',
        },
      });
      expect(type.to(false, 'render', {})).toMatchObject({
        as: 'text',
        type: 'render',
        value: {
          text: 'false',
        },
      });
    });

    test('throws when casting to type that is not supported', async () => {
      const type = new ExpressionType(boolean);
      expect(() => type.to(emptyDatatableValue, 'number', {})).toThrowError();
      expect(() => type.to(emptyDatatableValue, 'number', {})).toThrowErrorMatchingInlineSnapshot(
        `"Can not cast object of type 'datatable' using 'boolean'"`
      );
    });
  });
});
