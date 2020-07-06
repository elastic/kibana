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

import { RouteValidationError, RouteValidator } from './';
import { schema, Type } from '@kbn/config-schema';

describe('Router validator', () => {
  it('should validate and infer the type from a function', () => {
    const validator = RouteValidator.from({
      params: ({ foo }, validationResult) => {
        if (typeof foo === 'string') {
          return validationResult.ok({ foo });
        }
        return validationResult.badRequest('Not a string', ['foo']);
      },
    });
    expect(validator.getParams({ foo: 'bar' })).toStrictEqual({ foo: 'bar' });
    expect(validator.getParams({ foo: 'bar' }).foo.toUpperCase()).toBe('BAR'); // It knows it's a string! :)
    expect(() => validator.getParams({ foo: 1 })).toThrowError('[foo]: Not a string');
    expect(() => validator.getParams({})).toThrowError('[foo]: Not a string');

    expect(() => validator.getParams(undefined)).toThrowError(
      "Cannot destructure property `foo` of 'undefined' or 'null'."
    );
    expect(() => validator.getParams({}, 'myField')).toThrowError('[myField.foo]: Not a string');

    expect(validator.getBody(undefined)).toStrictEqual({});
    expect(validator.getQuery(undefined)).toStrictEqual({});
  });

  it('should validate and infer the type from a function that does not use the resolver', () => {
    const validator = RouteValidator.from({
      params: (data) => {
        if (typeof data.foo === 'string') {
          return { value: { foo: data.foo as string } };
        }
        return { error: new RouteValidationError('Not a string', ['foo']) };
      },
    });
    expect(validator.getParams({ foo: 'bar' })).toStrictEqual({ foo: 'bar' });
    expect(validator.getParams({ foo: 'bar' }).foo.toUpperCase()).toBe('BAR'); // It knows it's a string! :)
    expect(() => validator.getParams({ foo: 1 })).toThrowError('[foo]: Not a string');
    expect(() => validator.getParams({})).toThrowError('[foo]: Not a string');

    expect(() => validator.getParams(undefined)).toThrowError(
      `Cannot read property 'foo' of undefined`
    );
    expect(() => validator.getParams({}, 'myField')).toThrowError('[myField.foo]: Not a string');

    expect(validator.getBody(undefined)).toStrictEqual({});
    expect(validator.getQuery(undefined)).toStrictEqual({});
  });

  it('should validate and infer the type from a config-schema ObjectType', () => {
    const schemaValidation = RouteValidator.from({
      params: schema.object({
        foo: schema.string(),
      }),
    });

    expect(schemaValidation.getParams({ foo: 'bar' })).toStrictEqual({ foo: 'bar' });
    expect(schemaValidation.getParams({ foo: 'bar' }).foo.toUpperCase()).toBe('BAR'); // It knows it's a string! :)
    expect(() => schemaValidation.getParams({ foo: 1 })).toThrowError(
      '[foo]: expected value of type [string] but got [number]'
    );
    expect(() => schemaValidation.getParams({})).toThrowError(
      '[foo]: expected value of type [string] but got [undefined]'
    );
    expect(() => schemaValidation.getParams(undefined)).toThrowError(
      '[foo]: expected value of type [string] but got [undefined]'
    );
    expect(() => schemaValidation.getParams({}, 'myField')).toThrowError(
      '[myField.foo]: expected value of type [string] but got [undefined]'
    );
  });

  it('should validate and infer the type from a config-schema non-ObjectType', () => {
    const schemaValidation = RouteValidator.from({ params: schema.buffer() });

    const foo = Buffer.from('hi!');
    expect(schemaValidation.getParams(foo)).toStrictEqual(foo);
    expect(schemaValidation.getParams(foo).byteLength).toBeGreaterThan(0); // It knows it's a buffer! :)
    expect(() => schemaValidation.getParams({ foo: 1 })).toThrowError(
      'expected value of type [Buffer] but got [Object]'
    );
    expect(() => schemaValidation.getParams({})).toThrowError(
      'expected value of type [Buffer] but got [Object]'
    );
    expect(() => schemaValidation.getParams(undefined)).toThrowError(
      `expected value of type [Buffer] but got [undefined]`
    );
    expect(() => schemaValidation.getParams({}, 'myField')).toThrowError(
      '[myField]: expected value of type [Buffer] but got [Object]'
    );
  });

  it('should catch the errors thrown by the validate function', () => {
    const validator = RouteValidator.from({
      params: (data) => {
        throw new Error('Something went terribly wrong');
      },
    });

    expect(() => validator.getParams({ foo: 1 })).toThrowError('Something went terribly wrong');
    expect(() => validator.getParams({}, 'myField')).toThrowError(
      '[myField]: Something went terribly wrong'
    );
  });

  it('should not accept invalid validation options', () => {
    const wrongValidateSpec = RouteValidator.from({
      params: { validate: <T>(data: T): T => data } as Type<any>,
    });

    expect(() => wrongValidateSpec.getParams({ foo: 1 })).toThrowError(
      'The validation rule provided in the handler is not valid'
    );
  });

  it('should validate and infer type when data is an array', () => {
    expect(
      RouteValidator.from({
        body: schema.arrayOf(schema.string()),
      }).getBody(['foo', 'bar'])
    ).toStrictEqual(['foo', 'bar']);
    expect(
      RouteValidator.from({
        body: schema.arrayOf(schema.number()),
      }).getBody([1, 2, 3])
    ).toStrictEqual([1, 2, 3]);
    expect(
      RouteValidator.from({
        body: schema.arrayOf(schema.object({ foo: schema.string() })),
      }).getBody([{ foo: 'bar' }, { foo: 'dolly' }])
    ).toStrictEqual([{ foo: 'bar' }, { foo: 'dolly' }]);

    expect(() =>
      RouteValidator.from({
        body: schema.arrayOf(schema.number()),
      }).getBody(['foo', 'bar', 'dolly'])
    ).toThrowError('[0]: expected value of type [number] but got [string]');
    expect(() =>
      RouteValidator.from({
        body: schema.arrayOf(schema.number()),
      }).getBody({ foo: 'bar' })
    ).toThrowError('expected value of type [array] but got [Object]');
  });

  it('should validate and infer type when data is a primitive', () => {
    expect(
      RouteValidator.from({
        body: schema.string(),
      }).getBody('foobar')
    ).toStrictEqual('foobar');
    expect(
      RouteValidator.from({
        body: schema.number(),
      }).getBody(42)
    ).toStrictEqual(42);
    expect(
      RouteValidator.from({
        body: schema.boolean(),
      }).getBody(true)
    ).toStrictEqual(true);

    expect(() =>
      RouteValidator.from({
        body: schema.string(),
      }).getBody({ foo: 'bar' })
    ).toThrowError('expected value of type [string] but got [Object]');
    expect(() =>
      RouteValidator.from({
        body: schema.number(),
      }).getBody('foobar')
    ).toThrowError('expected value of type [number] but got [string]');
  });
});
