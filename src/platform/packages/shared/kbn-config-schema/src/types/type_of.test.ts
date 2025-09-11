/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v types.number"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v types.number".
 */

import { expectType } from 'tsd';
import type { Duration } from 'moment';
import { duration } from 'moment';
import { Stream } from 'stream';

import type { TypeOfOutput, TypeOfInput } from './type_of';
import type { Props } from '../..';
import { ByteSizeValue, schema } from '../..';
import type { IpOptions } from './ip_type';
import type { ContextReference } from '../references';
import type { ObjectProps } from './object_type';

function expectNever<T extends never>() {}
// function expectUnknown<T extends unknown>(t: unknown) {}

const types = {
  string: 'some-string',
  number: 123,
  uri: 'some-uri',
  ip: 'some-ip',
  buffer: Buffer.from('test'),
  stream: new Stream(),
  duration: duration(1, 'second'),
  byteSize: new ByteSizeValue(1024),
};

describe('schema types', () => {
  describe('General types', () => {
    describe('string', () => {
      test('should allow only string defaults', () => {
        schema.string({ defaultValue: types.string });
        schema.string({ defaultValue: undefined });
        // @ts-expect-error
        schema.string({ defaultValue: types.number });
        // @ts-expect-error
        schema.string({ defaultValue: false });
        // @ts-expect-error
        schema.string({ defaultValue: null });
      });
    });

    describe('number', () => {
      test('should allow only number defaults', () => {
        schema.number({ defaultValue: types.number });
        schema.string({ defaultValue: undefined });
        // @ts-expect-error
        schema.number({ defaultValue: types.string });
        // @ts-expect-error
        schema.number({ defaultValue: false });
        // @ts-expect-error
        schema.number({ defaultValue: null });
      });
    });

    describe('byteSize', () => {
      test('should allow only byteSize, number and string defaults', () => {
        schema.byteSize({ defaultValue: types.byteSize });
        schema.byteSize({ defaultValue: types.number });
        schema.byteSize({ defaultValue: types.string });
      });
      test('should pass only ByteSizeValue to validate', () => {
        schema.byteSize({
          defaultValue: types.byteSize,
          validate(value) {
            expectType<ByteSizeValue>(value);
          },
        });
        schema.byteSize({
          defaultValue: types.number,
          validate(value) {
            expectType<ByteSizeValue>(value);
          },
        });
        schema.byteSize({
          defaultValue: types.string,
          validate(value) {
            expectType<ByteSizeValue>(value);
          },
        });
      });
    });

    describe('duration', () => {
      test('should allow only duration, number and string defaults', () => {
        schema.duration({ defaultValue: types.duration });
        schema.duration({ defaultValue: types.number });
        schema.duration({ defaultValue: types.string });
      });
      test('should pass only Duration to validate', () => {
        schema.duration({
          defaultValue: types.duration,
          validate(value) {
            expectType<Duration>(value);
          },
        });
        schema.duration({
          defaultValue: types.number,
          validate(value) {
            expectType<Duration>(value);
          },
        });
        schema.duration({
          defaultValue: types.string,
          validate(value) {
            expectType<Duration>(value);
          },
        });
      });
    });

    describe('object', () => {
      test('should enforce properties in object default', () => {
        const simpleProps = {
          str: schema.string(),
          num: schema.number(),
        } satisfies ObjectProps<Props>;

        schema.object(simpleProps, {
          // @ts-expect-error
          defaultValue: {},
        });
        schema.object(simpleProps, {
          defaultValue: {
            str: types.string,
            num: types.number,
          },
        });
      });
      test('should pass property default types to object default', () => {
        const simpleProps = {
          str: schema.string({ defaultValue: types.string }),
          num: schema.number(),
        } satisfies ObjectProps<Props>;

        schema.object(simpleProps, {
          // @ts-expect-error
          defaultValue: {},
        });
        schema.object(simpleProps, {
          defaultValue: {
            num: types.number,
          },
        });
        schema.object(simpleProps, {
          defaultValue: {
            str: types.string,
            num: types.number,
          },
        });
      });
      test('should handle nested schemas with defaults in object default', () => {
        const nestedProps = {
          str: schema.string({ defaultValue: types.string }),
          num: schema.number(),
          obj: schema.object({
            str: schema.string(),
            num: schema.number({ defaultValue: types.number }),
          }),
          objMaybe: schema.object(
            {
              bool: schema.boolean(),
            },
            { defaultValue: { bool: false } }
          ),
        } satisfies ObjectProps<Props>;

        // full
        schema.object(nestedProps, {
          defaultValue: {
            str: types.string,
            num: types.number,
            obj: {
              str: types.string,
              num: types.number,
            },
            objMaybe: {
              bool: true,
            },
          },
        });
        // sparse
        schema.object(nestedProps, {
          defaultValue: {
            num: types.number,
            obj: {
              str: types.string,
            },
          },
        });
        // bad types
        schema.object(nestedProps, {
          defaultValue: {
            // @ts-expect-error
            str: types.number,
            // @ts-expect-error
            num: types.string,
            obj: {
              // @ts-expect-error
              str: types.number,
              // @ts-expect-error
              num: types.string,
            },
            objMaybe: {
              // @ts-expect-error
              bool: types.string,
            },
          },
        });
        schema.object(nestedProps, {
          defaultValue: {
            // @ts-expect-error
            objMaybe: types.string,
          },
        });
        // empty
        schema.object(nestedProps, {
          // @ts-expect-error
          defaultValue: {},
        });
      });
    });
  });

  describe('TypeOfOutput', () => {
    describe('any', () => {
      test('should output any value', () => {
        const testSchema = schema.any();
        type SchemaType = TypeOfOutput<typeof testSchema>;

        // @ts-ignore - fix this...
        expectType<SchemaType>(types.string);
      });
    });

    describe('boolean', () => {
      test('should output boolean value', () => {
        const testSchema = schema.boolean();
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(true);
        expectType<SchemaType>(false);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(null);
        // @ts-expect-error
        expectType<SchemaType>(types.string);
      });
      test('should output boolean value with default', () => {
        const testSchema = schema.boolean({ defaultValue: true });
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(true);
        expectType<SchemaType>(false);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(null);
        // @ts-expect-error
        expectType<SchemaType>(types.string);
      });
    });

    describe('buffer', () => {
      test('should output buffer value', () => {
        const testSchema = schema.buffer();
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.buffer);
      });
    });

    describe('stream', () => {
      test('should input stream value', () => {
        const testSchema = schema.stream();
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.stream);
      });
    });

    describe('string', () => {
      test('should output string value', () => {
        const testSchema = schema.string();
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.string);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output string value with default', () => {
        const testSchema = schema.string({ defaultValue: types.string });
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.string);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
    });

    describe('uri', () => {
      test('should output uri value', () => {
        const testSchema = schema.uri();
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.uri);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output uri value with default', () => {
        const testSchema = schema.uri({ defaultValue: types.uri });
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.uri);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
    });

    describe('number', () => {
      test('should output number value', () => {
        const testSchema = schema.number();
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.number);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output number value with default', () => {
        const testSchema = schema.number({ defaultValue: types.number });
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.number);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
    });

    describe('byteSize', () => {
      test('should output byteSize value', () => {
        const testSchema = schema.byteSize();
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.byteSize);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output byteSize value with default', () => {
        const testSchema = schema.byteSize({ defaultValue: types.byteSize });
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.byteSize);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output byteSize value with string default', () => {
        const testSchema = schema.byteSize({ defaultValue: types.string });
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.byteSize);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output byteSize value with number default', () => {
        const testSchema = schema.byteSize({ defaultValue: types.number });
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.byteSize);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
    });

    describe('duration', () => {
      test('should output duration value', () => {
        const testSchema = schema.duration();
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.duration);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output duration value with default', () => {
        const testSchema = schema.duration({ defaultValue: types.duration });
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.duration);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output duration value with string default', () => {
        const testSchema = schema.duration({ defaultValue: types.string });
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.duration);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output duration value with number default', () => {
        const testSchema = schema.duration({ defaultValue: types.number });
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.duration);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
    });

    describe('never', () => {
      test('should input never value', () => {
        const testSchema = schema.never();
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectNever<SchemaType>();
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
    });

    describe('ip', () => {
      const baseOptions: IpOptions<string> = { versions: [] };

      test('should output ip value', () => {
        const testSchema = schema.ip();
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.ip);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output ip value with default', () => {
        const testSchema = schema.ip({ ...baseOptions, defaultValue: types.ip });
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.ip);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
    });

    describe('nullable', () => {
      test('should output simple type or null', () => {
        const testSchema = schema.nullable(schema.string());
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(null);
        expectType<SchemaType>(types.string);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(types.number);
      });
      test('should permit but ignore inner default', () => {
        const testSchema = schema.nullable(schema.string({ defaultValue: types.string }));
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(null);
        expectType<SchemaType>(types.string);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(types.number);
      });
    });

    describe('object', () => {
      test('should output object types', () => {
        const testSchema = schema.object({ str: schema.string(), num: schema.number() });
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>({
          str: types.string,
          num: types.number,
        });
        // @ts-expect-error
        expectType<SchemaType>({
          num: types.number,
        });
        // @ts-expect-error
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>({});
      });
      test('should output object types with property defaults', () => {
        const testSchema = schema.object({
          str: schema.string({ defaultValue: types.string }),
          num: schema.number(),
        });
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>({
          str: types.string,
          num: types.number,
        });
        // @ts-expect-error
        expectType<SchemaType>({
          num: types.number,
        });
        // @ts-expect-error
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>({});
      });
      test('should output object types with object default', () => {
        const testSchema = schema.object(
          { str: schema.string(), num: schema.number() },
          {
            defaultValue: {
              str: types.string,
              num: types.number,
            },
          }
        );
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>({
          str: types.string,
          num: types.number,
        });
        // @ts-expect-error
        expectType<SchemaType>({
          num: types.number,
        });
        // @ts-expect-error
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>({});
      });
    });

    describe('maybe', () => {
      test('should output simple type or undefined', () => {
        const testSchema = schema.maybe(schema.string());
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(undefined);
        expectType<SchemaType>(types.string);
        // @ts-expect-error
        expectType<SchemaType>(null);
        // @ts-expect-error
        expectType<SchemaType>(types.number);
      });
      test('should permit but ignore inner default', () => {
        const testSchema = schema.maybe(schema.string({ defaultValue: types.string }));
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(undefined);
        expectType<SchemaType>(types.string);
        // @ts-expect-error
        expectType<SchemaType>(null);
        // @ts-expect-error
        expectType<SchemaType>(types.number);
      });
    });

    describe('lazy', () => {
      test('should output simple pass-through schema types', () => {
        const testSchema = schema.lazy<string, never>('id');
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.string);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(null);
        // @ts-expect-error
        expectType<SchemaType>(types.number);
      });
      test('should output simple pass-through schema types with default', () => {
        const testSchema = schema.lazy<string, string>('id');
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.string);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(null);
        // @ts-expect-error
        expectType<SchemaType>(types.number);
      });
    });
  });

  describe('TypeOfInput', () => {
    describe('any', () => {
      test('should input any value', () => {
        const testSchema = schema.any();
        type SchemaType = TypeOfInput<typeof testSchema>;

        // @ts-ignore - fix this...
        expectType<SchemaType>(types.string);
      });
    });

    describe('boolean', () => {
      test('should input boolean value', () => {
        const testSchema = schema.boolean();
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(true);
        expectType<SchemaType>(false);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(null);
        // @ts-expect-error
        expectType<SchemaType>(types.string);
      });
      test('should input boolean value with default', () => {
        const testSchema = schema.boolean({ defaultValue: true });
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(true);
        expectType<SchemaType>(false);
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(null);
        // @ts-expect-error
        expectType<SchemaType>(types.string);
      });
    });

    describe('buffer', () => {
      test('should input buffer value', () => {
        const testSchema = schema.buffer();
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.buffer);
      });
    });

    describe('stream', () => {
      test('should input stream value', () => {
        const testSchema = schema.stream();
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.stream);
      });
    });

    describe('string', () => {
      test('should input string value', () => {
        const testSchema = schema.string();
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.string);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should input string value with default', () => {
        const testSchema = schema.string({ defaultValue: types.string });
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.string);
        expectType<SchemaType>(undefined);
      });
    });

    describe('uri', () => {
      test('should input string value', () => {
        const testSchema = schema.uri();
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.uri);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should input uri value with default', () => {
        const testSchema = schema.uri({ defaultValue: types.string });
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.uri);
        expectType<SchemaType>(undefined);
      });
    });

    describe('number', () => {
      test('should input string value', () => {
        const testSchema = schema.number();
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.number);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should input number value with default', () => {
        const testSchema = schema.number({ defaultValue: types.number });
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.number);
        expectType<SchemaType>(undefined);
      });
    });

    describe('byteSize', () => {
      test('should input byteSize value', () => {
        const testSchema = schema.byteSize();
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.byteSize);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should input byteSize value with default', () => {
        const testSchema = schema.byteSize({ defaultValue: types.byteSize });
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.byteSize);
        expectType<SchemaType>(undefined);
      });
      test('should input byteSize value with string default', () => {
        const testSchema = schema.byteSize({ defaultValue: types.string });
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.byteSize);
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(types.string);
      });
      test('should input byteSize value with number default', () => {
        const testSchema = schema.byteSize({ defaultValue: types.number });
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.byteSize);
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(types.number);
      });
    });

    describe('duration', () => {
      test('should input duration value', () => {
        const testSchema = schema.duration();
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.duration);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should input duration value with default', () => {
        const testSchema = schema.duration({ defaultValue: types.duration });
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.duration);
        expectType<SchemaType>(undefined);
      });
      test('should input duration value with string default', () => {
        const testSchema = schema.duration({ defaultValue: types.string });
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.duration);
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(types.string);
      });
      test('should input duration value with number default', () => {
        const testSchema = schema.duration({ defaultValue: types.number });
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.duration);
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(types.number);
      });
    });

    describe('never', () => {
      test('should input never value', () => {
        const testSchema = schema.never();
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectNever<SchemaType>();
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
    });

    describe('nullable', () => {
      test('should input simple type, undefined or null', () => {
        const testSchema = schema.nullable(schema.string());
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(null);
        expectType<SchemaType>(types.string);
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(types.number);
      });
      test('should permit but ignore inner default', () => {
        const testSchema = schema.nullable(schema.string({ defaultValue: types.string }));
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(null);
        expectType<SchemaType>(types.string);
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(types.number);
      });
    });

    describe('object', () => {
      test('should input object types', () => {
        const testSchema = schema.object({ str: schema.string(), num: schema.number() });
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>({
          str: types.string,
          num: types.number,
        });
        // @ts-expect-error
        expectType<SchemaType>({
          num: types.number,
        });
        // @ts-expect-error
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>({});
      });
      test('should input object types with property defaults', () => {
        const testSchema = schema.object({
          str: schema.string({ defaultValue: types.string }),
          num: schema.number(),
        });
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>({
          str: types.string,
          num: types.number,
        });
        expectType<SchemaType>({
          num: types.number,
        });
        // @ts-expect-error
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>({});
      });
      test('should input object types with object default', () => {
        const testSchema = schema.object(
          { str: schema.string(), num: schema.number() },
          {
            defaultValue: {
              str: types.string,
              num: types.number,
            },
          }
        );
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>({
          str: types.string,
          num: types.number,
        });
        // @ts-expect-error
        expectType<SchemaType>({
          num: types.number,
        });
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>({});
      });
    });

    describe('ip', () => {
      const baseOptions: IpOptions<string> = { versions: [] };

      test('should input ip value', () => {
        const testSchema = schema.ip();
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.ip);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should input ip value with default', () => {
        const testSchema = schema.ip({ ...baseOptions, defaultValue: types.ip });
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.ip);
        expectType<SchemaType>(undefined);
      });
    });

    describe('maybe', () => {
      test('should input simple type, undefined or null', () => {
        const testSchema = schema.maybe(schema.string());
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(undefined);
        expectType<SchemaType>(types.string);
        // @ts-expect-error
        expectType<SchemaType>(null);
        // @ts-expect-error
        expectType<SchemaType>(types.number);
      });
      test('should permit but ignore inner default', () => {
        const testSchema = schema.maybe(schema.string({ defaultValue: types.string }));
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(undefined);
        expectType<SchemaType>(types.string);
        // @ts-expect-error
        expectType<SchemaType>(null);
        // @ts-expect-error
        expectType<SchemaType>(types.number);
      });
    });

    describe('lazy', () => {
      test('should input simple pass-through schema types', () => {
        const testSchema = schema.lazy<string, never>('id');
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.string);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(null);
        // @ts-expect-error
        expectType<SchemaType>(types.number);
      });
      test('should input simple pass-through schema types with default', () => {
        const testSchema = schema.lazy<string, string>('id');
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.string);
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(null);
        // @ts-expect-error
        expectType<SchemaType>(types.number);
      });
    });
  });

  describe('References', () => {
    describe('contextRef', () => {
      test('should default type to unknown', () => {
        const testRef = schema.contextRef('serverless');

        expectType<ContextReference<unknown>>(testRef);
      });
      test('should pass explicit type', () => {
        const testRef = schema.contextRef<string>('serverless');

        expectType<ContextReference<string>>(testRef);
        // @ts-expect-error
        expectType<ContextReference<number>>(testRef);
      });
    });

    describe('siblingRef', () => {
      test('should default type to unknown', () => {
        const testRef = schema.siblingRef('foo');

        expectType<ContextReference<unknown>>(testRef);
      });
      test('should pass explicit type', () => {
        const testRef = schema.siblingRef<string>('foo');

        expectType<ContextReference<string>>(testRef);
        // @ts-expect-error
        expectType<ContextReference<number>>(testRef);
      });
    });
  });
});
