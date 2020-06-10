/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { expectType } from 'tsd';
import { schema } from '..';
import { TypeOf } from './object_type';

test('returns value by default', () => {
  const type = schema.object({
    name: schema.string(),
  });
  const value = {
    name: 'test',
  };

  expect(type.validate(value)).toEqual({ name: 'test' });
});

test('returns empty object if undefined', () => {
  const type = schema.object({});
  expect(type.validate(undefined)).toEqual({});
});

test('properly parse the value if input is a string', () => {
  const type = schema.object({
    name: schema.string(),
  });
  const value = `{"name": "test"}`;

  expect(type.validate(value)).toEqual({ name: 'test' });
});

test('fails if string input cannot be parsed', () => {
  const type = schema.object({
    name: schema.string(),
  });
  expect(() => type.validate(`invalidjson`)).toThrowErrorMatchingInlineSnapshot(
    `"could not parse object value from json input"`
  );
});

test('fails with correct type if parsed input is not an object', () => {
  const type = schema.object({
    name: schema.string(),
  });
  expect(() => type.validate('[1,2,3]')).toThrowErrorMatchingInlineSnapshot(
    `"expected a plain object value, but found [Array] instead."`
  );
});

test('fails if missing required value', () => {
  const type = schema.object({
    name: schema.string(),
  });
  const value = {};

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[name]: expected value of type [string] but got [undefined]"`
  );
});

test('returns value if undefined string with default', () => {
  const type = schema.object({
    name: schema.string({ defaultValue: 'test' }),
  });
  const value = {};

  expect(type.validate(value)).toEqual({ name: 'test' });
});

test('fails if key does not exist in schema', () => {
  const type = schema.object({
    foo: schema.string(),
  });
  const value = {
    bar: 'baz',
    foo: 'bar',
  };

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[bar]: definition for this key is missing"`
  );
});

test('defined object within object', () => {
  const type = schema.object({
    foo: schema.object({
      bar: schema.string({ defaultValue: 'hello world' }),
    }),
  });

  expect(type.validate({ foo: {} })).toEqual({
    foo: {
      bar: 'hello world',
    },
  });
});

test('undefined object within object', () => {
  const type = schema.object({
    foo: schema.object({
      bar: schema.string({ defaultValue: 'hello world' }),
    }),
  });

  expect(type.validate(undefined)).toEqual({
    foo: {
      bar: 'hello world',
    },
  });

  expect(type.validate({})).toEqual({
    foo: {
      bar: 'hello world',
    },
  });

  expect(type.validate({ foo: {} })).toEqual({
    foo: {
      bar: 'hello world',
    },
  });
});

test('object within object with key without defaultValue', () => {
  const type = schema.object({
    foo: schema.object({
      bar: schema.string(),
    }),
  });
  const value = { foo: {} };

  expect(() => type.validate(undefined)).toThrowErrorMatchingInlineSnapshot(
    `"[foo.bar]: expected value of type [string] but got [undefined]"`
  );
  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[foo.bar]: expected value of type [string] but got [undefined]"`
  );
});

describe('#validate', () => {
  test('is called after all content is processed', () => {
    const mockValidate = jest.fn();

    const type = schema.object(
      {
        foo: schema.object({
          bar: schema.string({ defaultValue: 'baz' }),
        }),
      },
      {
        validate: mockValidate,
      }
    );

    type.validate({ foo: {} });

    expect(mockValidate).toHaveBeenCalledWith({
      foo: {
        bar: 'baz',
      },
    });
  });
});

test('called with wrong type', () => {
  const type = schema.object({});

  expect(() => type.validate('foo')).toThrowErrorMatchingInlineSnapshot(
    `"could not parse object value from json input"`
  );
  expect(() => type.validate(123)).toThrowErrorMatchingInlineSnapshot(
    `"expected a plain object value, but found [number] instead."`
  );
});

test('handles oneOf', () => {
  const type = schema.object({
    key: schema.oneOf([schema.string()]),
  });

  expect(type.validate({ key: 'foo' })).toEqual({ key: 'foo' });
  expect(() => type.validate({ key: 123 })).toThrowErrorMatchingInlineSnapshot(`
"[key]: types that failed validation:
- [key.0]: expected value of type [string] but got [number]"
`);
});

test('handles references', () => {
  const type = schema.object({
    context: schema.string({
      defaultValue: schema.contextRef('context_value'),
    }),
    key: schema.string(),
    value: schema.string({ defaultValue: schema.siblingRef('key') }),
  });

  expect(type.validate({ key: 'key#1' }, { context_value: 'context#1' })).toEqual({
    context: 'context#1',
    key: 'key#1',
    value: 'key#1',
  });
  expect(type.validate({ key: 'key#1', value: 'value#1' })).toEqual({
    key: 'key#1',
    value: 'value#1',
  });
});

test('handles conditionals', () => {
  const type = schema.object({
    key: schema.string(),
    value: schema.conditional(
      schema.siblingRef('key'),
      'some-key',
      schema.string({ defaultValue: 'some-value' }),
      schema.string({ defaultValue: 'unknown-value' })
    ),
  });

  expect(type.validate({ key: 'some-key' })).toEqual({
    key: 'some-key',
    value: 'some-value',
  });
  expect(type.validate({ key: 'another-key' })).toEqual({
    key: 'another-key',
    value: 'unknown-value',
  });
});

