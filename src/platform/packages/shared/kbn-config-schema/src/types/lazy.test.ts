/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Type, schema } from '../..';

interface RecursiveType {
  name: string;
  self: undefined | RecursiveType;
}

// Test our recursive type inference
{
  const id = 'recursive';
  // @ts-expect-error
  const testObject: Type<RecursiveType> = schema.object(
    {
      name: schema.string(),
      notSelf: schema.lazy<RecursiveType>(id), // this declaration should fail
    },
    { meta: { id } }
  );
}

describe('lazy', () => {
  const id = 'recursive';
  const object = schema.object(
    {
      name: schema.string(),
      self: schema.lazy<RecursiveType>(id),
    },
    { meta: { id } }
  );

  it('allows recursive runtime types to be defined', () => {
    const self: RecursiveType = {
      name: 'self1',
      self: {
        name: 'self2',
        self: {
          name: 'self3',
          self: {
            name: 'self4',
            self: undefined,
          },
        },
      },
    };
    const { value, error } = object.getSchema().validate(self);
    expect(error).toBeUndefined();
    expect(value).toEqual(self);
  });

  it('detects invalid recursive types as expected', () => {
    const invalidSelf = {
      name: 'self1',
      self: {
        name: 123,
        self: undefined,
      },
    };

    const { error, value } = object.getSchema().validate(invalidSelf);
    expect(value).toEqual(invalidSelf);
    expect(error?.message).toBe('expected value of type [string] but got [number]');
  });

  it('requires a schema with a given ID to be present in the schema when validating', () => {
    expect(() =>
      schema
        .object({
          lazy: schema.lazy('unknown'),
        })
        .validate({ lazy: {} })
    ).toThrow(/outside of schema boundaries/);
  });

  it('disallows duplicate ids in the same schema', () => {
    const dupId = 'dupId';
    const schema1 = schema.object({ a: schema.string() }, { meta: { id: dupId } });
    const schema2 = schema.object({ b: schema.string() }, { meta: { id: dupId } });

    expect(() =>
      schema.object({
        schema1,
        schema2,
        lazy: schema.lazy(dupId),
      })
    ).toThrow(/Cannot add different schemas with the same id/);
  });
});
