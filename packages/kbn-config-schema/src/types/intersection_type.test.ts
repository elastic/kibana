/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '../..';

describe('schema.allOf', () => {
  it('validates all parts of the intersection', () => {
    const type = schema.allOf([
      schema.object({ foo: schema.string() }),
      schema.object({ bar: schema.string() }),
    ]);

    expect(type.validate({ foo: 'hello', bar: 'dolly' })).toEqual({ foo: 'hello', bar: 'dolly' });
  });

  it('throw error when one part of the intersection is not matched with the correct error message', () => {
    const type = schema.allOf([
      schema.object({ foo: schema.string() }),
      schema.object({ bar: schema.string() }),
    ]);

    expect(() => type.validate({ foo: 'something' })).toThrowErrorMatchingInlineSnapshot(
      `"[bar]: expected value of type [string] but got [undefined]"`
    );
  });

  it('supports default value', () => {
    const type = schema.allOf([
      schema.object({ foo: schema.string() }),
      schema.object({ bar: schema.string({ defaultValue: 'default' }) }),
    ]);

    expect(type.validate({ foo: 'hello' })).toEqual({ foo: 'hello', bar: 'default' });
  });

  it('throw error if multiple schemas define the same key', () => {
    expect(() =>
      schema.allOf([
        schema.object({ foo: schema.string() }),
        schema.object({ foo: schema.literal('bar') }),
      ])
    ).toThrowErrorMatchingInlineSnapshot(`"Duplicate key found in intersection: 'foo'"`);
  });

  it('has the right type inference', () => {
    const resultingSchema = schema.object({
      foo: schema.string(),
      bar: schema.string(),
    });
    type ResultingType = TypeOf<typeof resultingSchema>;

    const type = schema.allOf([
      schema.object({ foo: schema.string() }),
      schema.object({ bar: schema.string() }),
    ]);

    // asserting the type is the expected one
    const output: ResultingType = type.validate({ foo: 'hello', bar: 'dolly' });
    // required to make TS happy
    expect(output).toEqual({ foo: 'hello', bar: 'dolly' });
  });
});