test('includes namespace in failure when wrong top-level type', () => {
  const type = schema.object({
    foo: schema.string(),
  });

  expect(() => type.validate([], {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected a plain object value, but found [Array] instead."`
  );
});

test('includes namespace in failure when wrong value type', () => {
  const type = schema.object({
    foo: schema.string(),
  });
  const value = {
    foo: 123,
  };

  expect(() => type.validate(value, {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace.foo]: expected value of type [string] but got [number]"`
  );
});

test('individual keys can validated', () => {
  const type = schema.object({
    foo: schema.boolean(),
  });

  const value = false;
  expect(() => type.validateKey('foo', value)).not.toThrowError();
  expect(() => type.validateKey('bar', '')).toThrowErrorMatchingInlineSnapshot(
    `"bar is not a valid part of this schema"`
  );
});

test('allow unknown keys when unknowns = `allow`', () => {
  const type = schema.object(
    { foo: schema.string({ defaultValue: 'test' }) },
    { unknowns: 'allow' }
  );

  expect(
    type.validate({
      bar: 'baz',
    })
  ).toEqual({
    foo: 'test',
    bar: 'baz',
  });
});

test('unknowns = `allow` affects only own keys', () => {
  const type = schema.object(
    { foo: schema.object({ bar: schema.string() }) },
    { unknowns: 'allow' }
  );

  expect(() =>
    type.validate({
      foo: {
        bar: 'bar',
        baz: 'baz',
      },
    })
  ).toThrowErrorMatchingInlineSnapshot(`"[foo.baz]: definition for this key is missing"`);
});

test('does not allow unknown keys when unknowns = `forbid`', () => {
  const type = schema.object(
    { foo: schema.string({ defaultValue: 'test' }) },
    { unknowns: 'forbid' }
  );
  expect(() =>
    type.validate({
      bar: 'baz',
    })
  ).toThrowErrorMatchingInlineSnapshot(`"[bar]: definition for this key is missing"`);
});

test('allow and remove unknown keys when unknowns = `ignore`', () => {
  const type = schema.object(
    { foo: schema.string({ defaultValue: 'test' }) },
    { unknowns: 'ignore' }
  );

  expect(
    type.validate({
      bar: 'baz',
    })
  ).toEqual({
    foo: 'test',
  });
});

test('unknowns = `ignore` affects only own keys', () => {
  const type = schema.object(
    { foo: schema.object({ bar: schema.string() }) },
    { unknowns: 'ignore' }
  );

  expect(() =>
    type.validate({
      foo: {
        bar: 'bar',
        baz: 'baz',
      },
    })
  ).toThrowErrorMatchingInlineSnapshot(`"[foo.baz]: definition for this key is missing"`);
});

test('handles optional properties', () => {
  const type = schema.object({
    required: schema.string(),
    optional: schema.maybe(schema.string()),
  });

  type SchemaType = TypeOf<typeof type>;

  expectType<SchemaType>({
    required: 'foo',
  });
  expectType<SchemaType>({
    required: 'hello',
    optional: undefined,
  });
  expectType<SchemaType>({
    required: 'hello',
    optional: 'bar',
  });
});

describe('#extends', () => {
  it('allows to extend an existing schema by adding new properties', () => {
    const origin = schema.object({
      initial: schema.string(),
    });

    const extended = origin.extends({
      added: schema.number(),
    });

    expect(() => {
      extended.validate({ initial: 'foo' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[added]: expected value of type [number] but got [undefined]"`
    );

    expect(() => {
      extended.validate({ initial: 'foo', added: 42 });
    }).not.toThrowError();

    expectType<TypeOf<typeof extended>>({
      added: 12,
      initial: 'foo',
    });
  });

  it('allows to extend an existing schema by removing properties', () => {
    const origin = schema.object({
      string: schema.string(),
      number: schema.number(),
    });

    const extended = origin.extends({ number: undefined });

    expect(() => {
      extended.validate({ string: 'foo', number: 12 });
    }).toThrowErrorMatchingInlineSnapshot(`"[number]: definition for this key is missing"`);

    expect(() => {
      extended.validate({ string: 'foo' });
    }).not.toThrowError();

    expectType<TypeOf<typeof extended>>({
      string: 'foo',
    });
  });

  it('allows to extend an existing schema by overriding an existing properties', () => {
    const origin = schema.object({
      string: schema.string(),
      mutated: schema.number(),
    });

    const extended = origin.extends({
      mutated: schema.string(),
    });

    expect(() => {
      extended.validate({ string: 'foo', mutated: 12 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[mutated]: expected value of type [string] but got [number]"`
    );

    expect(() => {
      extended.validate({ string: 'foo', mutated: 'bar' });
    }).not.toThrowError();

    expectType<TypeOf<typeof extended>>({
      string: 'foo',
      mutated: 'bar',
    });
  });

  it('properly infer the type from optional properties', () => {
    const origin = schema.object({
      original: schema.maybe(schema.string()),
      mutated: schema.maybe(schema.number()),
      removed: schema.maybe(schema.string()),
    });

    const extended = origin.extends({
      removed: undefined,
      mutated: schema.string(),
    });

    expect(() => {
      extended.validate({ original: 'foo' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[mutated]: expected value of type [string] but got [undefined]"`
    );
    expect(() => {
      extended.validate({ original: 'foo' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[mutated]: expected value of type [string] but got [undefined]"`
    );
    expect(() => {
      extended.validate({ original: 'foo', mutated: 'bar' });
    }).not.toThrowError();

    expectType<TypeOf<typeof extended>>({
      original: 'foo',
      mutated: 'bar',
    });
    expectType<TypeOf<typeof extended>>({
      mutated: 'bar',
    });
  });

  it(`allows to override the original schema's options`, () => {
    const origin = schema.object(
      {
        initial: schema.string(),
      },
      { defaultValue: { initial: 'foo' } }
    );

    const extended = origin.extends(
      {
        added: schema.number(),
      },
      { defaultValue: { initial: 'bar', added: 42 } }
    );

    expect(extended.validate(undefined)).toEqual({ initial: 'bar', added: 42 });
  });
});
