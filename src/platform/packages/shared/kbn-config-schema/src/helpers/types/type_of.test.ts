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
import { duration } from 'moment';
import { Stream } from 'stream';

import type { TypeOfOutput, TypeOfInput } from './type_of';
import { ByteSizeValue, schema } from '../../..';
import type { ContextReference } from '../../references';

function expectNever<T extends never>() {}

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
  describe('TypeOfOutput', () => {
    describe('any', () => {
      test('should output any value', () => {
        const testSchema = schema.any();
        type SchemaType = TypeOfOutput<typeof testSchema>;

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
        const testSchema = schema.boolean().default(true);
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
        const testSchema = schema.string().default(types.string);
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
        const testSchema = schema.uri().default(types.uri);
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
        const testSchema = schema.number().default(types.number);
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
        const testSchema = schema.byteSize().default(types.byteSize);
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.byteSize);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output byteSize value with string default', () => {
        const testSchema = schema.byteSize().default('1gb');
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.byteSize);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output byteSize value with number default', () => {
        const testSchema = schema.byteSize().default(types.number);
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
        const testSchema = schema.duration().default(types.duration);
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.duration);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output duration value with string default', () => {
        const testSchema = schema.duration().default('1h');
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.duration);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output duration value with number default', () => {
        const testSchema = schema.duration().default(types.number);
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
      test('should output ip value', () => {
        const testSchema = schema.ip();
        type SchemaType = TypeOfOutput<typeof testSchema>;

        expectType<SchemaType>(types.ip);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should output ip value with default', () => {
        const testSchema = schema.ip().default(types.ip);
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
        const testSchema = schema.nullable(schema.string().default(types.string));
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
          str: schema.string().default(types.string),
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
        const testSchema = schema.maybe(schema.string().default(types.string));
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
        const testSchema = schema.lazy<string>('id');
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
        const testSchema = schema.lazy<string>('id');
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
        const testSchema = schema.boolean().default(true);
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
        const testSchema = schema.string().default(types.string);
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
        const testSchema = schema.uri().default(types.string);
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
        const testSchema = schema.number().default(types.number);
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
        const testSchema = schema.byteSize().default(types.byteSize);
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.byteSize);
        expectType<SchemaType>(undefined);
      });
      test('should input byteSize value with string default', () => {
        const testSchema = schema.byteSize().default('1gb');
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.byteSize);
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(types.string);
      });
      test('should input byteSize value with number default', () => {
        const testSchema = schema.byteSize().default(types.number);
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
        const testSchema = schema.duration().default(types.duration);
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.duration);
        expectType<SchemaType>(undefined);
      });
      test('should input duration value with string default', () => {
        const testSchema = schema.duration().default('1h');
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.duration);
        expectType<SchemaType>(undefined);
        // @ts-expect-error
        expectType<SchemaType>(types.string);
      });
      test('should input duration value with number default', () => {
        const testSchema = schema.duration().default(types.number);
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
        const testSchema = schema.nullable(schema.string().default(types.string));
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
          str: schema.string().default(types.string),
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
      test('should input ip value', () => {
        const testSchema = schema.ip();
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.ip);
        // @ts-expect-error
        expectType<SchemaType>(undefined);
      });
      test('should input ip value with default', () => {
        const testSchema = schema.ip().default(types.ip);
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
        const testSchema = schema.maybe(schema.string().default(types.string));
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
        const testSchema = schema.lazy<string>('id');
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
        const testSchema = schema.lazy<string>('id');
        type SchemaType = TypeOfInput<typeof testSchema>;

        expectType<SchemaType>(types.string);
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
