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

import { schema } from '..';

test('returns value is string and defined', () => {
  expect(schema.string().validate('test')).toBe('test');
});

test('allows empty strings', () => {
  expect(schema.string().validate('')).toBe('');
});

test('is required by default', () => {
  expect(() => schema.string().validate(undefined)).toThrowErrorMatchingSnapshot();
});

test('includes namespace in failure', () => {
  expect(() =>
    schema.string().validate(undefined, {}, 'foo-namespace')
  ).toThrowErrorMatchingSnapshot();
});

describe('#minLength', () => {
  test('returns value when longer string', () => {
    expect(schema.string({ minLength: 2 }).validate('foo')).toBe('foo');
  });

  test('returns error when shorter string', () => {
    expect(() => schema.string({ minLength: 4 }).validate('foo')).toThrowErrorMatchingSnapshot();
  });

  test('returns error when empty string', () => {
    expect(() => schema.string({ minLength: 2 }).validate('')).toThrowErrorMatchingSnapshot();
  });
});

describe('#maxLength', () => {
  test('returns value when shorter string', () => {
    expect(schema.string({ maxLength: 4 }).validate('foo')).toBe('foo');
  });

  test('returns error when longer string', () => {
    expect(() => schema.string({ maxLength: 2 }).validate('foo')).toThrowErrorMatchingSnapshot();
  });
});

describe('#hostname', () => {
  test('returns value for valid hostname as per RFC1123', () => {
    const hostNameSchema = schema.string({ hostname: true });

    expect(hostNameSchema.validate('www.example.com')).toBe('www.example.com');
    expect(hostNameSchema.validate('3domain.local')).toBe('3domain.local');
    expect(hostNameSchema.validate('hostname')).toBe('hostname');
    expect(hostNameSchema.validate('2387628')).toBe('2387628');
    expect(hostNameSchema.validate('::1')).toBe('::1');
    expect(hostNameSchema.validate('0:0:0:0:0:0:0:1')).toBe('0:0:0:0:0:0:0:1');
    expect(hostNameSchema.validate('xn----ascii-7gg5ei7b1i.xn--90a3a')).toBe(
      'xn----ascii-7gg5ei7b1i.xn--90a3a'
    );

    const hostNameWithMaxAllowedLength = 'a'.repeat(255);
    expect(hostNameSchema.validate(hostNameWithMaxAllowedLength)).toBe(
      hostNameWithMaxAllowedLength
    );
  });

  test('returns error when value is not a valid hostname', () => {
    const hostNameSchema = schema.string({ hostname: true });

    expect(() => hostNameSchema.validate('host:name')).toThrowErrorMatchingSnapshot();
    expect(() => hostNameSchema.validate('localhost:5601')).toThrowErrorMatchingSnapshot();
    expect(() => hostNameSchema.validate('-')).toThrowErrorMatchingSnapshot();
    expect(() => hostNameSchema.validate('0:?:0:0:0:0:0:1')).toThrowErrorMatchingSnapshot();

    const tooLongHostName = 'a'.repeat(256);
    expect(() => hostNameSchema.validate(tooLongHostName)).toThrowErrorMatchingSnapshot();
  });

  test('returns error when empty string', () => {
    expect(() => schema.string({ hostname: true }).validate('')).toThrowErrorMatchingSnapshot();
  });

  test('supports string validation rules', () => {
    expect(() =>
      schema.string({ hostname: true, maxLength: 3 }).validate('www.example.com')
    ).toThrowErrorMatchingSnapshot();
  });
});

describe('#defaultValue', () => {
  test('returns default when string is undefined', () => {
    expect(schema.string({ defaultValue: 'foo' }).validate(undefined)).toBe('foo');
  });

  test('returns value when specified', () => {
    expect(schema.string({ defaultValue: 'foo' }).validate('bar')).toBe('bar');
  });

  test('returns value from context when context reference is specified', () => {
    expect(
      schema.string({ defaultValue: schema.contextRef('some_value') }).validate(undefined, {
        some_value: 'some',
      })
    ).toBe('some');
  });
});

describe('#validate', () => {
  test('is called with input value', () => {
    let calledWith;

    const validator = (val: any) => {
      calledWith = val;
    };

    schema.string({ validate: validator }).validate('test');

    expect(calledWith).toBe('test');
  });

  test('is not called with default value in no input', () => {
    const validate = jest.fn();

    schema.string({ validate, defaultValue: 'foo' }).validate(undefined);

    expect(validate).not.toHaveBeenCalled();
  });

  test('throws when returns string', () => {
    const validate = () => 'validator failure';

    expect(() => schema.string({ validate }).validate('foo')).toThrowErrorMatchingSnapshot();
  });

  test('throw when empty string', () => {
    const validate = () => 'validator failure';

    expect(() => schema.string({ validate }).validate('')).toThrowErrorMatchingSnapshot();
  });
});

test('returns error when not string', () => {
  expect(() => schema.string().validate(123)).toThrowErrorMatchingSnapshot();

  expect(() => schema.string().validate([1, 2, 3])).toThrowErrorMatchingSnapshot();

  expect(() => schema.string().validate(/abc/)).toThrowErrorMatchingSnapshot();
});
