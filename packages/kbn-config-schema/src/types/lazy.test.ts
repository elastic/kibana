/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Type, schema, lazy } from '../..';

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
      notSelf: lazy<RecursiveType>(id), // this declaration should fail
    },
    { meta: { id } }
  );
}

describe('lazy', () => {
  const id = 'recursive';
  const object: Type<RecursiveType> = schema.object(
    {
      name: schema.string(),
      self: lazy<RecursiveType>(id),
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
});
