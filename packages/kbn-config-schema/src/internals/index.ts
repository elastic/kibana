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
import Joi from 'joi';
import {
  AnySchema,
  JoiRoot,
  Reference,
  Rules,
  SchemaLike,
  State,
  ValidationErrorItem,
  ValidationOptions,
} from 'joi';
import { isPlainObject } from 'lodash';
import { isDuration } from 'moment';
import { Stream } from 'stream';
import { ByteSizeValue, ensureByteSizeValue } from '../byte_size_value';
import { ensureDuration } from '../duration';

export { AnySchema, Reference, SchemaLike, ValidationErrorItem };

function isMap<K, V>(o: any): o is Map<K, V> {
  return o instanceof Map;
}

const anyCustomRule: Rules = {
  name: 'custom',
  params: {
    validator: Joi.func()
      .maxArity(1)
      .required(),
  },
  validate(params, value, state, options) {
    let validationResultMessage;
    try {
      validationResultMessage = params.validator(value);
    } catch (e) {
      validationResultMessage = e.message || e;
    }

    if (typeof validationResultMessage === 'string') {
      return this.createError(
        'any.custom',
        { value, message: validationResultMessage },
        state,
        options
      );
    }

    return value;
  },
};

/**
 * @internal
 */
export const internals = Joi.extend([
  {
    name: 'any',

    rules: [anyCustomRule],
  },
  {
    name: 'boolean',

    base: Joi.boolean(),
    coerce(value: any, state: State, options: ValidationOptions) {
      // If value isn't defined, let Joi handle default value if it's defined.
      if (value === undefined) {
        return value;
      }

      // Allow strings 'true' and 'false' to be coerced to booleans (case-insensitive).

      // From Joi docs on `Joi.boolean`:
      // > Generates a schema object that matches a boolean data type. Can also
      // >  be called via bool(). If the validation convert option is on
      // > (enabled by default), a string (either "true" or "false") will be
      // converted to a boolean if specified.
      if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        value = normalized === 'true' ? true : normalized === 'false' ? false : value;
      }

      if (typeof value !== 'boolean') {
        return this.createError('boolean.base', { value }, state, options);
      }

      return value;
    },
    rules: [anyCustomRule],
  },
  {
    name: 'binary',

    base: Joi.binary(),
    coerce(value: any, state: State, options: ValidationOptions) {
      // If value isn't defined, let Joi handle default value if it's defined.
      if (value !== undefined && !(typeof value === 'object' && Buffer.isBuffer(value))) {
        return this.createError('binary.base', { value }, state, options);
      }

      return value;
    },
    rules: [anyCustomRule],
  },
  {
    name: 'stream',

    pre(value: any, state: State, options: ValidationOptions) {
      // If value isn't defined, let Joi handle default value if it's defined.
      if (value instanceof Stream) {
        return value as any;
      }

      return this.createError('stream.base', { value }, state, options);
    },
    rules: [anyCustomRule],
  },
  {
    name: 'string',

    base: Joi.string(),
    rules: [anyCustomRule],
  },
  {
    name: 'bytes',

    coerce(value: any, state: State, options: ValidationOptions) {
      try {
        if (typeof value === 'string') {
          return ByteSizeValue.parse(value);
        }

        if (typeof value === 'number') {
          return new ByteSizeValue(value);
        }
      } catch (e) {
        return this.createError('bytes.parse', { value, message: e.message }, state, options);
      }

      return value;
    },
    pre(value: any, state: State, options: ValidationOptions) {
      // If value isn't defined, let Joi handle default value if it's defined.
      if (value instanceof ByteSizeValue) {
        return value as any;
      }

      return this.createError('bytes.base', { value }, state, options);
    },
    rules: [
      anyCustomRule,
      {
        name: 'min',
        params: {
          limit: Joi.alternatives([Joi.number(), Joi.string()]).required(),
        },
        validate(params, value, state, options) {
          const limit = ensureByteSizeValue(params.limit);
          if (value.isLessThan(limit)) {
            return this.createError('bytes.min', { value, limit }, state, options);
          }

          return value;
        },
      },
      {
        name: 'max',
        params: {
          limit: Joi.alternatives([Joi.number(), Joi.string()]).required(),
        },
        validate(params, value, state, options) {
          const limit = ensureByteSizeValue(params.limit);
          if (value.isGreaterThan(limit)) {
            return this.createError('bytes.max', { value, limit }, state, options);
          }

          return value;
        },
      },
    ],
  },
  {
    name: 'duration',

    coerce(value: any, state: State, options: ValidationOptions) {
      try {
        if (typeof value === 'string' || typeof value === 'number') {
          return ensureDuration(value);
        }
      } catch (e) {
        return this.createError('duration.parse', { value, message: e.message }, state, options);
      }

      return value;
    },
    pre(value: any, state: State, options: ValidationOptions) {
      if (!isDuration(value)) {
        return this.createError('duration.base', { value }, state, options);
      }

      return value;
    },
    rules: [anyCustomRule],
  },
  {
    name: 'number',

    base: Joi.number(),
    coerce(value: any, state: State, options: ValidationOptions) {
      // If value isn't defined, let Joi handle default value if it's defined.
      if (value === undefined) {
        return value;
      }

      // Do we want to allow strings that can be converted, e.g. "2"? (Joi does)
      // (this can for example be nice in http endpoints with query params)
      //
      // From Joi docs on `Joi.number`:
      // > Generates a schema object that matches a number data type (as well as
      // > strings that can be converted to numbers)
      const coercedValue: any = typeof value === 'string' ? Number(value) : value;
      if (typeof coercedValue !== 'number' || isNaN(coercedValue)) {
        return this.createError('number.base', { value }, state, options);
      }

      return value;
    },
    rules: [anyCustomRule],
  },
  {
    name: 'object',

    base: Joi.object(),
    coerce(value: any, state: State, options: ValidationOptions) {
      if (value === undefined || isPlainObject(value)) {
        return value;
      }

      if (options.convert && typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (isPlainObject(parsed)) {
            return parsed;
          }
          return this.createError('object.base', { value: parsed }, state, options);
        } catch (e) {
          return this.createError('object.parse', { value }, state, options);
        }
      }

      return this.createError('object.base', { value }, state, options);
    },
    rules: [anyCustomRule],
  },
  {
    name: 'map',

    coerce(value: any, state: State, options: ValidationOptions) {
      if (value === undefined) {
        return value;
      }
      if (isPlainObject(value)) {
        return new Map(Object.entries(value));
      }
      if (options.convert && typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (isPlainObject(parsed)) {
            return new Map(Object.entries(parsed));
          }
          return this.createError('map.base', { value: parsed }, state, options);
        } catch (e) {
          return this.createError('map.parse', { value }, state, options);
        }
      }

      return value;
    },
    pre(value: any, state: State, options: ValidationOptions) {
      if (!isMap(value)) {
        return this.createError('map.base', { value }, state, options);
      }

      return value as any;
    },
    rules: [
      anyCustomRule,
      {
        name: 'entries',
        params: {
          key: Joi.object().schema(),
          value: Joi.object().schema(),
        },
        validate(params, value, state, options) {
          const result = new Map();
          for (const [entryKey, entryValue] of value) {
            const { value: validatedEntryKey, error: keyError } = Joi.validate(
              entryKey,
              params.key
            );

            if (keyError) {
              return this.createError('map.key', { entryKey, reason: keyError }, state, options);
            }

            const { value: validatedEntryValue, error: valueError } = Joi.validate(
              entryValue,
              params.value
            );

            if (valueError) {
              return this.createError(
                'map.value',
                { entryKey, reason: valueError },
                state,
                options
              );
            }

            result.set(validatedEntryKey, validatedEntryValue);
          }

          return result as any;
        },
      },
    ],
  },
  {
    name: 'record',
    pre(value: any, state: State, options: ValidationOptions) {
      if (value === undefined || isPlainObject(value)) {
        return value;
      }

      if (options.convert && typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (isPlainObject(parsed)) {
            return parsed;
          }
          return this.createError('record.base', { value: parsed }, state, options);
        } catch (e) {
          return this.createError('record.parse', { value }, state, options);
        }
      }

      return this.createError('record.base', { value }, state, options);
    },
    rules: [
      anyCustomRule,
      {
        name: 'entries',
        params: { key: Joi.object().schema(), value: Joi.object().schema() },
        validate(params, value, state, options) {
          const result = {} as Record<string, any>;
          for (const [entryKey, entryValue] of Object.entries(value)) {
            const { value: validatedEntryKey, error: keyError } = Joi.validate(
              entryKey,
              params.key
            );

            if (keyError) {
              return this.createError('record.key', { entryKey, reason: keyError }, state, options);
            }

            const { value: validatedEntryValue, error: valueError } = Joi.validate(
              entryValue,
              params.value
            );

            if (valueError) {
              return this.createError(
                'record.value',
                { entryKey, reason: valueError },
                state,
                options
              );
            }

            result[validatedEntryKey] = validatedEntryValue;
          }

          return result as any;
        },
      },
    ],
  },
  {
    name: 'array',

    base: Joi.array(),
    coerce(value: any, state: State, options: ValidationOptions) {
      if (value === undefined || Array.isArray(value)) {
        return value;
      }

      if (options.convert && typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          return this.createError('array.base', { value: parsed }, state, options);
        } catch (e) {
          return this.createError('array.parse', { value }, state, options);
        }
      }

      return this.createError('array.base', { value }, state, options);
    },
    rules: [anyCustomRule],
  },
]) as JoiRoot;
