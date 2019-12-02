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

import { validate } from './validator';
import { SchemaTypeError, schema } from '@kbn/config-schema';

describe('Router validator', () => {
  it('should validate and infer the type from a function', () => {
    const validateFn = (data: any) => {
      if (typeof data.foo === 'string') {
        return { value: { foo: data.foo as string } };
      }
      return { error: new SchemaTypeError('Not a string', ['foo']) };
    };

    expect(validate(validateFn, { foo: 'bar' })).toStrictEqual({ foo: 'bar' });
    expect(validate(validateFn, { foo: 'bar' }).foo.toUpperCase()).toBe('BAR'); // It knows it's a string! :)
    expect(() => validate(validateFn, { foo: 1 })).toThrowError('[foo]: Not a string');
    expect(() => validate(validateFn, {})).toThrowError('[foo]: Not a string');
    expect(() => validate(validateFn, undefined)).toThrowError(
      `Cannot read property 'foo' of undefined`
    );
    expect(() => validate(validateFn, {}, 'myField')).toThrowError('[myField.foo]: Not a string');
  });

  it('should validate and infer the type from a config-schema ObjectType', () => {
    const validateFn = schema.object({
      foo: schema.string(),
    });

    expect(validate(validateFn, { foo: 'bar' })).toStrictEqual({ foo: 'bar' });
    expect(validate(validateFn, { foo: 'bar' }).foo.toUpperCase()).toBe('BAR'); // It knows it's a string! :)
    expect(() => validate(validateFn, { foo: 1 })).toThrowError(
      '[foo]: expected value of type [string] but got [number]'
    );
    expect(() => validate(validateFn, {})).toThrowError(
      '[foo]: expected value of type [string] but got [undefined]'
    );
    expect(() => validate(validateFn, undefined)).toThrowError(
      '[foo]: expected value of type [string] but got [undefined]'
    );
    expect(() => validate(validateFn, {}, 'myField')).toThrowError(
      '[myField.foo]: expected value of type [string] but got [undefined]'
    );
  });

  it('should validate and infer the type from a config-schema non-ObjectType', () => {
    const validateFn = schema.buffer();

    const foo = new Buffer('hi!');
    expect(validate(validateFn, foo)).toStrictEqual(foo);
    expect(validate(validateFn, foo).byteLength).toBeGreaterThan(0); // It knows it's a buffer! :)
    expect(() => validate(validateFn, { foo: 1 })).toThrowError(
      'expected value of type [Buffer] but got [Object]'
    );
    expect(() => validate(validateFn, {})).toThrowError(
      'expected value of type [Buffer] but got [Object]'
    );
    expect(() => validate(validateFn, undefined)).toThrowError(
      `expected value of type [Buffer] but got [undefined]`
    );
    expect(() => validate(validateFn, {}, 'myField')).toThrowError(
      '[myField]: expected value of type [Buffer] but got [Object]'
    );
  });

  it('should catch the errors thrown by the validate function', () => {
    const validateFn = (data: any) => {
      throw new Error('Something went terribly wrong');
    };

    expect(() => validate(validateFn, { foo: 1 })).toThrowError('Something went terribly wrong');
    expect(() => validate(validateFn, {}, 'myField')).toThrowError(
      '[myField]: Something went terribly wrong'
    );
  });

  it('should not accept invalid validation options', () => {
    const wrongValidateSpec = {
      validate: <T>(data: T): T => data,
    };

    expect(() => validate(wrongValidateSpec as any, { foo: 1 })).toThrowError(
      'The validation rule provided in the handler is not valid'
    );
  });
});
